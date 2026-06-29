import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const checkOnly = process.argv.includes('--check');
const lastmod = '2026-06-29';

const languages = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'hi', 'ar'];
const defaultLang = 'ko';
const routes = [
  { file: 'index.html', path: '', priority: '1.0', sitemap: true },
  { file: 'pdf/index.html', path: 'pdf/', priority: '0.9', sitemap: true },
  { file: 'word-count/index.html', path: 'word-count/', priority: '0.9', sitemap: true },
  { file: 'video-extractor/index.html', path: 'video-extractor/', priority: '0.9', sitemap: true },
  { file: 'about/index.html', path: 'about/', priority: '0.4', sitemap: true },
  { file: 'privacy/index.html', path: 'privacy/', priority: '0.3', sitemap: true },
  { file: 'terms/index.html', path: 'terms/', priority: '0.3', sitemap: true },
  { file: 'security/index.html', path: 'security/', priority: '0.3', sitemap: true },
  { file: 'admin/index.html', path: 'admin/', priority: '0.0', sitemap: false }
];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function write(path, content) {
  writeFileSync(join(root, path), content);
}

function configValue(config, key) {
  const matches = [...config.matchAll(new RegExp(`${key}:\\s*(['"])(.*?)\\1`, 'g'))];
  const match = matches.at(-1);
  return match ? match[2] : '';
}

function normalizeBasePath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '/';
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeOrigin(value) {
  const raw = String(value || '').trim().replace(/\/+$/g, '');
  if (!raw) throw new Error('config.js siteOrigin is required');
  return new URL(raw).origin;
}

function languageQuery(lang) {
  return lang === defaultLang ? '' : `?lang=${encodeURIComponent(lang)}`;
}

function siteUrl(siteRoot, routePath, lang = defaultLang) {
  return `${siteRoot}${routePath}${languageQuery(lang)}`;
}

function buildSitemap(siteRoot) {
  const entries = routes.filter(route => route.sitemap).map(route => {
    const alternates = languages
      .map(lang => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${siteUrl(siteRoot, route.path, lang)}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl(siteRoot, route.path, defaultLang)}"/>`)
      .join('\n');
    return [
      '  <url>',
      `    <loc>${siteUrl(siteRoot, route.path)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <priority>${route.priority}</priority>`,
      alternates,
      '  </url>'
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries,
    '</urlset>',
    ''
  ].join('\n');
}

function buildRobots(siteRoot) {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteRoot}sitemap.xml`,
    ''
  ].join('\n');
}

function updateCanonical(html, href) {
  const next = `<link rel="canonical" href="${href}">`;
  if (html.includes('<link rel="canonical"')) {
    return html.replace(/<link rel="canonical" href="[^"]*">/, next);
  }
  return html.replace('</head>', `${next}\n</head>`);
}

function ensureFile(path, expected, changed) {
  const current = read(path);
  if (current === expected) return;
  changed.push(path);
  if (!checkOnly) write(path, expected);
}

const config = read('config.js');
const siteOrigin = normalizeOrigin(configValue(config, 'siteOrigin'));
const basePath = normalizeBasePath(configValue(config, 'basePath'));
const siteRoot = `${siteOrigin}${basePath}`;
const changed = [];

ensureFile('sitemap.xml', buildSitemap(siteRoot), changed);
ensureFile('robots.txt', buildRobots(siteRoot), changed);

for (const route of routes) {
  const current = read(route.file);
  const expected = updateCanonical(current, siteUrl(siteRoot, route.path));
  ensureFile(route.file, expected, changed);
}

if (changed.length) {
  if (checkOnly) {
    console.error(`Metadata is out of sync: ${changed.join(', ')}`);
    process.exit(1);
  }
  console.log(`Metadata updated: ${changed.join(', ')}`);
} else {
  console.log('Metadata is in sync.');
}
