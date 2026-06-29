import worker from '../worker/src/index.js';

const BASE_URL = 'https://api.example.test';
const ALLOWED_ORIGIN = 'https://apobi812.github.io';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createMockEnv() {
  const state = { rateCount: 0, events: [] };
  return {
    state,
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return createStatement(sql, args, state);
          }
        };
      }
    },
    VISITOR_SALT: '0123456789abcdef0123456789abcdef',
    ALLOWED_ORIGINS: ALLOWED_ORIGIN,
    ADMIN_PASSWORD_SALT: '0123456789abcdef0123456789abcdef',
    ADMIN_PASSWORD_HASH: '00',
    ADMIN_SESSION_SECRET: '0123456789abcdef0123456789abcdef'
  };
}

function createStatement(sql, args, state) {
  const normalized = sql.replace(/\s+/g, ' ');
  return {
    async run() {
      if (normalized.includes('INSERT INTO rate_limits')) {
        state.rateCount += 1;
      }
      if (normalized.includes('INSERT INTO events')) {
        state.events.push(args);
      }
      return {};
    },
    async first() {
      if (normalized.includes('SELECT count FROM rate_limits')) {
        return { count: state.rateCount };
      }
      if (normalized.includes('SELECT COUNT(*) AS events')) {
        return { events: state.events.length, visitors: state.events.length ? 1 : 0 };
      }
      return {};
    },
    async all() {
      return { results: [] };
    }
  };
}

function createCtx() {
  return { waitUntil() {} };
}

function jsonRequest(path, body, origin = ALLOWED_ORIGIN) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 Chrome/120.0'
  };
  if (origin) headers.Origin = origin;
  return new Request(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

async function fetchJson(request, env) {
  const response = await worker.fetch(request, env, createCtx());
  const body = await response.json();
  return { status: response.status, body };
}

const validEvent = {
  consent: 'analytics',
  event: 'pdf_download',
  tool: 'pdf',
  route: 'pdf',
  lang: 'en',
  screen: '1440x900'
};

{
  const env = createMockEnv();
  const result = await fetchJson(jsonRequest('/api/events', validEvent), env);
  assert(result.status === 202, `valid event should be accepted, got ${result.status}`);
  assert(env.state.events.length === 1, 'valid event should be inserted');
}

{
  const env = createMockEnv();
  const response = await worker.fetch(jsonRequest('/api/events', validEvent), env, createCtx());
  assert(response.headers.get('Access-Control-Allow-Origin') === ALLOWED_ORIGIN, 'allowed origin should receive a CORS allow header');
  assert(response.headers.get('Content-Security-Policy')?.includes("default-src 'none'"), 'JSON responses must include restrictive CSP');
  assert(response.headers.get('X-Frame-Options') === 'DENY', 'JSON responses must deny framing');
  assert(response.headers.get('Strict-Transport-Security')?.includes('max-age=31536000'), 'JSON responses must include HSTS');
}

{
  const env = createMockEnv();
  const response = await worker.fetch(new Request(`${BASE_URL}/api/events`, {
    method: 'OPTIONS',
    headers: {
      Origin: ALLOWED_ORIGIN,
      'Access-Control-Request-Method': 'POST'
    }
  }), env, createCtx());
  assert(response.status === 204, 'preflight should return 204');
  assert(response.headers.get('Access-Control-Allow-Origin') === ALLOWED_ORIGIN, 'preflight should echo allowed origin');
  assert(response.headers.get('X-Content-Type-Options') === 'nosniff', 'preflight should include security headers');
}

{
  const env = createMockEnv();
  const result = await fetchJson(jsonRequest('/api/events', { ...validEvent, event: 'made_up_event' }), env);
  assert(result.status === 400 && result.body.error === 'invalid_event', 'unknown event must be rejected');
}

{
  const env = createMockEnv();
  const result = await fetchJson(jsonRequest('/api/events', { ...validEvent, tool: 'admin', route: 'admin' }), env);
  assert(result.status === 400 && result.body.error === 'invalid_tool', 'admin analytics payload must be rejected');
}

{
  const env = createMockEnv();
  const result = await fetchJson(jsonRequest('/api/events', { ...validEvent, lang: 'xx' }), env);
  assert(result.status === 400 && result.body.error === 'invalid_language', 'unknown language must be rejected');
}

{
  const env = createMockEnv();
  const result = await fetchJson(jsonRequest('/api/events', { ...validEvent, consent: 'nope' }), env);
  assert(result.status === 403 && result.body.error === 'analytics_consent_required', 'missing analytics consent must be rejected');
}

{
  const env = createMockEnv();
  const oversized = JSON.stringify({ ...validEvent, padding: 'x'.repeat(5000) });
  const result = await fetchJson(jsonRequest('/api/events', oversized), env);
  assert(result.status === 413 && result.body.error === 'payload_too_large', 'oversized event payload must be rejected');
}

{
  const env = createMockEnv();
  const result = await fetchJson(jsonRequest('/api/events', validEvent, 'https://evil.example'), env);
  assert(result.status === 403 && result.body.error === 'origin_not_allowed', 'disallowed origin must be rejected');
}

{
  const env = createMockEnv();
  const result = await fetchJson(jsonRequest('/api/events', validEvent, ''), env);
  assert(result.status === 403 && result.body.error === 'origin_required', 'missing origin must be rejected');
}

{
  const env = createMockEnv();
  const result = await fetchJson(new Request(`${BASE_URL}/api/admin/summary`, {
    method: 'GET',
    headers: { Authorization: 'Bearer invalid' }
  }), env);
  assert(result.status === 403 && result.body.error === 'origin_required', 'admin reads must require an allowed origin before token checks');
}

console.log('Worker smoke verification passed.');
