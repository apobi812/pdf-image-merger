import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlFiles = [
  'index.html',
  'pdf/index.html',
  'word-count/index.html',
  'video-extractor/index.html',
  'about/index.html',
  'privacy/index.html',
  'terms/index.html',
  'security/index.html',
  'admin/index.html'
];

const errors = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function includes(path, needle) {
  return read(path).includes(needle);
}

const app = read('app.js');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.webmanifest'));
const sitemap = read('sitemap.xml');
const worker = read('worker/src/index.js');
const workerHashScript = read('worker/generate-admin-secret.mjs');
const schema = read('worker/schema.sql');
const config = read('config.js');
const headers = read('_headers');
const packageJson = JSON.parse(read('package.json'));

for (const file of htmlFiles) {
  const html = read(file);
  assert(html.includes('Content-Security-Policy'), `${file}: missing CSP meta tag`);
  assert(!html.includes('frame-ancestors'), `${file}: frame-ancestors must be an HTTP header, not meta CSP`);
  assert(html.includes('object-src'), `${file}: CSP missing object-src`);
  assert(html.includes('mobile-web-app-capable'), `${file}: missing mobile web app meta`);
  assert(html.includes('app.js?v=20260629-adcfg'), `${file}: stale app.js cache version`);
  assert(html.includes('styles.css?v=20260629-adcfg'), `${file}: stale styles.css cache version`);
  assert(html.includes('data-ad-slot="left-rail"'), `${file}: left rail ad placeholder is missing`);
  assert(html.includes('data-ad-slot="footer"'), `${file}: footer ad placeholder is missing`);
  assert(html.includes('data-ad-provider="none"'), `${file}: ads must stay disabled by default`);
}

assert(includes('admin/index.html', 'noindex,nofollow'), 'admin page must be noindex,nofollow');
assert(!includes('index.html', 'data-route="admin"'), 'public home must not link admin route');
assert(!sw.includes('./admin/index.html'), 'service worker must not precache admin page');
assert(sw.includes("const CACHE_NAME = 'toolkit-v27'"), 'service worker cache name not bumped');
assert(sw.includes("const OFFLINE_URL = './offline.html'"), 'service worker missing offline fallback');
assert(sw.includes("'./app.js?v=20260629-adcfg'"), 'service worker has stale app cache version');
assert(app.includes("./sw.js?v=20260629-adcfg"), 'app registers a stale service worker cache version');
assert(!sitemap.includes('/admin/'), 'sitemap must not include admin page');
assert(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), 'sitemap must include xhtml namespace for hreflang');
for (const lang of ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'hi', 'ar', 'x-default']) {
  assert(sitemap.includes(`hreflang="${lang}"`), `sitemap missing hreflang=${lang}`);
}
assert(sitemap.includes('/pdf/?lang=en'), 'sitemap missing PDF English alternate');
assert(sitemap.includes('/video-extractor/?lang=ar'), 'sitemap missing video Arabic alternate');
assert(existsSync(join(root, '.well-known/security.txt')), 'security.txt is missing');
assert(existsSync(join(root, '_headers')), '_headers template is missing');
assert(existsSync(join(root, 'offline.html')), 'offline fallback page is missing');
assert(existsSync(join(root, 'tools/generate-metadata.mjs')), 'metadata generator is missing');
assert(headers.includes("frame-ancestors 'none'"), '_headers must include frame-ancestors');
assert(headers.includes('X-Frame-Options: DENY'), '_headers must include X-Frame-Options');
assert(packageJson.scripts?.metadata === 'node tools/generate-metadata.mjs', 'metadata generation script is missing');
assert(packageJson.scripts?.['metadata:check'] === 'node tools/generate-metadata.mjs --check', 'metadata check script is missing');
assert(packageJson.scripts?.check?.includes('node tools/generate-metadata.mjs --check'), 'release check must verify generated metadata');

assert(manifest.id === '/pdf-image-merger/', 'manifest id is missing or incorrect');
assert(manifest.display === 'standalone', 'manifest display must be standalone');
assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length === 3, 'manifest must expose 3 tool shortcuts');
assert(manifest.shortcuts.some(shortcut => shortcut.url === './pdf/?source=shortcut'), 'manifest missing PDF shortcut');
assert(manifest.shortcuts.some(shortcut => shortcut.url === './word-count/?source=shortcut'), 'manifest missing word-count shortcut');
assert(manifest.shortcuts.some(shortcut => shortcut.url === './video-extractor/?source=shortcut'), 'manifest missing video shortcut');

