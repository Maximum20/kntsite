import type { APIRoute } from 'astro';
import { doctors } from '../../data';
import {
  MAX_TEXT_BODY_BYTES,
  checkInMemoryRateLimit,
  commitNewFilesToGitHub,
  getClientIp,
  getGitHubConfig,
  getServerEnv,
  jsonResponse,
  readJsonBodyWithLimit,
  resolveUniqueSlug,
  sanitizePlainText,
  transliterateToSlug,
  verifyAntiSpamSignals,
  verifySameOrigin,
  verifyTurnstileToken,
} from '../../lib/githubSubmit';

export const prerender = false;

const ALLOWED_HIGHLIGHTS = new Set<string>([
  'Уважний лікар',
  'Зрозуміле пояснення',
  'Сучасне обладнання',
  'Комфортні умови',
  'Чітка організація',
]);

const ACTIVE_STAFF_IDS = new Set<string>(
  doctors.map((d) => d.id || '').filter(Boolean)
);

interface FeedbackSubmitBody {
  type?: unknown;
  authorName?: unknown;
  isAnonymous?: unknown;
  rating?: unknown;
  staffMember?: unknown;
  department?: unknown;
  highlights?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
  website?: unknown;
  formDurationMs?: unknown;
}

function getKyivDateIso(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Kyiv',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback на UTC
  }
  return new Date().toISOString().slice(0, 10);
}

