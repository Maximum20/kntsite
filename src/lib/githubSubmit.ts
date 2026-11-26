import crypto from 'node:crypto';

export const MAX_TEXT_BODY_BYTES = 10 * 1024; // 10 КБ для текстових форм
export const MAX_IMAGE_BYTES = 1 * 1024 * 1024; // 1 МБ для стиснутого WebP фото
export const MAX_STAFF_BODY_BYTES = 1_500_000; // ~1.43 МБ (до 1 МБ WebP у base64 + до 10 КБ тексту)
export const MIN_FORM_FILL_MS = 3000; // Мінімум 3 секунди на заповнення форми

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface CommitFileSpec {
  path: string;
  content: Buffer | string;
}

export interface CommitResult {
  ok: boolean;
  commitSha?: string;
  paths?: string[];
  error?: string;
  status?: number;
}

const UA_TRANSLIT_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ye',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'yu',
  я: 'ya',
  ё: 'yo',
  ъ: '',
  ы: 'y',
  э: 'e',
};

/**
 * Безпечно читає змінну середовища в SSR на Vercel (process.env) та локально в Astro dev (import.meta.env).
 */
export function getServerEnv(name: string): string {
  const fromProcess =
    typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
  if (typeof fromProcess === 'string' && fromProcess.trim()) {
    return fromProcess.trim();
  }
  const metaEnv = import.meta.env as Record<string, string | undefined> | undefined;
  const fromMeta = metaEnv ? metaEnv[name] : undefined;
  if (typeof fromMeta === 'string' && fromMeta.trim()) {
    return fromMeta.trim();
  }
  return '';
}

export function getGitHubConfig(): GitHubConfig | null {
  const token = getServerEnv('GITHUB_TOKEN');
  const owner = getServerEnv('GITHUB_OWNER');
  const repo = getServerEnv('GITHUB_REPO');
  const branch = getServerEnv('GITHUB_BRANCH') || 'main';

  if (!token || !owner || !repo) {
    return null;
  }

  // Базова перевірка на допустимі символи owner/repo/branch
  if (
    !/^[A-Za-z0-9_.-]+$/.test(owner) ||
    !/^[A-Za-z0-9_.-]+$/.test(repo) ||
    !/^[A-Za-z0-9_./-]+$/.test(branch)
  ) {
    return null;
  }

  return { token, owner, repo, branch };
}

