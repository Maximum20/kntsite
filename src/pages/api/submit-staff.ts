import type { APIRoute } from 'astro';
import { staffRoles } from '../../data';
import {
  MAX_STAFF_BODY_BYTES,
  MAX_TEXT_BODY_BYTES,
  checkInMemoryRateLimit,
  commitNewFilesToGitHub,
  decodeAndValidateWebpImage,
  getClientIp,
  getGitHubConfig,
  getServerEnv,
  jsonResponse,
  readJsonBodyWithLimit,
  resolveUniqueSlug,
  sanitizePlainText,
  verifyAntiSpamSignals,
  verifySameOrigin,
  verifySecretConstantTime,
  type CommitFileSpec,
} from '../../lib/githubSubmit';

export const prerender = false;

const ALLOWED_DEPARTMENTS = new Set<string>([
  'Мегавольтна терапія',
  'Гамма-терапія',
  'Брахітерапія',
  'Близький фокус',
  'КТ-розмітка',
  'Реабілітація',
  'Інженерно-фізична група',
]);

const VALID_ROLE_SLUGS = new Set<string>(staffRoles.map((r) => r.slug));

interface StaffSubmitBody {
  accessCode?: unknown;
  fullName?: unknown;
  role?: unknown;
  department?: unknown;
  experience?: unknown;
  bio?: unknown;
  education?: unknown;
  achievements?: unknown;
  specializations?: unknown;
  showBackCard?: unknown;
  photoDataUrl?: unknown;
  website?: unknown;
  formDurationMs?: unknown;
}

