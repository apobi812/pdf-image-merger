import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const app = readFileSync(join(root, 'app.js'), 'utf8');
const errors = [];

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']);
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp)$/i;

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function bytes(value) {
  if (Array.isArray(value)) return new Uint8Array(value);
  return new TextEncoder().encode(value);
}

function asciiBytes(prefix, length = 16) {
  const out = new Uint8Array(length);
  out.set(bytes(prefix).slice(0, length));
  return out;
}

function startsWithBytes(data, signature) {
  return signature.every((value, index) => data[index] === value);
}

function startsWithAscii(data, text) {
  return asciiAt(data, 0, text.length) === text;
}

function asciiAt(data, start, end) {
  if (data.length < end) return '';
  return String.fromCharCode(...data.slice(start, end));
}

function includesAscii(data, text) {
  const needle = [...text].map(char => char.charCodeAt(0));
  if (!needle.length || data.length < needle.length) return false;
  for (let i = 0; i <= data.length - needle.length; i += 1) {
    let matched = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (data[i + j] !== needle[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function includesAsciiInsensitive(data, text) {
  const needle = [...text].map(char => char.toLowerCase().charCodeAt(0));
  if (!needle.length || data.length < needle.length) return false;
  for (let i = 0; i <= data.length - needle.length; i += 1) {
    let matched = true;
    for (let j = 0; j < needle.length; j += 1) {
      const code = data[i + j];
      const normalized = code >= 0x41 && code <= 0x5a ? code + 0x20 : code;
      if (normalized !== needle[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function hasPdfSignature(data) {
  return startsWithAscii(data, '%PDF-');
}

function riskyMarkersFromApp() {
  const match = app.match(/const PDF_RISKY_MARKERS = \[(.*?)\];/s);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map(entry => entry[1]);
}

const pdfRiskyMarkers = riskyMarkersFromApp();

function hasRiskyPdfFeatures(data) {
  return pdfRiskyMarkers.some(marker => includesAsciiInsensitive(data, marker));
}

function detectImageKind(file, data) {
  const mime = file.type || '';
  const name = file.name || '';
  if (!ALLOWED_IMAGE_TYPES.has(mime) && !IMAGE_EXT_RE.test(name)) return null;
  if (startsWithBytes(data, [0xff, 0xd8, 0xff])) return { kind: 'jpg', mime: 'image/jpeg' };
  if (startsWithBytes(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: 'png', mime: 'image/png' };
  if (startsWithAscii(data, 'GIF87a') || startsWithAscii(data, 'GIF89a')) return { kind: 'gif', mime: 'image/gif' };
  if (startsWithAscii(data, 'BM')) return { kind: 'bmp', mime: 'image/bmp' };
  if (startsWithAscii(data, 'RIFF') && asciiAt(data, 8, 12) === 'WEBP') return { kind: 'webp', mime: 'image/webp' };
  return null;
}

function detectVideoKind(data) {
  if (startsWithAscii(data, 'OggS')) return 'ogg';
  if (startsWithBytes(data, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm';
  if (asciiAt(data, 4, 8) === 'ftyp') return 'mp4';
  return '';
}

function runPdfFixtures() {
  assert(pdfRiskyMarkers.length >= 9, 'PDF risky marker list is too small');
  for (const marker of ['/JavaScript', '/JS', '/OpenAction', '/AA', '/Launch', '/EmbeddedFile', '/SubmitForm', '/RichMedia', '/XFA']) {
    assert(pdfRiskyMarkers.includes(marker), `PDF risky marker ${marker} is missing`);
    assert(hasRiskyPdfFeatures(bytes(`%PDF-1.7\n1 0 obj\n<< ${marker} true >>\nendobj`)), `PDF marker ${marker} fixture should be blocked`);
    assert(hasRiskyPdfFeatures(bytes(`%PDF-1.7\n1 0 obj\n<< ${marker.toLowerCase()} true >>\nendobj`)), `PDF marker ${marker} lowercase fixture should be blocked`);
  }
  const plainPdf = bytes('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj');
  assert(hasPdfSignature(plainPdf), 'plain PDF fixture should have a PDF signature');
  assert(!hasRiskyPdfFeatures(plainPdf), 'plain PDF fixture should not be risky');
  assert(includesAscii(bytes('%PDF-1.7\n<< /Encrypt 4 0 R >>'), '/Encrypt'), 'encrypted PDF fixture should be detected');
  assert(!hasPdfSignature(bytes('<script>alert(1)</script>')), 'HTML disguised as PDF should fail PDF signature');
}

function runImageFixtures() {
  const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const jpg = bytes([0xff, 0xd8, 0xff, 0xe0, 0x00]);
  const gif = bytes('GIF89a');
  const bmp = bytes('BMxxxx');
  const webp = bytes('RIFFxxxxWEBPVP8 ');
  assert(detectImageKind({ name: 'safe.png', type: 'image/png' }, png)?.kind === 'png', 'PNG fixture should be allowed');
  assert(detectImageKind({ name: 'safe.jpg', type: 'image/jpeg' }, jpg)?.kind === 'jpg', 'JPG fixture should be allowed');
  assert(detectImageKind({ name: 'safe.gif', type: 'image/gif' }, gif)?.kind === 'gif', 'GIF fixture should be allowed');
  assert(detectImageKind({ name: 'safe.bmp', type: 'image/bmp' }, bmp)?.kind === 'bmp', 'BMP fixture should be allowed');
  assert(detectImageKind({ name: 'safe.webp', type: 'image/webp' }, webp)?.kind === 'webp', 'WebP fixture should be allowed');
  assert(!detectImageKind({ name: 'active.svg', type: 'image/svg+xml' }, bytes('<svg><script>alert(1)</script></svg>')), 'SVG active content should be rejected');
  assert(!detectImageKind({ name: 'fake.png', type: 'image/png' }, bytes('<script>alert(1)</script>')), 'script content disguised as image should be rejected');
  assert(!detectImageKind({ name: 'renamed.svg', type: 'image/svg+xml' }, png), 'allowed bytes with disallowed extension and MIME should be rejected');
}

function runVideoFixtures() {
  assert(detectVideoKind(asciiBytes('\0\0\0\0ftypisom')) === 'mp4', 'MP4 ftyp fixture should be allowed');
  assert(detectVideoKind(bytes('OggS\x00\x02')) === 'ogg', 'Ogg fixture should be allowed');
  assert(detectVideoKind(bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42])) === 'webm', 'WebM fixture should be allowed');
  assert(!detectVideoKind(bytes('<script>alert(1)</script>')), 'script content disguised as video should be rejected');
}

runPdfFixtures();
runImageFixtures();
runVideoFixtures();

if (errors.length) {
  console.error(`Security fixture verification failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Security fixture verification passed.');
