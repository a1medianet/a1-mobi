// One-time local bootstrap: secret input must stay in operator terminal.
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { randomBytes, createCipheriv } = require('node:crypto');
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
  const keyRaw = process.env.A1_MOBI_MFA_ENCRYPTION_KEY?.trim();
  if (!keyRaw) throw Error('MFA_KEY_NOT_CONFIGURED');
  const key = /^[a-fA-F0-9]{64}$/.test(keyRaw) ? Buffer.from(keyRaw, 'hex') : Buffer.from(keyRaw, 'base64url');
  if (key.length !== 32) throw Error('MFA_KEY_NOT_CONFIGURED');
  const password = await readSecret();
  if (password.length < 16 || password.length > 256) throw Error('PASSWORD_LENGTH_INVALID');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = randomBytes(20);
  let bits = 0, value = 0, secret = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { secret += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) secret += alphabet[(value << (5 - bits)) & 31];
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const totpSecretCipher = ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await db.platformAdmin.create({ data: { email, passwordHash, totpSecretCipher } });
  console.log('PLATFORM_ADMIN_CREATED', email);
  console.log('TOTP_SETUP_SECRET (store privately, never send in chat):', secret);
  console.log('TOTP_URI:', 'otpauth://totp/A1%20Mobi%20Platform:' + encodeURIComponent(email) + '?secret=' + secret + '&issuer=A1%20Mobi%20Platform');
})().catch(error => { console.error('BOOTSTRAP_FAILED', error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
