import { DeviceServiceContext, DeviceTrustResult, type Prisma } from "@prisma/client";
import { imeiIdentity } from "./device-trust-service";

export async function assertTrustCheckForWorkflow(
  tx: Prisma.TransactionClient,
  input: {
    trustCheckId: string; tenantId: string; branchId: string;
    context: DeviceServiceContext; imei: string;
  },
) {
  const check = await tx.deviceTrustCheck.findFirst({
    where: {
      id: input.trustCheckId, tenantId: input.tenantId, branchId: input.branchId,
      context: input.context, devicePresent: true,
      imeiHash: imeiIdentity(input.imei).hash,
    },
  });
  if (!check) throw new Error("Valid device trust check is required");
  if (check.blocked) throw new Error("Device operation is blocked by trust match");
  const allowed: DeviceTrustResult[] = [DeviceTrustResult.CLEAR, DeviceTrustResult.MATCH];
  if (!allowed.includes(check.result)) {
    throw new Error("Device trust check requires review");
  }
  return check;
}
