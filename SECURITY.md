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

## Limits

The local admin passcode is not a production authentication boundary. Anyone with browser/storage access or source access can bypass it. Use it only for local aggregate visibility.

For production-grade administration, add a server-side identity layer such as Cloudflare Access, GitHub OAuth, Supabase Auth, Firebase Auth, or a custom backend.

## Recommended Production Additions

- Server-side admin auth
- Privacy-safe event ingestion endpoint
- Rate limiting
- Consent management for ads and analytics
- Security headers at the hosting/CDN layer
- Dependency update process
- Abuse contact and takedown flow
