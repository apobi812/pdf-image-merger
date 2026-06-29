# Toolkit Architecture

Toolkit is a local-first static PWA with an optional serverless analytics backend.

## Product Shell

- Home route: `/`
- Ready tool routes: `/pdf/`, `/word-count/`, `/video-extractor/`
- Hidden admin route: `/admin/`
- Public documents: `/about/`, `/privacy/`, `/terms/`, `/security/`

Every public page uses the same shell:

- Left rail: brand home button, three ready tool switches, lower ad slot
- Main area: top tool message, notice band, active workspace, footer links and footer ad slot
- Right rail: per-tool settings, safety controls, and settings ad slot
- Language picker: 10 flag buttons that update `?lang=` without creating separate language HTML files

The home tool catalog intentionally contains 20 slots: 3 ready tools and 17 planned slots. Planned tools are disabled so the public UI does not advertise unusable behavior as working.

## Client Data Flow

```text
User file/text/video
  -> Browser-only validation
  -> Browser-only processing
  -> Browser-generated download or on-screen result
```

The static frontend has no endpoint that accepts original PDFs, images, text, or videos. Analytics events never include file names, file contents, browser session IDs, raw IP addresses, or raw user-agent strings.

## PDF And Image Guardrails

- PDF inputs must have a real `%PDF-` signature.
- Encrypted PDFs are blocked.
- PDFs with JavaScript, auto actions, embedded files, launch actions, rich media, submit forms, or XFA markers are blocked.
- SVG and active/vector image formats are rejected.
- Images must match allowed image signatures.
- Images are decoded and re-encoded as PNG before PDF embedding to strip source metadata.
- Per-file and total PDF/image input limits reduce browser memory exhaustion.

## Text And Video Guardrails

- Text input is capped at 1,000,000 characters.
- Video inputs are limited to common browser formats.
- Video containers are checked by header signature before decoding.
- Extracted video frames are generated locally as PNG files.

## Admin And Analytics

There are two admin modes:

- Static/local mode: `/admin/` is direct-address only, `noindex,nofollow`, protected by a local browser passcode, and stores only local aggregate counters.
- Production mode: Cloudflare Worker + D1 provides `/api/admin/login`, `/api/admin/summary`, and `/api/admin/export`.

Production analytics is opt-in. The frontend sends events only after browser-side consent, and the Worker rejects event writes without `consent: "analytics"`.

The Worker stores aggregate event rows with a daily rotating visitor hash. It does not store raw IP addresses, raw user-agent strings, file names, file contents, or session IDs.

## Ads

Ad slots are present in the left rail, right rail, and footer. They remain placeholders by default. Do not load AdSense scripts until the production domain is approved, consent requirements are reviewed, privacy text is updated, and exact CSP origins are added.

## Deployment States

### Current Static Deployment

```text
https://apobi812.github.io/pdf-image-merger/
```

This state is usable as a PWA and includes the three tools, public legal pages, hidden local admin page, SEO metadata, service worker, and offline page.

### Production Domain Deployment

Preferred shape after buying a domain:

```text
https://your-domain.com/
https://your-domain.com/pdf/
https://your-domain.com/word-count/
https://your-domain.com/video-extractor/
https://your-domain.com/api/*
```

Use `docs/LAUNCH_RUNBOOK.md` for the exact domain, Worker/D1, Search Console, and AdSense launch sequence.

## Completion Evidence

The release gate should prove these requirements before deployment:

- `npm run check` passes.
- `sqlite3 :memory: ".read worker/schema.sql"` passes.
- Home renders 20 tool cards with exactly 3 ready tools.
- The three ready tool routes render their work area and settings rail.
- Public navigation does not expose `/admin/`.
- `/admin/` is noindex and absent from `sitemap.xml`.
- All 10 languages are present in the language picker and legal document translations.
- Static ads are disabled by default and no third-party ad script is loaded.
- File safety fixture checks pass.
- Worker smoke checks reject unsafe analytics/admin requests.
