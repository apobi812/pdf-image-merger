# Security Notes

This project is a static, client-side PWA. It is designed so user files are processed locally in the browser.

## Current Controls

- Content Security Policy in `index.html`
- No third-party runtime scripts
- Local `pdf.js` and `pdf-lib` vendor files
- File type and size checks before processing
- PDF/image merge inputs are capped by both per-file size and total selected input size
- Word counter input is capped to reduce browser memory and CPU exhaustion from oversized pastes
- PDF and image magic-byte checks before previewing or merging
- Images are re-encoded through browser canvas before PDF embedding to strip source metadata such as EXIF and location data
- Encrypted PDFs are blocked instead of being loaded with encryption bypass flags
- PDFs with JavaScript, auto actions, embedded files, rich media, or XFA markers are blocked as high-risk active content
- SVG and other active/vector image formats are rejected for PDF merging
- Large decoded image dimensions are rejected before canvas conversion
- Video uploads are limited to common browser formats: MP4, MOV, WebM, and OGG
- Video files are checked against expected container headers before browser decoding
- No file-name or file-content analytics
- No browser session IDs are sent to the optional analytics backend
- Remote analytics is sent only after browser-side consent, and the Worker rejects events without the explicit consent marker
- Worker analytics accepts only allowlisted event names, tools, public routes, languages, and small JSON payloads
- Local-only admin dashboard with a browser passcode stored with PBKDF2-SHA-256
- Admin UI is not linked from the public navigation; `/admin/` is direct-address only
- Optional Cloudflare Worker + D1 backend for server-side admin auth and aggregate analytics
- Worker admin password hashes use PBKDF2-SHA-256 by default
- Server analytics stores daily visitor hashes, not raw IP addresses
- `_headers` provides production security headers for Cloudflare Pages or compatible static hosting
- The app includes a JavaScript frame guard for static hosts that cannot apply `frame-ancestors` headers
- `tools/verify-release.mjs` checks release security invariants before deployment

## Limits

The local admin passcode is stored with PBKDF2-SHA-256, but it is still not a production authentication boundary. Anyone with browser/storage access or source access can bypass it. Use it only for local aggregate visibility.

For production-grade administration, deploy the `worker/` backend and connect it through `config.js`. A same-origin `/api` route behind a custom domain is preferred because the frontend CSP can keep `connect-src 'self'`.

If the Worker is hosted on a separate origin, update the CSP `connect-src` directive to that exact origin and keep `ALLOWED_ORIGINS` restricted to the frontend origin.

## Recommended Production Additions

- Cloudflare Worker deployment with D1 migrations applied
- Strong admin password, unique salts, and long `ADMIN_SESSION_SECRET`
- Same-origin custom domain route for `/api`
- Consent management for ads and analytics
- Security headers at the hosting/CDN layer
- Dependency update process
- Abuse contact and takedown flow

Run `npm run check` before each release.
