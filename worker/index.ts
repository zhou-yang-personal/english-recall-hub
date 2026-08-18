const SESSION_COOKIE = 'erh_device_session';
const SESSION_VERSION = 1;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const MAX_EVENT_BATCH = 100;
const MAX_PULL_LIMIT = 500;

interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

export interface WorkerEnv {
  ASSETS: AssetBinding;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  FAMILY_OWNER_USER_ID: string;
  FAMILY_PAIRING_CODE: string;
  DEVICE_SESSION_SECRET: string;
}

interface DeviceSession {
  version: 1;
  deviceId: string;
  expiresAt: number;
}

interface RemoteProfileRow {
  learner_profile_id: string;
  display_name: string;
  content_profile_id: string;
  settings: Record<string, unknown>;
}

interface RemoteReviewEventRow {
  sync_seq: number;
  event_id: string;
  learner_profile_id: string;
  card_id: string;
  rating: 'unknown' | 'fuzzy' | 'known';
  reviewed_at: string;
  effective_at: string;
  device_id: string;
  scheduler_version: 1;
}

const encoder = new TextEncoder();

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }

  return difference === 0;
}

async function equalSecrets(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  return equalBytes(new Uint8Array(leftDigest), new Uint8Array(rightDigest));
}

function readCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.get('cookie');

  if (!cookie) {
    return undefined;
  }

  for (const part of cookie.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');

    if (key === name) {
      return valueParts.join('=');
    }
  }

  return undefined;
}

