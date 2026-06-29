import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const app = readFileSync(join(root, 'app.js'), 'utf8');
const errors = [];

const languages = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'hi', 'ar'];
const translatedLegalLanguages = languages.filter(code => code !== 'ko');
const pages = ['about', 'privacy', 'terms', 'security'];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function objectBlock(source, declaration) {
  const start = source.indexOf(declaration);
  if (start === -1) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}

const languagesBlock = objectBlock(app, 'const localized =');
const legalBlock = objectBlock(app, 'const legalTranslations =');
const legalMetaBlock = objectBlock(app, 'const legalMetaTranslations =');

assert(app.includes('const languages = ['), 'language picker definition is missing');
for (const code of languages) {
  assert(app.includes(`['${code}',`), `language picker missing ${code}`);
  assert(legalMetaBlock.includes(`${code}: {`), `legal metadata translation missing ${code}`);
}

assert(legalBlock, 'legalTranslations object is missing');
assert(app.includes('legalTranslations[state.lang]'), 'legal page renderer must select translated legal content');
assert(app.includes('legalMetaContent()'), 'legal page renderer must localize legal contact metadata');
assert(app.includes("state.lang !== DEFAULT_LANG"), 'Korean legal fallback branch is missing');

for (const code of translatedLegalLanguages) {
  assert(languagesBlock.includes(`${code}:`) || code === 'en', `UI translation bucket missing ${code}`);
  assert(legalBlock.includes(`${code}: {`), `legal translation missing ${code}`);
  const langStart = legalBlock.indexOf(`${code}: {`);
  const nextStarts = translatedLegalLanguages
    .map(other => legalBlock.indexOf(`${other}: {`, langStart + 1))
    .filter(index => index > langStart);
  const langEnd = nextStarts.length ? Math.min(...nextStarts) : legalBlock.length;
  const slice = legalBlock.slice(langStart, langEnd);
  for (const page of pages) {
    assert(slice.includes(`${page}: {`), `legal translation ${code} missing page ${page}`);
  }
  assert((slice.match(/sections:\s*\[/g) || []).length >= pages.length, `legal translation ${code} should define sections for every legal page`);
}

for (const koreanText of ['소개', '개인정보처리방침', '이용약관', '보안']) {
  assert(app.includes(`title: '${koreanText}'`), `Korean legal fallback missing ${koreanText}`);
}

if (errors.length) {
  console.error(`I18n verification failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('I18n verification passed.');
