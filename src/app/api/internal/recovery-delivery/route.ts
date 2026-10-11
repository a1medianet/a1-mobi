import { createHash, timingSafeEqual } from "node:crypto";
import { sendRecoveryMail, validateRecoveryMail } from "@/server/recovery-mail";

export const runtime = "nodejs";
const MAX_BYTES = 8192;
const reply = (status: number) => Response.json({ accepted: status === 200 }, {
  status, headers: { "Cache-Control": "no-store" },
});

export async function POST(request: Request) {
  const secret = process.env.A1_MOBI_RECOVERY_WEBHOOK_SECRET?.trim();
  if (!secret) return reply(503);
  const authorization = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) return reply(401);
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) return reply(415);
  if (Number(request.headers.get("content-length")) > MAX_BYTES) return reply(413);
  let input: ReturnType<typeof validateRecoveryMail>;
  try {
    if (!request.body) return reply(400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return reply(413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    input = validateRecoveryMail(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return reply(400);
  }
  try {
    await sendRecoveryMail(input);
    return reply(200);
  } catch {
    return reply(503);
  }
}