export function jsonResponse(
  payload: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/**
 * Constant-time порівняння секретів через SHA-256 (захист від timing-атак і витоку довжини).
 */
export function verifySecretConstantTime(
  provided: string,
  expected: string
): boolean {
  const cleanProvided = typeof provided === 'string' ? provided.trim() : '';
  const cleanExpected = typeof expected === 'string' ? expected.trim() : '';
  if (!cleanProvided || !cleanExpected) return false;

  const hashA = crypto.createHash('sha256').update(cleanProvided, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(cleanExpected, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Транслітерація українського тексту в безпечний slug (латиниця, цифри, дефіс).
 */
export function transliterateToSlug(input: string, fallback = 'entry'): string {
  const lowered = String(input || '')
    .toLowerCase()
    .replace(/['ʼ’`"]/g, '');
  let out = '';
  for (const ch of lowered) {
    out += ch in UA_TRANSLIT_MAP ? UA_TRANSLIT_MAP[ch] : ch;
  }
  const slug = out
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return slug || fallback;
}

/**
 * Повна санітизація тексту: прибирає HTML-теги, небезпечні символи, зайві керуючі символи.
 */
export function sanitizePlainText(
  raw: unknown,
  maxLength: number,
  options: { multiline?: boolean } = {}
): string {
  if (typeof raw !== 'string') return '';

  let cleaned = raw
    // Видаляємо null-байти та невидимі керуючі символи (крім \n та \r для багаторядкових)
    .replace(options.multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ')
    // Видаляємо HTML-теги та будь-які залишкові кутові дужки
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, '');

  if (options.multiline) {
    cleaned = cleaned
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } else {
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength).trim();
  }

  return cleaned;
}

/**
 * Перевірка same-origin за заголовками Origin / Referer / Sec-Fetch-Site.
 */
export function verifySameOrigin(request: Request): { ok: boolean; reason?: string } {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return { ok: false, reason: 'cross-site' };
  }

  const allowedOrigins = new Set<string>();

  try {
    const reqUrl = new URL(request.url);
    allowedOrigins.add(reqUrl.origin.toLowerCase());
  } catch {
    // Ігноруємо некоректний request.url
  }

  const forwardedHost = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    ''
  )
    .split(',')[0]
    .trim();

  if (forwardedHost) {
    const forwardedProto = (request.headers.get('x-forwarded-proto') || 'https')
      .split(',')[0]
      .trim();
    allowedOrigins.add(`${forwardedProto}://${forwardedHost}`.toLowerCase());
    allowedOrigins.add(`https://${forwardedHost}`.toLowerCase());
    if (forwardedHost.startsWith('localhost') || forwardedHost.startsWith('127.0.0.1')) {
      allowedOrigins.add(`http://${forwardedHost}`.toLowerCase());
    }
  }

  const vercelUrl = getServerEnv('VERCEL_URL');
  if (vercelUrl) {
    allowedOrigins.add(`https://${vercelUrl}`.toLowerCase());
  }

  const originHeader = request.headers.get('origin');
  const refererHeader = request.headers.get('referer');

  if (originHeader) {
    try {
      const originNormalized = new URL(originHeader).origin.toLowerCase();
      if (allowedOrigins.has(originNormalized)) {
        return { ok: true };
      }
      return { ok: false, reason: 'origin-mismatch' };
    } catch {
      return { ok: false, reason: 'invalid-origin' };
    }
  }

  if (refererHeader) {
    try {
      const refOrigin = new URL(refererHeader).origin.toLowerCase();
      if (allowedOrigins.has(refOrigin)) {
        return { ok: true };
      }
      return { ok: false, reason: 'referer-mismatch' };
    } catch {
      return { ok: false, reason: 'invalid-referer' };
    }
  }

  return { ok: false, reason: 'missing-origin' };
}

/**
 * Потокове читання JSON-тіла із жорстким обмеженням байтів (захист від великих/chunked payload).
 */
export async function readJsonBodyWithLimit<T = Record<string, unknown>>(
  request: Request,
  maxBytes: number
): Promise<{ ok: true; data: T; byteLength: number } | { ok: false; status: number; error: string }> {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return { ok: false, status: 415, error: 'Непідтримуваний формат запиту. Очікується JSON.' };
  }

  const contentLengthRaw = request.headers.get('content-length');
  if (contentLengthRaw) {
    const declared = Number(contentLengthRaw);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return { ok: false, status: 413, error: 'Розмір запиту перевищує дозволений ліміт.' };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: 'Порожнє тіло запиту.' };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // ігноруємо
        }
        return { ok: false, status: 413, error: 'Розмір запиту перевищує дозволений ліміт.' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: 'Не вдалося прочитати тіло запиту.' };
  }

  if (totalBytes === 0) {
    return { ok: false, status: 400, error: 'Порожнє тіло запиту.' };
  }

  const combined = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  try {
    const parsed = JSON.parse(combined.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: 'Некоректна структура JSON.' };
    }
    return { ok: true, data: parsed as T, byteLength: totalBytes };
  } catch {
    return { ok: false, status: 400, error: 'Некоректний JSON у запиті.' };
  }
}

/**
 * Перевірка honeypot-поля та мінімального часу заповнення (>3 сек).
 */
export function verifyAntiSpamSignals(payload: {
  honeypot?: unknown;
  formDurationMs?: unknown;
}): { ok: boolean; error?: string } {
  if (typeof payload.honeypot === 'string' && payload.honeypot.trim().length > 0) {
    return { ok: false, error: 'Запит відхилено перевіркою безпеки.' };
  }

  const duration = Number(payload.formDurationMs);
  if (
    !Number.isFinite(duration) ||
    duration < MIN_FORM_FILL_MS ||
    duration > 24 * 60 * 60 * 1000
  ) {
    return {
      ok: false,
      error: 'Форма надіслана занадто швидко. Будь ласка, перевірте дані та спробуйте ще раз.',
    };
  }

  return { ok: true };
}

