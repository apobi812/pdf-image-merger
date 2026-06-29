import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const errors = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const runbookPath = join(root, 'docs/LAUNCH_RUNBOOK.md');
const operationsPath = join(root, 'docs/OPERATIONS.md');
const readmePath = join(root, 'README.md');

assert(existsSync(runbookPath), 'docs/LAUNCH_RUNBOOK.md is missing');
assert(existsSync(operationsPath), 'docs/OPERATIONS.md is missing');

const runbook = existsSync(runbookPath) ? read('docs/LAUNCH_RUNBOOK.md') : '';
const operations = existsSync(operationsPath) ? read('docs/OPERATIONS.md') : '';
const readme = existsSync(readmePath) ? read('README.md') : '';

for (const heading of [
  '## Current Stable Deployment',
  '## Phase 1: Before Buying Or Connecting A Domain',
  '## Phase 2: Custom Domain',
  '## Phase 3: Worker And D1 Analytics',
  '## Phase 4: AdSense',
  '## Phase 5: Post-Launch Monitoring',
  '## Emergency Rollback'
]) {
  assert(runbook.includes(heading), `launch runbook missing section: ${heading}`);
}

for (const requiredText of [
  "siteOrigin: 'https://apobi812.github.io'",
  "basePath: '/pdf-image-merger/'",
  "siteOrigin: 'https://your-domain.com'",
  "basePath: '/'",
  "apiBaseUrl: '/api'",
  'npm run metadata',
  'npm run check',
  'sqlite3 :memory: ".read worker/schema.sql"',
  'Search Console',
  'AdSense',
  'ads.txt',
  'ALLOWED_ORIGINS',
  'wrangler secret put',
  'Do not use wildcard',
  'apiBaseUrl: \'\'',
  'Disable remote integrations'
]) {
  assert(runbook.includes(requiredText), `launch runbook missing required text: ${requiredText}`);
}

assert(operations.includes('docs/LAUNCH_RUNBOOK.md') || readme.includes('docs/LAUNCH_RUNBOOK.md'), 'README or operations docs must link the launch runbook');
assert(!runbook.includes('ca-pub-1234567890123456'), 'launch runbook must not include fake AdSense publisher IDs');
assert(!runbook.includes('replace-with-real-password'), 'launch runbook must not include placeholder passwords');

if (errors.length) {
  console.error(`Launch docs verification failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Launch docs verification passed.');
