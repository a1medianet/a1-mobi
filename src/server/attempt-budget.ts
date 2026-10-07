import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";

export class AttemptBudgetExceeded extends Error {
  readonly code = "RATE_LIMITED";
  constructor() {
    super("RATE_LIMITED");
  }
}

export function authBudgetKey(scope: string, parts: readonly string[]) {
  return createHash("sha256").update(JSON.stringify([scope, ...parts])).digest("hex");
}

export async function consumeAuthBudget(key: string, limit: number) {
  const rows = await db.$queryRaw<Array<{ attempts: number }>>(Prisma.sql`
    INSERT INTO "AuthAttempt" ("key", "attempts", "windowStart") VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
    "attempts" = CASE WHEN "AuthAttempt"."windowStart" <= NOW() - INTERVAL '15 minutes'
      THEN 1 ELSE "AuthAttempt"."attempts" + 1 END,
    "windowStart" = CASE WHEN "AuthAttempt"."windowStart" <= NOW() - INTERVAL '15 minutes'
      THEN NOW() ELSE "AuthAttempt"."windowStart" END RETURNING "attempts"`);
  if (rows[0].attempts > limit) throw new AttemptBudgetExceeded();
  return rows[0].attempts;
}

export async function purgeExpiredAuthAttempts() {
  return db.$executeRaw(Prisma.sql`
    DELETE FROM "AuthAttempt"
    WHERE "windowStart" <= NOW() - INTERVAL '7 days'`);
}

export async function consumeSensitiveActionBudget(
  scope: string,
  parts: readonly string[],
  limit = 5,
) {
  await purgeExpiredAuthAttempts();
  return consumeAuthBudget(authBudgetKey(scope, parts), limit);
}