/**
 * Локальний in-memory rate limiter (додатковий захист від burst-атак на теплих функціях Vercel).
 */
const rateLimitBuckets = new Map<string, number[]>();
const MAX_BUCKETS = 500;

export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

export function checkInMemoryRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();

  if (rateLimitBuckets.size > MAX_BUCKETS) {
    // Періодично очищаємо застарілі записи
    for (const [key, timestamps] of rateLimitBuckets.entries()) {
      const fresh = timestamps.filter((ts) => now - ts < windowMs);
      if (fresh.length === 0) {
        rateLimitBuckets.delete(key);
      } else {
        rateLimitBuckets.set(key, fresh);
      }
    }
  }

  const existing = (rateLimitBuckets.get(bucketKey) || []).filter(
    (ts) => now - ts < windowMs
  );

  if (existing.length >= maxRequests) {
    const oldest = existing[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    rateLimitBuckets.set(bucketKey, existing);
    return { allowed: false, retryAfterSec };
  }

  existing.push(now);
  rateLimitBuckets.set(bucketKey, existing);
  return { allowed: true };
}

/**
 * Серверна перевірка токена Cloudflare Turnstile.
 */
export async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string
): Promise<{ configured: boolean; ok: boolean; error?: string }> {
  const secret = getServerEnv('TURNSTILE_SECRET_KEY');
  if (!secret) {
    return {
      configured: false,
      ok: false,
      error: 'Захист Cloudflare Turnstile не налаштований на сервері.',
    };
  }

  const cleanToken = typeof token === 'string' ? token.trim() : '';
  if (!cleanToken || cleanToken.length > 2048) {
    return {
      configured: true,
      ok: false,
      error: 'Будь ласка, пройдіть перевірку безпеки (Cloudflare Turnstile).',
    };
  }

  const formBody = new URLSearchParams();
  formBody.set('secret', secret);
  formBody.set('response', cleanToken);
  if (remoteIp && remoteIp !== 'unknown') {
    formBody.set('remoteip', remoteIp);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
      signal: controller.signal,
    });

    if (!resp.ok) {
      return {
        configured: true,
        ok: false,
        error: 'Не вдалося перевірити токен безпеки. Спробуйте ще раз.',
      };
    }

    const data = (await resp.json()) as { success?: boolean };
    if (data?.success === true) {
      return { configured: true, ok: true };
    }

    return {
      configured: true,
      ok: false,
      error: 'Перевірка безпеки не пройдена. Оновіть капчу та спробуйте ще раз.',
    };
  } catch {
    return {
      configured: true,
      ok: false,
      error: 'Тимчасова помилка перевірки безпеки. Спробуйте через хвилину.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Декодує WebP (data URL або base64) та перевіряє магічні байти RIFF....WEBP і ліміт 1 МБ.
 */
export function decodeAndValidateWebpImage(
  rawInput: unknown
): { ok: true; buffer: Buffer } | { ok: false; error: string } {
  if (typeof rawInput !== 'string' || !rawInput.trim()) {
    return { ok: false, error: 'Некоректні дані зображення.' };
  }

  let base64 = rawInput.trim();
  if (base64.startsWith('data:')) {
    const match = base64.match(/^data:image\/webp;base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) {
      return { ok: false, error: 'Дозволено лише зображення у форматі WebP.' };
    }
    base64 = match[1].replace(/\s+/g, '');
  } else {
    if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
      return { ok: false, error: 'Некоректне кодування зображення.' };
    }
    base64 = base64.replace(/\s+/g, '');
  }

  // Швидка оцінка розміру до декодування
  const estimatedBytes = Math.ceil((base64.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES + 64) {
    return { ok: false, error: 'Стиснуте фото перевищує максимальний розмір 1 МБ.' };
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length < 16 || buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Розмір WebP-фото має бути від 16 Б до 1 МБ.' };
  }

  // Перевірка сигнатури RIFF....WEBP
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff !== 'RIFF' || webp !== 'WEBP') {
    return { ok: false, error: 'Файл не є коректним зображенням формату WebP.' };
  }

  return { ok: true, buffer };
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'kntsite-secure-submit/1.0',
  };
}

