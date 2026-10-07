import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { consumeAuthBudget, purgeExpiredAuthAttempts } from "@/server/attempt-budget";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("authentication abuse budgets", () => {
  it("atomically limits a shared budget and removes expired counters", async () => {
    const key = "test-" + randomUUID();
    const staleKey = "stale-" + randomUUID();
    try {
      const attempts = await Promise.allSettled(
        Array.from({ length: 8 }, () => consumeAuthBudget(key, 5)),
      );
      expect(attempts.filter(x => x.status === "fulfilled")).toHaveLength(5);
      expect(attempts.filter(x => x.status === "rejected" &&
        x.reason.message === "RATE_LIMITED")).toHaveLength(3);

      await db.authAttempt.create({
        data: { key: staleKey, attempts: 1, windowStart: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
      });
      await purgeExpiredAuthAttempts();
      expect(await db.authAttempt.findUnique({ where: { key: staleKey } })).toBeNull();
    } finally {
      await db.authAttempt.deleteMany({ where: { key: { in: [key, staleKey] } } });
    }
  }, 30_000);
});
