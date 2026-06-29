const DEFAULT_ALLOWED_ORIGINS = 'https://apobi812.github.io';
const MAX_EVENT_BODY_BYTES = 4096;
const EVENT_RATE_LIMIT_PER_MINUTE = 120;
const ADMIN_RATE_LIMIT_PER_MINUTE = 10;
const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      if (error instanceof HttpError) {
        return json(request, env, { error: error.code }, error.status);
      }
      console.error(error);
      return json(request, env, { error: 'internal_error' }, 500);
    }
  }
};

async function handleRequest(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  const url = new URL(request.url);
  const route = `${request.method} ${url.pathname}`;

  if (route === 'GET /api/health') {
    return json(request, env, { ok: true, service: 'toolkit-api' });
  }

  if (route === 'POST /api/events') {
    return recordEvent(request, env, ctx);
  }

  if (route === 'POST /api/admin/login') {
    return adminLogin(request, env);
  }

  if (route === 'GET /api/admin/summary') {
    await requireAdmin(request, env);
    return adminSummary(request, env);
  }

  if (route === 'GET /api/admin/export') {
    await requireAdmin(request, env);
    return adminExport(request, env);
  }

  return json(request, env, { error: 'not_found' }, 404);
}

async function recordEvent(request, env, ctx) {
  requireDb(env);
  assertAllowedOrigin(request, env);
  assertJsonSize(request);

  const body = await readJson(request);
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const visitorHash = await visitorHashForRequest(request, env, day);
  await enforceRateLimit(env, `event:${visitorHash}`, now, EVENT_RATE_LIMIT_PER_MINUTE);

  const eventName = cleanToken(body.event, 'unknown', 64);
  const tool = cleanToken(body.tool, 'unknown', 32);
  const route = cleanToken(body.route, 'unknown', 48);
  const lang = cleanToken(body.lang, 'unknown', 12);
  const screen = cleanScreen(body.screen);
  const sessionId = cleanToken(body.sessionId, '', 80);
  const referrerHost = hostOnly(request.headers.get('Referer'));
  const browser = browserFamily(request.headers.get('User-Agent') || '');
  const country = cleanCountry(request.cf?.country);

  await env.DB.prepare(`
    INSERT INTO events (
      day, ts, event, tool, route, lang, country, visitor_hash, session_id, browser, screen, referrer_host
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(day, now, eventName, tool, route, lang, country, visitorHash, sessionId, browser, screen, referrerHost).run();

  ctx.waitUntil(cleanExpiredRateLimits(env, now));
  return json(request, env, { ok: true }, 202);
}

async function adminLogin(request, env) {
  requireDb(env);
  assertAllowedOrigin(request, env);
  assertJsonSize(request);
  requireAdminSecrets(env);

  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const visitorHash = await visitorHashForRequest(request, env, day);
  await enforceRateLimit(env, `admin:${visitorHash}`, now, ADMIN_RATE_LIMIT_PER_MINUTE);

  const body = await readJson(request);
  const password = String(body.password || '');
  const candidate = await sha256Hex(`${env.ADMIN_PASSWORD_SALT}:${password}`);
  if (!timingSafeEqual(candidate, String(env.ADMIN_PASSWORD_HASH || '').toLowerCase())) {
    throw new HttpError(401, 'invalid_credentials');
  }

  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_SECONDS;
  const token = await signToken({ sub: 'admin', exp: expiresAt }, env.ADMIN_SESSION_SECRET);
  return json(request, env, { token, expiresAt });
}

async function adminSummary(request, env) {
  const [totals, tools, events, days, countries, languages, browsers] = await Promise.all([
    env.DB.prepare(`
      SELECT COUNT(*) AS events, COUNT(DISTINCT visitor_hash) AS visitors
      FROM events
    `).first(),
    listRows(env, 'tool'),
    listRows(env, 'event'),
    listRows(env, 'day', 30, 'day DESC'),
    listRows(env, 'country'),
    listRows(env, 'lang'),
    listRows(env, 'browser')
  ]);

  return json(request, env, {
    generatedAt: new Date().toISOString(),
    totals: {
      events: Number(totals?.events || 0),
      visitors: Number(totals?.visitors || 0)
    },
    tools,
    events,
    days,
    countries,
    languages,
    browsers,
    privacy: {
      rawIpStored: false,
      fileNamesStored: false,
      fileContentsStored: false,
      visitorHashRotation: 'daily'
    }
  });
}

async function adminExport(request, env) {
  const summaryResponse = await adminSummary(request, env);
  const summary = await summaryResponse.json();
  return json(request, env, {
    exportedAt: new Date().toISOString(),
    type: 'toolkit-aggregate-analytics',
    summary
  });
}

async function listRows(env, column, limit = 20, order = 'count DESC') {
  const safeColumns = new Set(['tool', 'event', 'day', 'country', 'lang', 'browser']);
  if (!safeColumns.has(column)) return [];
  const result = await env.DB.prepare(`
    SELECT ${column} AS key, COUNT(*) AS count, COUNT(DISTINCT visitor_hash) AS visitors
    FROM events
    GROUP BY ${column}
    ORDER BY ${order}
    LIMIT ?
  `).bind(limit).all();
  return (result.results || []).map(row => ({
    key: row.key || 'unknown',
    count: Number(row.count || 0),
    visitors: Number(row.visitors || 0)
  }));
}

async function requireAdmin(request, env) {
  requireAdminSecrets(env);
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !await verifyToken(token, env.ADMIN_SESSION_SECRET)) {
    throw new HttpError(401, 'unauthorized');
  }
}

function requireDb(env) {
  if (!env.DB) throw new HttpError(503, 'database_not_configured');
}

function requireAdminSecrets(env) {
  if (!env.ADMIN_PASSWORD_SALT || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) {
    throw new HttpError(503, 'admin_not_configured');
  }
}

function assertAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return;
  if (!allowedOrigins(env).includes(origin)) throw new HttpError(403, 'origin_not_allowed');
}

function assertJsonSize(request) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > MAX_EVENT_BODY_BYTES) throw new HttpError(413, 'payload_too_large');
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_EVENT_BODY_BYTES) throw new HttpError(413, 'payload_too_large');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

async function enforceRateLimit(env, subject, now, limit) {
  const bucket = `${subject}:${Math.floor(now / 60000)}`;
  const expiresAt = now + 120000;
  await env.DB.prepare(`
    INSERT INTO rate_limits (bucket, count, expires_at)
    VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET count = count + 1, expires_at = excluded.expires_at
  `).bind(bucket, expiresAt).run();
  const row = await env.DB.prepare('SELECT count FROM rate_limits WHERE bucket = ?').bind(bucket).first();
  if (Number(row?.count || 0) > limit) throw new HttpError(429, 'rate_limited');
}

async function cleanExpiredRateLimits(env, now) {
  if (Math.random() > 0.02) return;
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run();
}

async function visitorHashForRequest(request, env, day) {
  if (!env.VISITOR_SALT) throw new HttpError(503, 'visitor_salt_not_configured');
  const salt = env.VISITOR_SALT;
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  const ua = browserFamily(request.headers.get('User-Agent') || '');
  return sha256Hex(`${salt}:${day}:${ip}:${ua}`);
}

function cleanToken(value, fallback, maxLength) {
  const token = String(value || '').toLowerCase().replace(/[^a-z0-9_.:-]/g, '').slice(0, maxLength);
  return token || fallback;
}

function cleanScreen(value) {
  const screen = String(value || '').replace(/[^0-9x]/g, '').slice(0, 16);
  return /^\d{2,5}x\d{2,5}$/.test(screen) ? screen : '';
}

function cleanCountry(value) {
  return /^[A-Z]{2}$/.test(String(value || '')) ? value : 'XX';
}

function hostOnly(value) {
  try {
    return value ? new URL(value).hostname.slice(0, 120) : '';
  } catch {
    return '';
  }
}

function browserFamily(ua) {
  if (/Edg\//.test(ua)) return 'edge';
  if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
  if (/Firefox\//.test(ua)) return 'firefox';
  return 'other';
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (origin && allowedOrigins(env).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...corsHeaders(request, env)
    }
  });
}

async function signToken(payload, secret) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacHex(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

async function verifyToken(token, secret) {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return false;
  const expected = await hmacHex(secret, encodedPayload);
  if (!timingSafeEqual(signature, expected)) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    return payload.sub === 'admin' && Number(payload.exp || 0) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return hex(new Uint8Array(digest));
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return hex(new Uint8Array(signature));
}

function hex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (!left || !right) return false;
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    mismatch |= left.charCodeAt(i % left.length) ^ right.charCodeAt(i % right.length);
  }
  return mismatch === 0;
}

function base64UrlEncode(value) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return atob(padded);
}

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