function encodeRepoPath(repoPath: string): string {
  return repoPath
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function ensureSkipCi(message: string): string {
  const clean = message.trim();
  return clean.includes('[skip ci]') ? clean : `${clean} [skip ci]`;
}

/**
 * Перевіряє наявність файлу у GitHub-репозиторії на вказаній гілці.
 */
export async function githubPathExists(
  cfg: GitHubConfig,
  repoPath: string
): Promise<{ exists: boolean; error?: string; status?: number }> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeRepoPath(
    repoPath
  )}?ref=${encodeURIComponent(cfg.branch)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: githubHeaders(cfg.token),
      signal: controller.signal,
    });

    if (resp.status === 404) {
      return { exists: false };
    }
    if (resp.ok) {
      return { exists: true };
    }
    return {
      exists: false,
      status: resp.status,
      error: `GitHub API перевірка шляху повернула статус ${resp.status}`,
    };
  } catch {
    return { exists: false, status: 502, error: 'Помилка зʼєднання з GitHub API.' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Підбирає унікальний slug, для якого жоден зі шляхів у buildPaths(slug) ще не існує у GitHub.
 * Ніколи не перезаписує існуючі файли.
 */
export async function resolveUniqueSlug(
  cfg: GitHubConfig,
  baseSlug: string,
  buildPaths: (candidateSlug: string) => string[]
): Promise<{ ok: true; slug: string } | { ok: false; status: number; error: string }> {
  const cleanBase = transliterateToSlug(baseSlug, 'entry');

  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix =
      attempt === 0
        ? ''
        : `-${crypto.randomBytes(3).toString('hex')}`;
    const candidate = `${cleanBase}${suffix}`;
    const paths = buildPaths(candidate);

    let collision = false;
    for (const p of paths) {
      const check = await githubPathExists(cfg, p);
      if (check.error) {
        return { ok: false, status: check.status || 502, error: check.error };
      }
      if (check.exists) {
        collision = true;
        break;
      }
    }

    if (!collision) {
      return { ok: true, slug: candidate };
    }
  }

  // Фінальний гарантовано унікальний суфікс
  const finalSlug = `${cleanBase}-${Date.now().toString(36)}-${crypto
    .randomBytes(3)
    .toString('hex')}`;
  return { ok: true, slug: finalSlug };
}

/**
 * Створює один новий файл у GitHub через Contents API із обовʼязковим "[skip ci]".
 * Поле `sha` навмисно не передається, щоб GitHub гарантовано не перезаписав існуючий файл.
 */
async function createSingleFileViaContentsApi(
  cfg: GitHubConfig,
  file: CommitFileSpec,
  commitMessage: string
): Promise<CommitResult> {
  const safePath = file.path.replace(/^\/+/, '');
  const base64Content = Buffer.isBuffer(file.content)
    ? file.content.toString('base64')
    : Buffer.from(file.content, 'utf8').toString('base64');

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeRepoPath(
    safePath
  )}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: githubHeaders(cfg.token),
      body: JSON.stringify({
        message: ensureSkipCi(commitMessage),
        content: base64Content,
        branch: cfg.branch,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      return {
        ok: false,
        status: resp.status === 422 ? 409 : 502,
        error: `Не вдалося зберегти файл у репозиторій (GitHub HTTP ${resp.status}).`,
      };
    }

    const data = (await resp.json()) as { commit?: { sha?: string } };
    return {
      ok: true,
      commitSha: data?.commit?.sha,
      paths: [safePath],
    };
  } catch {
    return {
      ok: false,
      status: 502,
      error: 'Помилка мережі під час збереження в GitHub.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Атомарно створює один або кілька нових файлів у GitHub (одним комітом із "[skip ci]").
 * Перед викликом переконайтесь, що шляхи унікальні (через resolveUniqueSlug).
 */
export async function commitNewFilesToGitHub(
  cfg: GitHubConfig,
  files: CommitFileSpec[],
  commitMessage: string
): Promise<CommitResult> {
  if (!files.length) {
    return { ok: false, status: 400, error: 'Немає файлів для збереження.' };
  }

  const safeMessage = ensureSkipCi(commitMessage);

  // Для 1 файлу достатньо Contents API PUT (без sha — апаратний захист від перезапису)
  if (files.length === 1) {
    return createSingleFileViaContentsApi(cfg, files[0], safeMessage);
  }

  // Для кількох файлів (наприклад, фото + JSON анкети) виконуємо один атомарний коміт через Git Data API
  const baseUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`;
  const headers = githubHeaders(cfg.token);

  const ghFetch = async <T = any>(
    endpoint: string,
    init: RequestInit = {}
  ): Promise<{ ok: boolean; status: number; data?: T }> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch(`${baseUrl}${endpoint}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (!resp.ok) {
        return { ok: false, status: resp.status };
      }
      const data = (await resp.json()) as T;
      return { ok: true, status: resp.status, data };
    } catch {
      return { ok: false, status: 502 };
    } finally {
      clearTimeout(timeout);
    }
  };

  // 1. Отримуємо поточний HEAD гілки
  const refRes = await ghFetch<{ object?: { sha?: string } }>(
    `/git/ref/heads/${encodeURIComponent(cfg.branch)}`
  );
  const headSha = refRes.data?.object?.sha;
  if (!refRes.ok || !headSha) {
    return {
      ok: false,
      status: 502,
      error: `Не вдалося отримати стан гілки GitHub (HTTP ${refRes.status}).`,
    };
  }

  // 2. Отримуємо дерево базового коміту
  const commitRes = await ghFetch<{ tree?: { sha?: string } }>(`/git/commits/${headSha}`);
  const baseTreeSha = commitRes.data?.tree?.sha;
  if (!commitRes.ok || !baseTreeSha) {
    return {
      ok: false,
      status: 502,
      error: `Не вдалося прочитати коміт GitHub (HTTP ${commitRes.status}).`,
    };
  }

  // 3. Створюємо blob для кожного файлу
  const treeEntries: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    sha: string;
  }> = [];

  for (const file of files) {
    const safePath = file.path.replace(/^\/+/, '');
    const base64Content = Buffer.isBuffer(file.content)
      ? file.content.toString('base64')
      : Buffer.from(file.content, 'utf8').toString('base64');

    const blobRes = await ghFetch<{ sha?: string }>('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({
        content: base64Content,
        encoding: 'base64',
      }),
    });

    if (!blobRes.ok || !blobRes.data?.sha) {
      return {
        ok: false,
        status: 502,
        error: `Не вдалося завантажити файл у GitHub (HTTP ${blobRes.status}).`,
      };
    }

    treeEntries.push({
      path: safePath,
      mode: '100644',
      type: 'blob',
      sha: blobRes.data.sha,
    });
  }

  // 4. Створюємо нове дерево
  const newTreeRes = await ghFetch<{ sha?: string }>('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries,
    }),
  });

  if (!newTreeRes.ok || !newTreeRes.data?.sha) {
    return {
      ok: false,
      status: 502,
      error: `Не вдалося створити дерево GitHub (HTTP ${newTreeRes.status}).`,
    };
  }

  // 5. Створюємо коміт з обовʼязковим "[skip ci]"
  const newCommitRes = await ghFetch<{ sha?: string }>('/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: safeMessage,
      tree: newTreeRes.data.sha,
      parents: [headSha],
    }),
  });

  if (!newCommitRes.ok || !newCommitRes.data?.sha) {
    return {
      ok: false,
      status: 502,
      error: `Не вдалося створити коміт у GitHub (HTTP ${newCommitRes.status}).`,
    };
  }

  // 6. Оновлюємо ref гілки (force: false — без перезапису історії)
  const updateRefRes = await ghFetch(`/git/refs/heads/${encodeURIComponent(cfg.branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: newCommitRes.data.sha,
      force: false,
    }),
  });

  if (!updateRefRes.ok) {
    return {
      ok: false,
      status: updateRefRes.status === 422 ? 409 : 502,
      error: `Не вдалося оновити гілку GitHub (HTTP ${updateRefRes.status}). Спробуйте ще раз.`,
    };
  }

  return {
    ok: true,
    commitSha: newCommitRes.data.sha,
    paths: treeEntries.map((e) => e.path),
  };
}
