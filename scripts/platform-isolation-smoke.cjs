// Isolated database smoke test. Requires DATABASE_URL pointing to a disposable local database.
const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('node:crypto');
const db = new PrismaClient();
async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/mobi_platform_test') throw Error('REFUSE_NON_ISOLATED_DATABASE');
  const email = `smoke-${randomBytes(6).toString('hex')}@invalid.example`;
  let adminId;
  try {
    const admin = await db.platformAdmin.create({data: {email, passwordHash: 'smoke-test-only', totpSecretCipher: 'smoke-test-only'}});
    adminId = admin.id;
    const session = await db.platformSession.create({data: {adminId, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 3600000)}});
    const first = await db.platformAdmin.updateMany({where: {id: adminId, lastTotpCounter: null}, data: {lastTotpCounter: 100}});
    const replay = await db.platformAdmin.updateMany({where: {id: adminId, lastTotpCounter: {lt: 100}}, data: {lastTotpCounter: 100}});
    const tenantCount = await db.tenant.count();
    if (!session.id || first.count !== 1 || replay.count !== 0 || tenantCount !== 0) throw Error('ASSERTION_FAILED');
    console.log('PASS: platform admin/session creation, TOTP replay counter guard, zero tenant records');
  } finally {
    if (adminId) await db.platformAdmin.delete({where: {id: adminId}});
    console.log('CLEANUP: temporary admin and cascade session removed');
  }
}
main().catch(error => { console.error('FAIL:', error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
