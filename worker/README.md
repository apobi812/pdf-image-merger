# Toolkit API Worker

Cloudflare Worker + D1 backend for production admin login and privacy-safe aggregate analytics.

The frontend still processes PDFs, images, text, and videos locally in the browser. This Worker only receives small event counters such as `route_open`, `pdf_download`, tool name, route, language, approximate screen size, browser family, country from Cloudflare metadata, and a daily rotating visitor hash.

It does not receive or store file names, file contents, browser session IDs, raw IP addresses, raw user-agent strings, PDFs, images, or videos.

## Endpoints

- `GET /api/health`
- `POST /api/events`
- `POST /api/admin/login`
- `GET /api/admin/summary`
- `GET /api/admin/export`

## Deploy

1. Copy the example config.

```bash
cd worker
cp wrangler.toml.example wrangler.toml
```

2. Create a D1 database and paste the returned `database_id` into `wrangler.toml`.

```bash
npx wrangler d1 create toolkit_analytics
```

3. Apply the schema.

```bash
npx wrangler d1 execute toolkit_analytics --file=schema.sql --remote
```

4. Generate visitor/session secrets.

```bash
openssl rand -hex 16
openssl rand -hex 32
```

5. Create an admin password hash. Replace the salt and password values first.

```bash
read -s ADMIN_PASSWORD
export ADMIN_PASSWORD
node generate-admin-secret.mjs
unset ADMIN_PASSWORD
```

The script prints `ADMIN_PASSWORD_KDF`, `ADMIN_PASSWORD_ITERATIONS`, `ADMIN_PASSWORD_SALT`, and `ADMIN_PASSWORD_HASH`.

6. Store secrets in Cloudflare.

```bash
npx wrangler secret put VISITOR_SALT
npx wrangler secret put ADMIN_PASSWORD_KDF
npx wrangler secret put ADMIN_PASSWORD_ITERATIONS
npx wrangler secret put ADMIN_PASSWORD_SALT
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put ADMIN_SESSION_SECRET
```

7. Deploy.

```bash
npx wrangler deploy
```

8. Connect the frontend.

For a same-origin custom domain setup, route the Worker under `/api` and set:

```js
window.TOOLKIT_CONFIG = {
  siteOrigin: 'https://your-domain.com',
  basePath: '/',
  apiBaseUrl: '/api'
};
```

For the current GitHub Pages deployment, keep `siteOrigin: 'https://apobi812.github.io'` and `basePath: '/pdf-image-merger/'`.

For a separate Worker URL, set `apiBaseUrl` to the Worker `/api` URL and update the frontend Content Security Policy `connect-src` to include that exact origin.

## Security Notes

- Admin sessions are HMAC-signed and expire after 8 hours.
- Admin password hashes use PBKDF2-SHA-256 by default.
- Admin passwords are never stored in source code.
- Event and admin login endpoints have D1-backed per-minute rate limits.
- Event writes reject unknown event names, tools, routes, languages, oversized JSON, and admin-route analytics payloads.
- CORS allows only configured origins.
- Raw IP addresses and raw user-agent strings are not stored.
- Analytics export returns aggregate data, not event rows with visitor hashes.