async function createSessionCookie(secret: string): Promise<string> {
  const session: DeviceSession = {
    version: SESSION_VERSION,
    deviceId: crypto.randomUUID(),
    expiresAt: Math.floor(Date.now() / 1_000) + SESSION_MAX_AGE_SECONDS,
  };
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = toBase64Url(await hmac(payload, secret));
  return `${SESSION_COOKIE}=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

async function hasValidSession(request: Request, secret: string): Promise<boolean> {
  const value = readCookie(request, SESSION_COOKIE);

  if (!value) {
    return false;
  }

  const [payload, signature, extra] = value.split('.');

  if (!payload || !signature || extra) {
    return false;
  }

  try {
    const expectedSignature = await hmac(payload, secret);

    if (!equalBytes(fromBase64Url(signature), expectedSignature)) {
      return false;
    }

    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Partial<DeviceSession>;
    return session.version === SESSION_VERSION
      && typeof session.deviceId === 'string'
      && typeof session.expiresAt === 'number'
      && session.expiresAt > Math.floor(Date.now() / 1_000);
  } catch {
    return false;
  }
}

function validateEnv(env: WorkerEnv): string | undefined {
  if (!env.SUPABASE_URL?.startsWith('https://')) {
    return 'SUPABASE_URL';
  }

  if (!env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY.length < 32) {
    return 'SUPABASE_SECRET_KEY';
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(env.FAMILY_OWNER_USER_ID ?? '')) {
    return 'FAMILY_OWNER_USER_ID';
  }

  if (!env.FAMILY_PAIRING_CODE || env.FAMILY_PAIRING_CODE.length < 12) {
    return 'FAMILY_PAIRING_CODE';
  }

  if (!env.DEVICE_SESSION_SECRET || env.DEVICE_SESSION_SECRET.length < 32) {
    return 'DEVICE_SESSION_SECRET';
  }

  return undefined;
}

function ensureSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function readJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');

  if (contentLength > 128_000) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }

  return request.json();
}

async function supabaseRequest(
  env: WorkerEnv,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const baseUrl = env.SUPABASE_URL.replace(/\/$/u, '');
  const headers = new Headers(init.headers);
  headers.set('apikey', env.SUPABASE_SECRET_KEY);
  headers.set('accept-profile', 'english_recall');

  if (init.body !== undefined) {
    headers.set('content-profile', 'english_recall');
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, { ...init, headers });

  if (!response.ok) {
    throw new Error(`SUPABASE_${response.status}`);
  }

  return response;
}

function toClientProfile(row: RemoteProfileRow): Record<string, unknown> {
  return {
    learnerProfileId: row.learner_profile_id,
    cloudSyncId: 'family',
    displayName: row.display_name,
    contentProfileId: row.content_profile_id,
    uiLang: row.settings.uiLang,
    nativeLang: row.settings.nativeLang,
    defaultLearningLang: row.settings.defaultLearningLang,
    englishVoiceLocale: row.settings.englishVoiceLocale,
    spanishVoiceLocale: row.settings.spanishVoiceLocale,
    ttsRate: row.settings.ttsRate,
    listeningModeDefault: row.settings.listeningModeDefault,
    dailyNewCardLimit: row.settings.dailyNewCardLimit,
  };
}

function toClientEvent(row: RemoteReviewEventRow): Record<string, unknown> {
  return {
    eventId: row.event_id,
    learnerProfileId: row.learner_profile_id,
    cardId: row.card_id,
    rating: row.rating,
    reviewedAt: row.reviewed_at,
    effectiveAt: row.effective_at,
    deviceId: row.device_id,
    schedulerVersion: row.scheduler_version,
    remoteSeq: row.sync_seq,
    syncStatus: 'synced',
  };
}

async function listProfiles(env: WorkerEnv): Promise<Response> {
  const query = new URLSearchParams({
    select: 'learner_profile_id,display_name,content_profile_id,settings',
    user_id: `eq.${env.FAMILY_OWNER_USER_ID}`,
    order: 'created_at.asc',
  });
  const response = await supabaseRequest(env, `learner_profiles?${query}`);
  const rows = await response.json() as RemoteProfileRow[];
  return json({ profiles: rows.map(toClientProfile) });
}

async function createProfile(request: Request, env: WorkerEnv): Promise<Response> {
  const body = await readJson(request) as {
    learnerProfileId?: unknown;
    displayName?: unknown;
    contentProfileId?: unknown;
  };
  const learnerProfileId = typeof body.learnerProfileId === 'string'
    ? body.learnerProfileId
    : crypto.randomUUID();
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const contentProfileId = typeof body.contentProfileId === 'string' ? body.contentProfileId : '';

  if (!displayName || displayName.length > 80) {
    return apiError(400, 'INVALID_DISPLAY_NAME', '学习者名称长度应为 1–80 个字符。');
  }

  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/u.test(contentProfileId)) {
    return apiError(400, 'INVALID_CONTENT_PROFILE', '学习内容标识无效。');
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(learnerProfileId)) {
    return apiError(400, 'INVALID_LEARNER_PROFILE_ID', '学习者标识无效。');
  }

  const query = new URLSearchParams({
    select: 'learner_profile_id,display_name,content_profile_id,settings',
  });
  const response = await supabaseRequest(env, `learner_profiles?${query}`, {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      learner_profile_id: learnerProfileId,
      user_id: env.FAMILY_OWNER_USER_ID,
      display_name: displayName,
      content_profile_id: contentProfileId,
      settings: {
        uiLang: 'zh-CN',
        nativeLang: 'zh-CN',
        defaultLearningLang: 'en',
        englishVoiceLocale: 'en-US',
        spanishVoiceLocale: 'es-MX',
        ttsRate: 1,
        listeningModeDefault: false,
        dailyNewCardLimit: 10,
      },
    }),
  });
  const rows = await response.json() as RemoteProfileRow[];
  const row = rows[0];

  if (!row) {
    throw new Error('SUPABASE_EMPTY_RESPONSE');
  }

  return json({ profile: toClientProfile(row) }, 201);
}

async function ownerProfileIds(env: WorkerEnv): Promise<Set<string>> {
  const query = new URLSearchParams({
    select: 'learner_profile_id',
    user_id: `eq.${env.FAMILY_OWNER_USER_ID}`,
  });
  const response = await supabaseRequest(env, `learner_profiles?${query}`);
  const rows = await response.json() as Array<{ learner_profile_id: string }>;
  return new Set(rows.map((row) => row.learner_profile_id));
}

function isReviewEvent(value: unknown): value is Omit<RemoteReviewEventRow, 'sync_seq'> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Record<string, unknown>;
  return typeof event.event_id === 'string'
    && /^[0-9a-f-]{36}$/iu.test(event.event_id)
    && typeof event.learner_profile_id === 'string'
    && /^[0-9a-f-]{36}$/iu.test(event.learner_profile_id)
    && typeof event.card_id === 'string'
    && /^[0-9a-f]{64}$/u.test(event.card_id)
    && (event.rating === 'unknown' || event.rating === 'fuzzy' || event.rating === 'known')
    && typeof event.reviewed_at === 'string'
    && !Number.isNaN(Date.parse(event.reviewed_at))
    && typeof event.effective_at === 'string'
    && !Number.isNaN(Date.parse(event.effective_at))
    && typeof event.device_id === 'string'
    && /^[A-Za-z0-9._:-]{1,128}$/u.test(event.device_id)
    && event.scheduler_version === 1;
}

async function pushReviewEvents(request: Request, env: WorkerEnv): Promise<Response> {
  const body = await readJson(request) as { events?: unknown };

  if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > MAX_EVENT_BATCH) {
    return apiError(400, 'INVALID_EVENT_BATCH', `每批应包含 1–${MAX_EVENT_BATCH} 条事件。`);
  }

  if (!body.events.every(isReviewEvent)) {
    return apiError(400, 'INVALID_REVIEW_EVENT', '复习事件格式无效。');
  }

  const allowedProfiles = await ownerProfileIds(env);

  if (body.events.some((event) => !allowedProfiles.has(event.learner_profile_id))) {
    return apiError(403, 'PROFILE_NOT_ALLOWED', '学习者不属于当前家庭空间。');
  }

  const rows = body.events.map((event) => ({
    ...event,
    user_id: env.FAMILY_OWNER_USER_ID,
  }));
  await supabaseRequest(env, 'review_events?on_conflict=event_id', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  const eventIds = body.events.map((event) => event.event_id).join(',');
  const query = new URLSearchParams({
    select: 'sync_seq,event_id,learner_profile_id,card_id,rating,reviewed_at,effective_at,device_id,scheduler_version',
    user_id: `eq.${env.FAMILY_OWNER_USER_ID}`,
    event_id: `in.(${eventIds})`,
    order: 'sync_seq.asc',
  });
  const response = await supabaseRequest(env, `review_events?${query}`);
  const synchronizedRows = await response.json() as RemoteReviewEventRow[];
  return json({ events: synchronizedRows.map(toClientEvent) });
}

async function pullReviewEvents(url: URL, env: WorkerEnv): Promise<Response> {
  const learnerProfileId = url.searchParams.get('learnerProfileId') ?? '';
  const after = Number(url.searchParams.get('after') ?? '0');
  const requestedLimit = Number(url.searchParams.get('limit') ?? '200');

  if (!/^[0-9a-f-]{36}$/iu.test(learnerProfileId) || !Number.isSafeInteger(after) || after < 0) {
    return apiError(400, 'INVALID_PROGRESS_QUERY', '进度查询参数无效。');
  }

  const limit = Math.min(MAX_PULL_LIMIT, Math.max(1, Math.trunc(requestedLimit) || 200));
  const allowedProfiles = await ownerProfileIds(env);

  if (!allowedProfiles.has(learnerProfileId)) {
    return apiError(403, 'PROFILE_NOT_ALLOWED', '学习者不属于当前家庭空间。');
  }

  const query = new URLSearchParams({
    select: 'sync_seq,event_id,learner_profile_id,card_id,rating,reviewed_at,effective_at,device_id,scheduler_version',
    user_id: `eq.${env.FAMILY_OWNER_USER_ID}`,
    learner_profile_id: `eq.${learnerProfileId}`,
    sync_seq: `gt.${after}`,
    order: 'sync_seq.asc',
    limit: String(limit),
  });
  const response = await supabaseRequest(env, `review_events?${query}`);
  const rows = await response.json() as RemoteReviewEventRow[];
  return json({ events: rows.map(toClientEvent) });
}

export async function handleApiRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const missingConfig = validateEnv(env);

  if (missingConfig) {
    return apiError(503, 'BACKEND_NOT_CONFIGURED', `后台缺少 ${missingConfig} 配置。`);
  }

  if (!ensureSameOrigin(request) && request.method !== 'GET') {
    return apiError(403, 'INVALID_ORIGIN', '请求来源无效。');
  }

  if (url.pathname === '/api/device/status' && request.method === 'GET') {
    return json({ paired: await hasValidSession(request, env.DEVICE_SESSION_SECRET) });
  }

  if (url.pathname === '/api/device/pair' && request.method === 'POST') {
    try {
      const body = await readJson(request) as { pairingCode?: unknown };
      const pairingCode = typeof body.pairingCode === 'string' ? body.pairingCode.trim() : '';

      if (!await equalSecrets(pairingCode, env.FAMILY_PAIRING_CODE)) {
        return apiError(401, 'PAIRING_CODE_INVALID', '家庭同步码不正确。');
      }

      return json(
        { paired: true },
        200,
        { 'set-cookie': await createSessionCookie(env.DEVICE_SESSION_SECRET) },
      );
    } catch {
      return apiError(400, 'INVALID_JSON', '请求格式无效。');
    }
  }

  const paired = await hasValidSession(request, env.DEVICE_SESSION_SECRET);

  if (!paired) {
    return apiError(401, 'DEVICE_NOT_PAIRED', '请先配对这台设备。');
  }

  if (url.pathname === '/api/device/unpair' && request.method === 'POST') {
    return json(
      { paired: false },
      200,
      { 'set-cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0` },
    );
  }

  try {
    if (url.pathname === '/api/profiles' && request.method === 'GET') {
      return await listProfiles(env);
    }

    if (url.pathname === '/api/profiles' && request.method === 'POST') {
      return await createProfile(request, env);
    }

    if (url.pathname === '/api/review-events' && request.method === 'POST') {
      return await pushReviewEvents(request, env);
    }

    if (url.pathname === '/api/review-events' && request.method === 'GET') {
      return await pullReviewEvents(url, env);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return apiError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大。');
    }

    return apiError(502, 'CLOUD_BACKEND_ERROR', '云端暂时不可用，本机数据未受影响。');
  }

  return apiError(404, 'NOT_FOUND', '接口不存在。');
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
