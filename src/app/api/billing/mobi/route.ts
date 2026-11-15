import { z } from "zod";
import { authJson, sameOriginMutation } from "@/server/auth-http";
import { requireBillingOwner } from "@/server/mobi-billing-owner";
import { createMobiCheckout, getMobiEntitlements, startMobiTrial } from "@/server/billing-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("START_TRIAL") }).strict(),
  z.object({
    action: z.literal("CHECKOUT"),
    planCode: z.enum(["mobi-monthly", "mobi-annual"]),
  }).strict(),
]);

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "SERVICE_UNAVAILABLE";
  if (code === "AUTH_REQUIRED") return authJson({ error: code }, 401);
  if (code === "PERMISSION_DENIED") return authJson({ error: code }, 403);
  if (code === "SUBSCRIPTION_EXISTS") return authJson({ error: code }, 409);
  if (["A1_BILLING_NOT_CONFIGURED", "CHECKOUT_RETURN_NOT_CONFIGURED",
       "CHECKOUT_URL_INVALID", "A1_BILLING_UNAVAILABLE"].includes(code))
    return authJson({ error: code }, 503);
  return authJson({ error: "SERVICE_UNAVAILABLE" }, 503);
}

export async function GET() {
  try {
    const owner = await requireBillingOwner();
    const entitlement = await getMobiEntitlements(owner.billingTenantKey);
    return authJson({ entitlement });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authJson({ error: "INVALID_ORIGIN" }, 403);
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return authJson({ error: "INVALID_REQUEST" }, 400);
  try {
    const owner = await requireBillingOwner();
    if (parsed.data.action === "START_TRIAL") {
      const entitlement = await startMobiTrial(owner.billingTenantKey);
      return authJson({ entitlement }, 201);
    }
    const origin = process.env.APP_ORIGIN;
    if (!origin || !/^https?:\/\//.test(origin)) throw new Error("CHECKOUT_RETURN_NOT_CONFIGURED");
    const returnUrl = new URL(origin);
    const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ar";
    returnUrl.pathname = "/" + locale + "/account";
    returnUrl.search = "?billing=return";
    returnUrl.hash = "";
    const checkout = await createMobiCheckout({
      tenantId: owner.billingTenantKey,
      planCode: parsed.data.planCode,
      email: owner.email,
      returnUrl: returnUrl.toString(),
    });
    return authJson(checkout, 201);
  } catch (error) { return failure(error); }
}
