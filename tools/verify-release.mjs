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
const schema = read('worker/schema.sql');
const config = read('config.js');

for (const file of htmlFiles) {
  const html = read(file);
  assert(html.includes('Content-Security-Policy'), `${file}: missing CSP meta tag`);
  assert(html.includes('frame-ancestors'), `${file}: CSP missing frame-ancestors`);
  assert(html.includes('object-src'), `${file}: CSP missing object-src`);
  assert(html.includes('mobile-web-app-capable'), `${file}: missing mobile web app meta`);
  assert(html.includes('app.js?v=20260629-pwa1'), `${file}: stale app.js cache version`);
  assert(html.includes('styles.css?v=20260629-pwa1'), `${file}: stale styles.css cache version`);
}

assert(includes('admin/index.html', 'noindex,nofollow'), 'admin page must be noindex,nofollow');
assert(!includes('index.html', 'data-route="admin"'), 'public home must not link admin route');
assert(!sw.includes('./admin/index.html'), 'service worker must not precache admin page');
assert(sw.includes("const CACHE_NAME = 'toolkit-v15'"), 'service worker cache name not bumped');
assert(sw.includes("const OFFLINE_URL = './offline.html'"), 'service worker missing offline fallback');
assert(sw.includes("'./app.js?v=20260629-pwa1'"), 'service worker has stale app cache version');
assert(!sitemap.includes('/admin/'), 'sitemap must not include admin page');
assert(existsSync(join(root, '.well-known/security.txt')), 'security.txt is missing');
assert(existsSync(join(root, '_headers')), '_headers template is missing');
assert(existsSync(join(root, 'offline.html')), 'offline fallback page is missing');

assert(manifest.id === '/pdf-image-merger/', 'manifest id is missing or incorrect');
assert(manifest.display === 'standalone', 'manifest display must be standalone');
assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length === 3, 'manifest must expose 3 tool shortcuts');
assert(manifest.shortcuts.some(shortcut => shortcut.url === './pdf/?source=shortcut'), 'manifest missing PDF shortcut');
assert(manifest.shortcuts.some(shortcut => shortcut.url === './word-count/?source=shortcut'), 'manifest missing word-count shortcut');
assert(manifest.shortcuts.some(shortcut => shortcut.url === './video-extractor/?source=shortcut'), 'manifest missing video shortcut');

assert(!app.includes('ignoreEncryption'), 'PDF encryption bypass flag must not be used');
assert(app.includes("includesAscii(data, '/Encrypt')"), 'encrypted PDF guard is missing');
assert(app.includes('hasAllowedVideoSignature'), 'video signature guard is missing');
assert(!app.includes('sessionId'), 'frontend must not send sessionId to analytics');
assert(!app.includes('toolkitSession'), 'frontend session storage key must not exist');
assert(app.includes('pbkdf2-sha256'), 'local admin lock must use PBKDF2');
assert(app.includes('ADMIN_PBKDF2_ITERATIONS = 210_000'), 'local admin PBKDF2 iterations changed or missing');

assert(worker.includes('unsupported_media_type'), 'worker must reject non-JSON API writes');
assert(!worker.includes('session_id'), 'worker must not store session_id');
assert(!schema.includes('session_id'), 'D1 schema must not include session_id');
assert(config.includes("apiBaseUrl: ''"), 'default config must keep apiBaseUrl empty for static Pages');

if (errors.length) {
  console.error(`Release verification failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Release verification passed.');