export const POST: APIRoute = async ({ request }) => {
  // 1. ЖОРСТКЕ ПРАВИЛО БЕЗПЕКИ: без TURNSTILE_SECRET_KEY або GitHub-конфіга ендпоінт заблоковано (503)
  const turnstileSecret = getServerEnv('TURNSTILE_SECRET_KEY');
  const ghConfig = getGitHubConfig();

  if (!turnstileSecret || !ghConfig) {
    return jsonResponse(
      {
        ok: false,
        code: 'NOT_CONFIGURED',
        error:
          'Онлайн-відправка відгуків тимчасово вимкнена на сервері. Скористайтеся кнопкою звернення на електронну пошту відділення.',
      },
      503
    );
  }

  // 2. Перевірка Origin / Referer
  const originCheck = verifySameOrigin(request);
  if (!originCheck.ok) {
    return jsonResponse(
      { ok: false, code: 'FORBIDDEN_ORIGIN', error: 'Запит з недозволеного джерела.' },
      403
    );
  }

  // 3. Базовий rate limit на IP
  const clientIp = getClientIp(request);
  const rateCheck = checkInMemoryRateLimit(`feedback:${clientIp}`, 5, 10 * 60 * 1000);
  if (!rateCheck.allowed) {
    return jsonResponse(
      {
        ok: false,
        code: 'RATE_LIMITED',
        error: `Забагато звернень за короткий час. Спробуйте знову через ${rateCheck.retryAfterSec ?? 60} сек.`,
      },
      429
    );
  }

  // 4. Читання JSON із жорстким лімітом 10 КБ
  const bodyResult = await readJsonBodyWithLimit<FeedbackSubmitBody>(
    request,
    MAX_TEXT_BODY_BYTES
  );
  if (!bodyResult.ok) {
    return jsonResponse({ ok: false, error: bodyResult.error }, bodyResult.status);
  }

  const body = bodyResult.data;

  // 5. Honeypot та мінімальний час заповнення (>3 сек)
  const antiSpam = verifyAntiSpamSignals({
    honeypot: body.website,
    formDurationMs: body.formDurationMs,
  });
  if (!antiSpam.ok) {
    return jsonResponse({ ok: false, error: antiSpam.error }, 400);
  }

  // 6. Обовʼязкова серверна перевірка Cloudflare Turnstile ДО будь-яких операцій із GitHub
  const turnstileResult = await verifyTurnstileToken(body.turnstileToken, clientIp);
  if (!turnstileResult.configured) {
    return jsonResponse(
      { ok: false, code: 'NOT_CONFIGURED', error: turnstileResult.error },
      503
    );
  }
  if (!turnstileResult.ok) {
    return jsonResponse(
      { ok: false, code: 'TURNSTILE_FAILED', error: turnstileResult.error },
      403
    );
  }

  // 7. Сувора валідація та санітизація даних звернення
  const type = body.type === 'question' ? 'question' : body.type === 'review' ? 'review' : null;
  if (!type) {
    return jsonResponse({ ok: false, error: 'Некоректний тип звернення.' }, 400);
  }

  const isAnonymous = body.isAnonymous === true;
  let authorName = 'Анонімний пацієнт';
  if (!isAnonymous) {
    const cleanedName = sanitizePlainText(body.authorName, 80);
    if (cleanedName.length < 2) {
      return jsonResponse(
        {
          ok: false,
          error: 'Вкажіть ваше імʼя (мінімум 2 символи) або оберіть «Опублікувати анонімно».',
        },
        400
      );
    }
    authorName = cleanedName;
  }

  let rating: number | null = null;
  if (type === 'review') {
    const parsedRating = Number(body.rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return jsonResponse(
        { ok: false, error: 'Будь ласка, оберіть оцінку від 1 до 5 зірочок.' },
        400
      );
    }
    rating = parsedRating;
  }

  let staffMember: string | null = null;
  if (type === 'review' && typeof body.staffMember === 'string' && body.staffMember.trim()) {
    const cleanedStaff = sanitizePlainText(body.staffMember, 100);
    if (cleanedStaff !== 'general') {
      if (!ACTIVE_STAFF_IDS.has(cleanedStaff)) {
        return jsonResponse(
          { ok: false, error: 'Обраного спеціаліста не знайдено у списку.' },
          400
        );
      }
      staffMember = cleanedStaff;
    }
  }

  const department = sanitizePlainText(body.department, 100);

  let highlights: string[] = [];
  if (type === 'review' && Array.isArray(body.highlights)) {
    highlights = Array.from(
      new Set(
        body.highlights
          .map((item) => sanitizePlainText(item, 60))
          .filter((item) => ALLOWED_HIGHLIGHTS.has(item))
      )
    );
  }

  const message = sanitizePlainText(body.message, 1000, { multiline: true });
  if (message.length < 10) {
    return jsonResponse(
      {
        ok: false,
        error:
          type === 'review'
            ? 'Напишіть, будь ласка, короткий коментар (мінімум 10 символів).'
            : 'Опишіть ваше питання трохи детальніше (мінімум 10 символів).',
      },
      400
    );
  }

  const createdAt = getKyivDateIso();

  // 8. Підбираємо унікальний шлях у src/content/feedback/<slug>.json без перезапису
  const authorSlugPart = isAnonymous
    ? 'anon'
    : transliterateToSlug(authorName, 'patient').slice(0, 24);
  const baseSlug = `${createdAt}-${type}-${authorSlugPart}`;

  const slugResolution = await resolveUniqueSlug(ghConfig, baseSlug, (candidate) => [
    `src/content/feedback/${candidate}.json`,
  ]);

  if (!slugResolution.ok) {
    return jsonResponse(
      { ok: false, error: slugResolution.error },
      slugResolution.status
    );
  }

  const slug = slugResolution.slug;

  // 9. Формуємо Keystatic-сумісний JSON із isPublished: false (обовʼязкова модерація)
  const feedbackRecord: Record<string, unknown> = {
    authorName,
    type,
    ...(rating !== null ? { rating } : {}),
    ...(staffMember ? { staffMember } : {}),
    department,
    highlights,
    message,
    createdAt,
    isPublished: false,
    adminReply: '',
  };

  // 10. Коміт у GitHub із обовʼязковим "[skip ci]"
  const commitResult = await commitNewFilesToGitHub(
    ghConfig,
    [
      {
        path: `src/content/feedback/${slug}.json`,
        content: `${JSON.stringify(feedbackRecord, null, 2)}\n`,
      },
    ],
    `feedback: submit ${type} ${slug} [skip ci]`
  );

  if (!commitResult.ok) {
    return jsonResponse(
      { ok: false, error: commitResult.error || 'Не вдалося зберегти звернення.' },
      commitResult.status || 502
    );
  }

  return jsonResponse(
    {
      ok: true,
      message:
        "Дякуємо! Ваше звернення надіслано на перевірку і з'явиться на сайті після модерації.",
    },
    201
  );
};

export const ALL: APIRoute = async () =>
  jsonResponse({ ok: false, error: 'Метод не підтримується.' }, 405);
