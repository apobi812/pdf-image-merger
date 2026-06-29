# Security Notes

This project is a static, client-side PWA. It is designed so user files are processed locally in the browser.

## Current Controls

- Content Security Policy in `index.html`
- No third-party runtime scripts
- Local `pdf.js` and `pdf-lib` vendor files
- File type and size checks before processing
- PDF and image magic-byte checks before previewing or merging
- SVG and other active/vector image formats are rejected for PDF merging
- Large decoded image dimensions are rejected before canvas conversion
- Video uploads are limited to common browser formats: MP4, MOV, WebM, and OGG
- No file-name or file-content analytics
- Local-only admin dashboard with a browser passcode
- Admin UI is not linked from the public navigation; `/admin/` is direct-address only
- Optional Cloudflare Worker + D1 backend for server-side admin auth and aggregate analytics
- Server analytics stores daily visitor hashes, not raw IP addresses

## Limits

The local admin passcode is not a production authentication boundary. Anyone with browser/storage access or source access can bypass it. Use it only for local aggregate visibility.

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
