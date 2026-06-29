import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const errors = [];

const routes = [
  { file: 'index.html', route: 'home', base: false, admin: false },
  { file: 'pdf/index.html', route: 'pdf', base: true, admin: false },
  { file: 'word-count/index.html', route: 'word-count', base: true, admin: false },
  { file: 'video-extractor/index.html', route: 'video-extractor', base: true, admin: false },
  { file: 'about/index.html', route: 'about', base: true, admin: false },
  { file: 'privacy/index.html', route: 'privacy', base: true, admin: false },
  { file: 'terms/index.html', route: 'terms', base: true, admin: false },
  { file: 'security/index.html', route: 'security', base: true, admin: false },
  { file: 'admin/index.html', route: 'admin', base: true, admin: true }
];

const coreToolRoutes = ['pdf', 'word-count', 'video-extractor'];
const legalPages = ['about', 'privacy', 'terms', 'security'];
const languageCodes = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'hi', 'ar'];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

function blockBetween(value, start, end) {
  const startIndex = value.indexOf(start);
  if (startIndex === -1) return '';
  const endIndex = value.indexOf(end, startIndex);
  if (endIndex === -1) return '';
  return value.slice(startIndex, endIndex + end.length);
}

function constArrayBlock(source, name) {
  const start = source.indexOf(`const ${name} = [`);
  if (start === -1) return '';
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}

