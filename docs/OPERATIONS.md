# Toolkit Operations

This document is the production runbook for the Toolkit site.

## Target Architecture

```text
User browser
  -> Static frontend: GitHub Pages or Cloudflare Pages
  -> Optional /api route: Cloudflare Worker
  -> D1 database: aggregate analytics and rate limits
```

The frontend must remain a local-first file processor. PDF, image, text, and video contents should not be uploaded to the analytics backend.
Remote analytics must stay opt-in. The frontend should only send events after consent, and `/api/events` should reject payloads without the consent marker.

## Recommended Domain Setup

After buying a domain, use one of these setups.

### Preferred

- Static frontend on Cloudflare Pages or GitHub Pages behind Cloudflare.
- Worker routed on the same domain under `/api/*`.
- `config.js`:

```js
window.TOOLKIT_CONFIG = {
  siteOrigin: 'https://your-domain.com',
  basePath: '/',
  apiBaseUrl: '/api'
};
```

This keeps `connect-src 'self'` valid and avoids adding broad external API origins.
The runtime canonical and `hreflang` links use `siteOrigin` and `basePath`.
After editing `config.js`, run:

```bash
npm run metadata
npm run check
```

This regenerates `sitemap.xml`, `robots.txt`, and static canonical tags from the same domain settings.

### Acceptable Temporary Setup

- Frontend remains at `https://apobi812.github.io/pdf-image-merger/`.
- Worker uses its own `workers.dev` URL.
- `config.js` keeps `siteOrigin: 'https://apobi812.github.io'`, `basePath: '/pdf-image-merger/'`, and uses the exact Worker `/api` URL.
- Every HTML CSP `connect-src` must add that exact Worker origin.
- Worker `ALLOWED_ORIGINS` must include only the exact frontend origin.

Avoid `*` in CORS or CSP.

## Required Secrets

Set these with `wrangler secret put`.

- `VISITOR_SALT`
- `ADMIN_PASSWORD_KDF`
- `ADMIN_PASSWORD_ITERATIONS`
- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Generate salts and session secret with:

```bash
openssl rand -hex 16
openssl rand -hex 32
```

Create the admin PBKDF2 hash from the `worker/` directory with:

```bash
read -s ADMIN_PASSWORD
export ADMIN_PASSWORD
node generate-admin-secret.mjs
unset ADMIN_PASSWORD
```

## Release Checklist

Run this before each deploy:

```bash
npm run metadata:check
npm run check
sqlite3 :memory: ".read worker/schema.sql"
```

Then verify the live site:

- Home loads 20 tool cards.
- `/pdf/`, `/word-count/`, and `/video-extractor/` load without console errors.
- `/admin/` is not linked in public navigation.
- `/admin/` has `noindex,nofollow`.
- `/sitemap.xml` does not include `/admin/`.
- `/.well-known/security.txt` is reachable.
- `/offline.html` is reachable.
- `manifest.webmanifest` exposes the three ready tool shortcuts.
- Direct language URLs such as `/?lang=en` and `/pdf/?lang=ja` render the requested language and keep the route.
- `sitemap.xml` includes `xhtml:link hreflang` alternates for all 10 supported languages.
- Runtime canonical and `hreflang` links use `config.js` `siteOrigin` and `basePath`.

## Security Invariants

Do not loosen these without a specific reason:

- No third-party runtime scripts before consent/ad review.
- No raw file upload endpoint for PDFs, images, text, or videos.
- No file names or file contents in analytics.
- No browser session IDs in analytics.
- No remote analytics before browser-side consent.
- Worker rejects event writes without an explicit analytics consent marker.
- Worker rejects unknown analytics event names, tools, routes, languages, admin-route analytics, and oversized JSON payloads.
- Server admin password verification uses PBKDF2-SHA-256 by default.
- No `ignoreEncryption` PDF loading.
- Keep the risky PDF active-content marker guard enabled.
- No SVG input for PDF merging.
- Keep the PDF/image total input-size cap enabled to reduce browser memory exhaustion.
- Keep the word-counter text-length cap enabled to reduce CPU and memory exhaustion from oversized pastes.
- Keep image canvas re-encoding enabled before PDF embedding so source EXIF/location metadata is stripped.
- Local admin lock uses PBKDF2-SHA-256 and remains labeled as local-only protection.
- PWA install metadata, tool shortcuts, and offline fallback stay enabled.
- Language switching keeps a shareable `?lang=` URL and does not create separate language HTML files.
- Runtime head metadata keeps canonical and `hreflang` alternate links in sync with the current route.
- Keep `frame-ancestors` in HTTP headers, not HTML meta CSP.
- Keep the JavaScript frame guard enabled for static hosts without header control.
- No wildcard CORS.
- No wildcard CSP `connect-src`.

## Ads And Consent

Ad slots are config-driven placeholders until AdSense approval. The default `config.js` keeps `ads.provider`, `ads.client`, and every slot ID empty, and the app must not load third-party ad scripts in this state. Before enabling ad scripts:

- Fill `config.js` with the approved AdSense publisher ID and explicit slot IDs.
- Add consent handling if required by target countries.
- Update the privacy policy with the ad provider and cookie behavior.
- Add the exact script origins to CSP instead of broad wildcards.
- Add `ads.txt` only after the real publisher ID is issued.
- Re-run `npm run check` and manually inspect all routes.

## Incident Response

If abuse, unexpected analytics, or a security report appears:

1. Disable `apiBaseUrl` in `config.js` and deploy.
2. Rotate Worker secrets.
3. Inspect aggregate D1 data for abnormal event volume.
4. Check Cloudflare/Wrangler logs.
5. Patch, run `npm run check`, and redeploy.
