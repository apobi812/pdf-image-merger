# Toolkit Launch Runbook

This is the non-developer launch checklist for moving Toolkit from the current GitHub Pages deployment to a production domain with optional Worker analytics and AdSense.

## Current Stable Deployment

- Frontend: `https://apobi812.github.io/pdf-image-merger/`
- Runtime config: `config.js`
- Static metadata source: `tools/generate-metadata.mjs`
- Release gate: `npm run check`
- Serverless backend candidate: `worker/`

Do not put real secrets, AdSense IDs, or private admin passwords in source files.

## Phase 1: Before Buying Or Connecting A Domain

1. Keep `config.js` on the GitHub Pages values:

```js
siteOrigin: 'https://apobi812.github.io',
basePath: '/pdf-image-merger/',
apiBaseUrl: ''
```

2. Keep ads disabled:

```js
ads: {
  provider: '',
  client: '',
  slots: {
    leftRail: '',
    settingsRail: '',
    footer: ''
  }
}
```

3. Run the release gate before every push:

```bash
npm run check
sqlite3 :memory: ".read worker/schema.sql"
```

4. Confirm the public site:

- `/`
- `/pdf/`
- `/word-count/`
- `/video-extractor/`
- `/privacy/`
- `/terms/`
- `/security/`
- `/.well-known/security.txt`
- `/sitemap.xml`

## Phase 2: Custom Domain

Preferred production shape:

```text
https://your-domain.com/
https://your-domain.com/pdf/
https://your-domain.com/word-count/
https://your-domain.com/video-extractor/
https://your-domain.com/api/*
```

After the domain is ready:

1. Change `config.js`:

```js
siteOrigin: 'https://your-domain.com',
basePath: '/',
apiBaseUrl: ''
```

2. Run:

```bash
npm run metadata
npm run check
```

3. Verify generated files:

- `sitemap.xml` uses the new domain.
- `robots.txt` points to the new sitemap.
- Static canonical tags use the new domain.
- `/admin/` is still excluded from the sitemap.

4. In Google Search Console:

- Add the new domain property.
- Submit `https://your-domain.com/sitemap.xml`.
- Request indexing for the home page and the three ready tool pages.

## Phase 3: Worker And D1 Analytics

Use the Worker only for aggregate analytics and server-side admin auth. Never upload user files to it.

1. Follow `worker/README.md`.
2. Create the D1 database.
3. Apply `worker/schema.sql`.
4. Generate secrets with `worker/generate-admin-secret.mjs`.
5. Store all secrets with `wrangler secret put`.
6. Route the Worker under the same domain at `/api/*` when possible.
7. Change `config.js`:

```js
apiBaseUrl: '/api'
```

8. Keep these security requirements:

- `ALLOWED_ORIGINS` contains only exact frontend origins.
- Event writes require analytics consent.
- Admin API requires an allowed origin.
- Admin sessions expire.
- Raw IP addresses, raw user agents, file names, and file contents are not stored.

9. Run:

```bash
npm run check
```

10. Verify `/admin/` with the server admin password.

## Phase 4: AdSense

Before adding ad scripts:

1. Get AdSense approval for the production domain.
2. Add the real publisher ID and explicit slot IDs to `config.js`.
3. Add `ads.txt` only after Google provides the real publisher ID.
4. Update privacy text if Google ad cookies or personalized ads are enabled.
5. Update consent handling for target countries if required.
6. Update CSP with exact Google ad script origins. Do not use wildcard script or connect sources.
7. Run:

```bash
npm run check
```

8. Manually inspect all public pages on mobile and desktop.

## Phase 5: Post-Launch Monitoring

Weekly checks:

- `npm run check` passes locally.
- Search Console has no sitemap or indexing errors.
- Cloudflare logs do not show unusual Worker errors.
- D1 analytics counts look reasonable.
- `/admin/` remains noindex and unlinked.
- Ads load only after the approved configuration is present.
- Legal pages still match the actual operator, ad setup, and analytics setup.

## Emergency Rollback

If analytics, ads, or an API route behaves unexpectedly:

1. Set `apiBaseUrl: ''` in `config.js`.
2. Set `ads.provider`, `ads.client`, and all ad slot IDs to empty strings.
3. Run:

```bash
npm run metadata
npm run check
git add .
git commit -m "Disable remote integrations"
git push
```

4. Rotate Worker secrets if tokens or credentials may have been exposed.
5. Review `SECURITY.md` and `docs/OPERATIONS.md` before re-enabling integrations.