function assertSharedShell(file, html, route) {
  assert(html.includes('<div class="app-shell">'), `${file}: app shell is missing`);
  assert(html.includes('<aside class="left-rail"'), `${file}: left rail is missing`);
  assert(html.includes('<main class="main-area">'), `${file}: main work area is missing`);
  assert(html.includes('<aside class="right-rail" id="settingsPanel"'), `${file}: right settings rail is missing`);
  assert(html.includes('id="brandHome"'), `${file}: brand home button is missing`);
  assert(html.includes('id="toolEyebrow"'), `${file}: top eyebrow is missing`);
  assert(html.includes('id="toolTitle"'), `${file}: top title is missing`);
  assert(html.includes('id="toolDescription"'), `${file}: top description is missing`);
  assert(html.includes('id="languagePicker"'), `${file}: language picker is missing`);
  assert(html.includes('id="noticeBand"'), `${file}: notice band is missing`);
  assert(html.includes('id="workspace"'), `${file}: workspace is missing`);
  assert(html.includes('<footer class="site-footer">'), `${file}: footer is missing`);
  assert(html.includes('id="filenameModal"'), `${file}: save-as filename modal is missing`);
  assert(html.includes('<noscript>'), `${file}: noscript fallback is missing`);

  const nav = blockBetween(html, '<nav class="tool-nav"', '</nav>');
  assert(nav, `${file}: tool navigation block is missing`);
  for (const toolRoute of coreToolRoutes) {
    assert(nav.includes(`data-route="${toolRoute}"`), `${file}: core tool route ${toolRoute} missing from left navigation`);
  }
  assert(countMatches(nav, /data-route="/g) === coreToolRoutes.length, `${file}: left navigation should expose exactly the 3 ready tools`);
  assert(!nav.includes('data-route="admin"'), `${file}: admin route must not be exposed in left navigation`);

  const footer = blockBetween(html, '<nav class="footer-links"', '</nav>');
  assert(footer, `${file}: footer links block is missing`);
  for (const page of legalPages) {
    assert(footer.includes(`data-page="${page}"`), `${file}: footer legal link ${page} is missing`);
  }
  assert(countMatches(footer, /data-page="/g) === legalPages.length, `${file}: footer should expose exactly the 4 public document links`);

  assert(html.includes('data-ad-slot="left-rail"'), `${file}: left rail ad slot is missing`);
  assert(html.includes('data-ad-slot="footer"'), `${file}: footer ad slot is missing`);
  assert(html.includes('data-ad-provider="none"'), `${file}: static shell must keep ads disabled`);
  assert(!html.includes('pagead2.googlesyndication.com'), `${file}: static shell must not load AdSense scripts`);

  if (route !== 'home') assert(html.includes('<base href="../">'), `${file}: nested route needs base href`);
}

for (const { file, route, admin } of routes) {
  const html = read(file);
  assertSharedShell(file, html, route);
  assert(admin === html.includes('name="robots" content="noindex,nofollow"'), `${file}: only admin should be noindex,nofollow`);
}

const app = read('app.js');
const css = read('styles.css');
const packageJson = JSON.parse(read('package.json'));

const toolCatalog = constArrayBlock(app, 'toolCatalog');
assert(toolCatalog, 'app.js: tool catalog is missing');
assert(countMatches(toolCatalog, /\{\s*key:/g) === 20, 'app.js: home catalog should contain 20 tool slots');
assert(countMatches(toolCatalog, /status:\s*'ready'/g) === 3, 'app.js: exactly 3 tools should be ready');
assert(countMatches(toolCatalog, /status:\s*'planned'/g) === 17, 'app.js: planned tool count should leave room for expansion');
for (const toolRoute of coreToolRoutes) {
  assert(toolCatalog.includes(`route: '${toolRoute}'`), `app.js: ready tool route ${toolRoute} missing from catalog`);
  const routePathPattern = new RegExp(`['"]?${toolRoute}['"]?:\\s*'${toolRoute}/'`);
  assert(routePathPattern.test(app), `app.js: route path ${toolRoute}/ is missing`);
}

const languages = constArrayBlock(app, 'languages');
assert(languages, 'app.js: language picker definition is missing');
const foundLanguages = [...languages.matchAll(/\['([a-z]{2})',/g)].map(match => match[1]);
assert(foundLanguages.length === 10, 'app.js: language picker should contain 10 languages');
for (const code of languageCodes) {
  assert(foundLanguages.includes(code), `app.js: language ${code} is missing from picker`);
  assert(app.includes(`${code}: {`) || app.includes(`${code}: fallback`), `app.js: translation bucket for ${code} is missing`);
}
assert(app.includes("document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr'"), 'app.js: RTL handling for Arabic is missing');

assert(app.includes('function renderHomePage()'), 'app.js: home page renderer is missing');
assert(app.includes('function renderPdfTool()'), 'app.js: PDF tool renderer is missing');
assert(app.includes('function renderWordTool()'), 'app.js: word-count tool renderer is missing');
assert(app.includes('function renderVideoTool()'), 'app.js: video extractor renderer is missing');
assert(app.includes('async function renderAdminPage()'), 'app.js: admin page renderer is missing');
assert(app.includes("const ADMIN_UNLOCK_KEY = 'toolkitAdminUnlocked.v1'"), 'app.js: local admin unlock key is missing');
assert(app.includes('const ADMIN_UNLOCK_MS = 30 * 60 * 1000'), 'app.js: local admin unlock timeout is missing');
assert(app.includes('function hasLocalAdminUnlock('), 'app.js: local admin unlock expiry helper is missing');
assert(app.includes('id="lockLocalAdmin"'), 'app.js: local admin manual lock button is missing');
assert(app.includes('function renderLegalPage(page)'), 'app.js: legal page renderer is missing');
assert(countMatches(app, /renderAdSlot\('settingsRail', '300x250'\)/g) >= 5, 'app.js: right rail ad/settings placeholders are missing');
assert(app.includes("if (state.route === 'admin') return;"), 'app.js: admin route must not send analytics events');

assert(css.includes('grid-template-columns: 220px minmax(0, 1fr) 280px;'), 'styles.css: desktop left/main/right layout is missing');
assert(css.includes('grid-template-rows: auto 2fr 1fr;'), 'styles.css: left rail should reserve the lower third for ads');
assert(css.includes('.left-rail, .right-rail { position: static; height: auto; border: 0; }'), 'styles.css: mobile rail stacking is missing');
assert(css.includes('.rail-ad { align-self: stretch; min-height: 180px; }'), 'styles.css: desktop rail ad sizing is missing');

assert(packageJson.scripts?.check?.includes('node tools/verify-ui-shell.mjs'), 'package.json: npm run check must include UI shell verification');

if (errors.length) {
  console.error(`UI shell verification failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('UI shell verification passed.');
