// One-time local bootstrap: secret input must stay in operator terminal.
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { randomBytes, createCipheriv, createHmac, timingSafeEqual } = require('node:crypto');
const db = new PrismaClient();
async function readSecret(label = 'New platform admin password (hidden): ') {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) throw Error('INTERACTIVE_TERMINAL_REQUIRED');
  process.stdout.write(label);
  return new Promise((resolve, reject) => {
    let secret = '';
    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.removeListener('end', onEnd);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    const onEnd = () => { cleanup(); reject(Error('INPUT_CLOSED')); };
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(secret);
          return;
        }
        if (char === '\u0003') { cleanup(); reject(Error('CANCELLED')); return; }
        if (char === '\u007f' || char === '\b') { secret = secret.slice(0, -1); continue; }
        if (secret.length < 256) secret += char;
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.on('data', onData);
    process.stdin.once('end', onEnd);
    process.stdin.resume();
  });
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
  // Display enrollment only in the operator's own terminal, never through remote capture.
  console.log('TOTP_SETUP_SECRET (private terminal only):', secret);
  console.log('TOTP_URI:', 'otpauth://totp/A1%20Mobi%20Platform:' + encodeURIComponent(email) + '?secret=' + secret + '&issuer=A1%20Mobi%20Platform');
  const verifyCode = (value) => {
    if (!/^[0-9]{6}$/.test(value)) return false;
    const base = Math.floor(Date.now() / 30000);
    return [-1, 0, 1].some(delta => {
      const counter = Buffer.alloc(8);
      counter.writeBigUInt64BE(BigInt(base + delta));
      const mac = createHmac('sha1', bytes).update(counter).digest();
      const off = mac[19] & 15;
      const digits = (((mac[off] & 127) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3]) % 1000000;
      return timingSafeEqual(Buffer.from(value), Buffer.from(String(digits).padStart(6, '0')));
    });
  };
  const confirmed = await readSecret('Enter current authenticator 6-digit code (hidden): ');
  if (!verifyCode(confirmed)) throw Error('TOTP_ENROLLMENT_NOT_VERIFIED');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const totpSecretCipher = ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await db.platformAdmin.create({ data: { email, passwordHash, totpSecretCipher } });
  console.log('PLATFORM_ADMIN_CREATED', email);
  console.log('ENROLLMENT_CONFIRMED; use the authenticator app for sign-in.');
})().catch(error => { console.error('BOOTSTRAP_FAILED', error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