export const POST: APIRoute = async ({ request }) => {
  // 1. Перевірка налаштування серверних змінних середовища (без падіння сервера)
  const expectedSecret = getServerEnv('STAFF_FORM_SECRET');
  const ghConfig = getGitHubConfig();

  if (!expectedSecret || !ghConfig) {
    return jsonResponse(
      {
        ok: false,
        code: 'NOT_CONFIGURED',
        error:
          'Серверна відправка анкети ще не налаштована. Зверніться до адміністратора сайту.',
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

  // 3. Базовий rate limit на IP (захист від підбору коду та спам-сплесків)
  const clientIp = getClientIp(request);
  const rateCheck = checkInMemoryRateLimit(`staff:${clientIp}`, 6, 10 * 60 * 1000);
  if (!rateCheck.allowed) {
    return jsonResponse(
      {
        ok: false,
        code: 'RATE_LIMITED',
        error: `Забагато спроб. Повторіть через ${rateCheck.retryAfterSec ?? 60} сек.`,
      },
      429
    );
  }

  // 4. Миттєва constant-time перевірка коду з заголовка ДО читання тіла / декодування фото
  const headerCode = request.headers.get('x-staff-access-code');
  if (headerCode !== null && !verifySecretConstantTime(headerCode, expectedSecret)) {
    return jsonResponse(
      { ok: false, code: 'INVALID_ACCESS_CODE', error: 'Невірний код доступу.' },
      403
    );
  }

  // 5. Читаємо тіло запиту із жорстким лімітом байтів
  const bodyResult = await readJsonBodyWithLimit<StaffSubmitBody>(
    request,
    MAX_STAFF_BODY_BYTES
  );
  if (!bodyResult.ok) {
    return jsonResponse({ ok: false, error: bodyResult.error }, bodyResult.status);
  }

  const body = bodyResult.data;

  // 6. Обовʼязкова constant-time перевірка коду доступу ДО будь-яких дій із фото чи GitHub
  const effectiveCode =
    headerCode !== null
      ? headerCode
      : typeof body.accessCode === 'string'
        ? body.accessCode
        : '';

  if (!verifySecretConstantTime(effectiveCode, expectedSecret)) {
    return jsonResponse(
      { ok: false, code: 'INVALID_ACCESS_CODE', error: 'Невірний код доступу.' },
      403
    );
  }

  // 7. Перевірка honeypot та мінімального часу заповнення (>3 сек)
  const antiSpam = verifyAntiSpamSignals({
    honeypot: body.website,
    formDurationMs: body.formDurationMs,
  });
  if (!antiSpam.ok) {
    return jsonResponse({ ok: false, error: antiSpam.error }, 400);
  }

  // 8. Перевірка розміру текстової частини форми (до 10 КБ)
  const { photoDataUrl, accessCode: _omitCode, ...textOnlyPart } = body;
  const textByteLength = Buffer.byteLength(JSON.stringify(textOnlyPart), 'utf8');
  if (textByteLength > MAX_TEXT_BODY_BYTES) {
    return jsonResponse(
      {
        ok: false,
        error: 'Текстові дані анкети перевищують дозволений ліміт (10 КБ).',
      },
      413
    );
  }

  // 9. Санітизація та сувора валідація полів за схемою Keystatic
  const fullName = sanitizePlainText(body.fullName, 120);
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  if (fullName.length < 4 || nameParts.length < 2) {
    return jsonResponse(
      {
        ok: false,
        error: 'Вкажіть коректне ПІБ (мінімум прізвище та імʼя, наприклад: Іваненко Олена Петрівна).',
      },
      400
    );
  }

  const surname = nameParts[0];
  const name = nameParts[1];

  const role = sanitizePlainText(body.role, 100);
  if (!role || !VALID_ROLE_SLUGS.has(role)) {
    return jsonResponse(
      { ok: false, error: 'Оберіть коректну посаду зі списку.' },
      400
    );
  }

  const department = sanitizePlainText(body.department, 100);
  if (!department || !ALLOWED_DEPARTMENTS.has(department)) {
    return jsonResponse(
      { ok: false, error: 'Оберіть коректне відділення зі списку.' },
      400
    );
  }

  const experience = sanitizePlainText(body.experience, 120);
  const bio = sanitizePlainText(body.bio, 800, { multiline: true });
  const education = sanitizePlainText(body.education, 300, { multiline: true });
  const achievements = sanitizePlainText(body.achievements, 600, { multiline: true });

  const rawShowBackCard = sanitizePlainText(body.showBackCard, 16);
  const showBackCard: 'auto' | 'hide' = rawShowBackCard === 'hide' ? 'hide' : 'auto';

  let rawSpecs: string[] = [];
  if (Array.isArray(body.specializations)) {
    rawSpecs = body.specializations.map((item) => sanitizePlainText(item, 80));
  } else if (typeof body.specializations === 'string') {
    rawSpecs = body.specializations
      .split(/[,;\n]+/)
      .map((item) => sanitizePlainText(item, 80));
  }

  const specializations = Array.from(new Set(rawSpecs.filter(Boolean))).slice(0, 15);

  // 10. Валідація опціонального WebP фото (магічні байти + ліміт <= 1 МБ)
  let photoBuffer: Buffer | null = null;
  if (typeof photoDataUrl === 'string' && photoDataUrl.trim().length > 0) {
    const decoded = decodeAndValidateWebpImage(photoDataUrl);
    if (!decoded.ok) {
      return jsonResponse({ ok: false, error: decoded.error }, 400);
    }
    photoBuffer = decoded.buffer;
  }

  // 11. Підбираємо унікальний slug у GitHub, щоб ніколи не перезаписати існуючі файли
  const slugResolution = await resolveUniqueSlug(ghConfig, surname, (candidateSlug) => {
    const paths = [`src/content/staff/${candidateSlug}.json`];
    if (photoBuffer) {
      paths.push(`public/images/staff/${candidateSlug}.webp`);
    }
    return paths;
  });

  if (!slugResolution.ok) {
    return jsonResponse(
      { ok: false, error: slugResolution.error },
      slugResolution.status
    );
  }

  const slug = slugResolution.slug;
  const jsonPath = `src/content/staff/${slug}.json`;
  const photoPath = `public/images/staff/${slug}.webp`;

  // 12. Формуємо Keystatic-сумісний JSON із isActive: false
  const staffRecord: Record<string, unknown> = {
    surname,
    name,
    fullNamePatronymic: fullName,
    badge: '',
    isHead: false,
    role,
    department,
    isActive: false,
    order: 100,
    showBackCard,
    ...(photoBuffer ? { image: `/images/staff/${slug}.webp` } : {}),
    experience,
    specializations,
    bio,
    education,
    achievements,
    color: 'from-slate-600 to-slate-700',
  };

  const filesToCommit: CommitFileSpec[] = [
    {
      path: jsonPath,
      content: `${JSON.stringify(staffRecord, null, 2)}\n`,
    },
  ];

  if (photoBuffer) {
    filesToCommit.unshift({
      path: photoPath,
      content: photoBuffer,
    });
  }

  // 13. Коміт у GitHub із обовʼязковим "[skip ci]"
  const commitResult = await commitNewFilesToGitHub(
    ghConfig,
    filesToCommit,
    `staff: submit draft ${slug} via /anketa-personalu [skip ci]`
  );

  if (!commitResult.ok) {
    return jsonResponse(
      { ok: false, error: commitResult.error || 'Не вдалося зберегти анкету.' },
      commitResult.status || 502
    );
  }

  return jsonResponse(
    {
      ok: true,
      slug,
      message:
        'Дякуємо! Вашу анкету збережено як чернетку. Після перевірки адміністратором у Keystatic картка зʼявиться на сайті.',
    },
    201
  );
};

export const ALL: APIRoute = async () =>
  jsonResponse({ ok: false, error: 'Метод не підтримується.' }, 405);
