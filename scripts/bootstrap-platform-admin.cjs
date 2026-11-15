// One-time local operator bootstrap. Never accept passwords via command-line arguments.
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const db = new PrismaClient();
async function readSecret() {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) throw Error('INTERACTIVE_TERMINAL_REQUIRED');
  process.stdout.write('New platform admin password (hidden): ');
  process.stdin.setRawMode(true); process.stdin.resume();
  let secret = '';
  try {
    for await (const chunk of process.stdin) {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') { process.stdout.write('\n'); return secret; }
        if (char === '\u0003') throw Error('CANCELLED');
        if (char === '\u007f' || char === '\b') { secret = secret.slice(0, -1); continue; }
        if (secret.length < 256) secret += char;
      }
    }
  } finally { process.stdin.setRawMode(false); process.stdin.pause(); }
  throw Error('INPUT_CLOSED');
}
(async () => {
  const email = 'admin@a1mobi.app';
  if (await db.platformAdmin.findUnique({ where: { email } })) throw Error('ALREADY_PROVISIONED');
  const password = await readSecret();
  if (password.length < 16 || password.length > 256) throw Error('PASSWORD_LENGTH_INVALID');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await db.platformAdmin.create({ data: { email, passwordHash } });
  console.log('PLATFORM_ADMIN_CREATED', email);
})().catch(error => { console.error('BOOTSTRAP_FAILED', error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
