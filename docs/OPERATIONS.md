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

## Recommended Domain Setup

After buying a domain, use one of these setups.

### Preferred

- Static frontend on Cloudflare Pages or GitHub Pages behind Cloudflare.
- Worker routed on the same domain under `/api/*`.
- `config.js`:

```js
window.TOOLKIT_CONFIG = {
  apiBaseUrl: '/api'
};
```

This keeps `connect-src 'self'` valid and avoids adding broad external API origins.

### Acceptable Temporary Setup

- Frontend remains at `https://apobi812.github.io/pdf-image-merger/`.
- Worker uses its own `workers.dev` URL.
- `config.js` uses the exact Worker `/api` URL.
- Every HTML CSP `connect-src` must add that exact Worker origin.
- Worker `ALLOWED_ORIGINS` must include only the exact frontend origin.

Avoid `*` in CORS or CSP.

## Required Secrets

Set these with `wrangler secret put`.

- `VISITOR_SALT`
- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Generate salts and session secret with:

```bash
openssl rand -hex 16
openssl rand -hex 32
```

Create the admin hash with:

```bash
printf '%s' 'YOUR_ADMIN_PASSWORD_SALT:YOUR_ADMIN_PASSWORD' | shasum -a 256
```

## Release Checklist

Run this before each deploy:

```bash
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

## Security Invariants

Do not loosen these without a specific reason:

- No third-party runtime scripts before consent/ad review.
- No raw file upload endpoint for PDFs, images, text, or videos.
- No file names or file contents in analytics.
- No browser session IDs in analytics.
- No `ignoreEncryption` PDF loading.
- No SVG input for PDF merging.
- Local admin lock uses PBKDF2-SHA-256 and remains labeled as local-only protection.
- No wildcard CORS.
- No wildcard CSP `connect-src`.

## Ads And Consent

Ad slots are placeholders until AdSense approval. Before enabling ad scripts:

- Add consent handling if required by target countries.
- Update the privacy policy with the ad provider and cookie behavior.
- Add the exact script origins to CSP instead of broad wildcards.
- Re-run `npm run check` and manually inspect all routes.

## Incident Response

If abuse, unexpected analytics, or a security report appears:

1. Disable `apiBaseUrl` in `config.js` and deploy.
2. Rotate Worker secrets.
3. Inspect aggregate D1 data for abnormal event volume.
4. Check Cloudflare/Wrangler logs.
5. Patch, run `npm run check`, and redeploy.