assert(!app.includes('ignoreEncryption'), 'PDF encryption bypass flag must not be used');
assert(app.includes("includesAscii(data, '/Encrypt')"), 'encrypted PDF guard is missing');
assert(app.includes('PDF_RISKY_MARKERS'), 'risky PDF marker list is missing');
assert(app.includes('hasRiskyPdfFeatures(data)'), 'risky PDF feature guard is missing');
assert(app.includes('unsafePdfBlocked'), 'unsafe PDF warning message is missing');
assert(app.includes('isExpectedFileRejection(error)'), 'expected file rejections should not be logged as console errors');
assert(app.includes('MAX_TOTAL_PDF_INPUT_SIZE = 500 * 1024 * 1024'), 'PDF/image total input-size cap is missing or changed');
assert(app.includes('currentPdfInputBytes() + file.size > MAX_TOTAL_PDF_INPUT_SIZE'), 'PDF/image total input-size enforcement is missing');
assert(app.includes('MAX_TEXT_CHARS = 1_000_000'), 'word-counter text cap is missing or changed');
assert(app.includes('normalizeWordText(e.target.value)'), 'word-counter text cap enforcement is missing');
assert(app.includes('guardImageMetadata'), 'image metadata stripping guardrail is missing from UI');
assert(app.includes('stripImageMetadataToPngBytes(info)'), 'images must be re-encoded before PDF embedding');
assert(!app.includes('imageData = isJpg || isPng ? original'), 'original JPG/PNG bytes must not be embedded directly');
assert(app.includes('hasAllowedVideoSignature'), 'video signature guard is missing');
assert(app.includes('window.top !== window.self'), 'JavaScript frame guard is missing');
assert(app.includes("const CONSENT_KEY = 'toolkitConsent.v1'"), 'analytics consent storage key is missing');
assert(app.includes('hasAnalyticsConsent()'), 'analytics consent gate is missing');
assert(app.includes("consent: 'analytics'"), 'analytics payload consent marker is missing');
assert(app.includes('renderConsentBanner()'), 'analytics consent banner is missing');
assert(app.includes('privacyControlsHtml()'), 'privacy page consent controls are missing');
assert(app.includes("if (state.route === 'admin') return;"), 'admin page must not send remote analytics events');
assert(app.includes('readUrlLang()'), 'URL language reader is missing');
assert(app.includes('languageQuery()'), 'shareable language URL helper is missing');
assert(app.includes('setLanguage(button.dataset.lang)'), 'language picker must update URL state');
assert(app.includes('normalizeBasePath(CONFIG.basePath)'), 'runtime basePath config support is missing');
assert(app.includes('normalizeSiteOrigin(CONFIG.siteOrigin)'), 'runtime siteOrigin config support is missing');
assert(app.includes('resolveRuntimeBasePath(CONFIG_BASE_PATH)'), 'runtime asset base path resolver is missing');
assert(app.includes('SITE_ROOT_URL'), 'runtime site root URL helper is missing');
assert(app.includes('normalizeAdsConfig(CONFIG.ads)'), 'runtime ad config support is missing');
assert(app.includes('renderAdSlot('), 'ad slot renderer is missing');
assert(app.includes('hasConfiguredAdSlot('), 'ad slot validation is missing');
assert(!app.includes('https://apobi812.github.io/pdf-image-merger/'), 'runtime canonical URL must come from config, not a hard-coded GitHub Pages URL');
assert(app.includes('updateAlternateLanguageLinks()'), 'runtime hreflang alternate updater is missing');
assert(app.includes('link.hreflang = code'), 'runtime hreflang code assignment is missing');
assert(app.includes("fallback.hreflang = 'x-default'"), 'runtime x-default hreflang link is missing');
assert(!app.includes('sessionId'), 'frontend must not send sessionId to analytics');
assert(!app.includes('toolkitSession'), 'frontend session storage key must not exist');
assert(app.includes('pbkdf2-sha256'), 'local admin lock must use PBKDF2');
assert(app.includes('ADMIN_PBKDF2_ITERATIONS = 210_000'), 'local admin PBKDF2 iterations changed or missing');

assert(worker.includes('unsupported_media_type'), 'worker must reject non-JSON API writes');
assert(worker.includes('analytics_consent_required'), 'worker must reject analytics writes without consent');
assert(worker.includes("body.consent !== 'analytics'"), 'worker consent marker check is missing');
assert(worker.includes('ALLOWED_EVENTS'), 'worker analytics event allowlist is missing');
assert(worker.includes('ALLOWED_TOOLS'), 'worker analytics tool allowlist is missing');
assert(worker.includes('ALLOWED_ROUTES'), 'worker analytics route allowlist is missing');
assert(worker.includes('ALLOWED_LANGS'), 'worker analytics language allowlist is missing');
assert(worker.includes('validateAnalyticsEvent(body)'), 'worker analytics payload validation is missing');
assert(worker.includes("throw new HttpError(400, 'invalid_event')"), 'worker invalid event rejection is missing');
assert(worker.includes("DEFAULT_ADMIN_PASSWORD_KDF = 'pbkdf2-sha256'"), 'worker admin KDF default must be PBKDF2');
assert(worker.includes('DEFAULT_ADMIN_PASSWORD_ITERATIONS = 210_000'), 'worker admin KDF iterations changed or missing');
assert(worker.includes('pbkdf2Sha256(password, salt, adminPasswordIterations(env))'), 'worker admin PBKDF2 verification is missing');
assert(workerHashScript.includes("const KDF = 'pbkdf2-sha256'"), 'worker admin hash script must use PBKDF2');
assert(workerHashScript.includes('DEFAULT_ITERATIONS = 210_000'), 'worker admin hash script iterations changed or missing');
assert(!worker.includes('session_id'), 'worker must not store session_id');
assert(!schema.includes('session_id'), 'D1 schema must not include session_id');
assert(config.includes("siteOrigin: 'https://apobi812.github.io'"), 'default siteOrigin config is missing');
assert(config.includes("basePath: '/pdf-image-merger/'"), 'default basePath config is missing');
assert(config.includes("apiBaseUrl: ''"), 'default config must keep apiBaseUrl empty for static Pages');
assert(config.includes("provider: ''"), 'default ad provider must stay disabled');
assert(config.includes("client: ''"), 'default ad client must stay empty');
assert(config.includes("leftRail: ''"), 'default left rail ad slot must stay empty');
assert(config.includes("settingsRail: ''"), 'default settings ad slot must stay empty');
assert(config.includes("footer: ''"), 'default footer ad slot must stay empty');
assert(!app.includes('pagead2.googlesyndication.com'), 'default app must not load AdSense scripts');
assert(!config.includes('ca-pub-1234567890123456') || config.includes('// ads:'), 'sample AdSense client must remain commented');

if (errors.length) {
  console.error(`Release verification failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Release verification passed.');
