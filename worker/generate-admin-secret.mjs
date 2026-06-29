import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { stdin, stdout, stderr, env, exit } from 'node:process';

const KDF = 'pbkdf2-sha256';
const DEFAULT_ITERATIONS = 210_000;
const MIN_PASSWORD_LENGTH = 14;

const iterations = readIterations();
const password = await readPassword();

if (password.length < MIN_PASSWORD_LENGTH) {
  stderr.write(`Admin password must be at least ${MIN_PASSWORD_LENGTH} characters.\n`);
  exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');

stdout.write([
  `ADMIN_PASSWORD_KDF=${KDF}`,
  `ADMIN_PASSWORD_ITERATIONS=${iterations}`,
  `ADMIN_PASSWORD_SALT=${salt}`,
  `ADMIN_PASSWORD_HASH=${hash}`,
  '',
  'Store these with:',
  'npx wrangler secret put ADMIN_PASSWORD_KDF',
  'npx wrangler secret put ADMIN_PASSWORD_ITERATIONS',
  'npx wrangler secret put ADMIN_PASSWORD_SALT',
  'npx wrangler secret put ADMIN_PASSWORD_HASH',
  ''
].join('\n'));

async function readPassword() {
  if (env.ADMIN_PASSWORD) return env.ADMIN_PASSWORD;
  if (!stdin.isTTY) {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8').trim();
  }

  stderr.write('Set ADMIN_PASSWORD or pipe the password through stdin.\n');
  stderr.write('Example: read -s ADMIN_PASSWORD; export ADMIN_PASSWORD; node worker/generate-admin-secret.mjs\n');
  exit(1);
}

function readIterations() {
  const value = Number(env.ADMIN_PASSWORD_ITERATIONS || DEFAULT_ITERATIONS);
  return Number.isFinite(value) && value >= DEFAULT_ITERATIONS
    ? Math.floor(value)
    : DEFAULT_ITERATIONS;
}
