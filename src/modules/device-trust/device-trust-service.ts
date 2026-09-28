import { createHash } from "node:crypto";
import {
  DeviceIncidentStatus, DeviceIncidentVisibility, DeviceServiceContext,
  DeviceTrustResult,
} from "@prisma/client";
import { db } from "@/server/db";
import { isValidImei, normalizeImei } from "@/modules/devices/imei";

const terminal: DeviceIncidentStatus[] = [DeviceIncidentStatus.RETURNED, DeviceIncidentStatus.CLOSED];
const blocking: DeviceIncidentStatus[] = [
  DeviceIncidentStatus.REPORTED_LOST, DeviceIncidentStatus.REPORTED_STOLEN,
  DeviceIncidentStatus.VERIFIED_OWNER, DeviceIncidentStatus.POLICE_REPORT_VERIFIED,
];

function imeiIdentity(raw: string) {
  const imei = normalizeImei(raw);
  if (!isValidImei(imei)) throw new Error("Invalid IMEI");
  return {
    hash: createHash("sha256").update(imei).digest("hex"),
    last4: imei.slice(-4),
  };
}
export async function reportDeviceIncident(input: {
  tenantId: string; reporterId: string; imei: string; status: DeviceIncidentStatus;
  visibility?: DeviceIncidentVisibility; evidenceReference?: string; policeReference?: string;
}) {
  const identity = imeiIdentity(input.imei);
  const report = await db.deviceIncidentReport.create({ data: {
    tenantId: input.tenantId, reporterId: input.reporterId,
    imeiHash: identity.hash, imeiLast4: identity.last4, status: input.status,
    visibility: input.visibility ?? DeviceIncidentVisibility.STORE_ONLY,
    evidenceReference: input.evidenceReference, policeReference: input.policeReference,
  } });
  await db.auditEvent.create({ data: {
    tenantId: input.tenantId, actorId: input.reporterId,
    action: "device-trust.incident.reported", entityType: "DeviceIncidentReport",
    entityId: report.id, after: { status: report.status, imeiLast4: report.imeiLast4 },
  } });
  return report;
}
export async function checkDeviceTrust(input: {
  tenantId: string; branchId: string; actorId: string; context: DeviceServiceContext;
  devicePresent: boolean; imei?: string; referenceType?: string; referenceId?: string;
}) {
  if (!input.devicePresent) {
    return db.deviceTrustCheck.create({ data: {
      tenantId: input.tenantId, branchId: input.branchId, actorId: input.actorId,
      context: input.context, devicePresent: false, result: DeviceTrustResult.NOT_PRESENT,
      referenceType: input.referenceType, referenceId: input.referenceId,
    } });
  }
  if (!input.imei) throw new Error("IMEI trust check required for a present device");
  const identity = imeiIdentity(input.imei);
  const match = await db.deviceIncidentReport.findFirst({
    where: {
      imeiHash: identity.hash, status: { notIn: terminal },
      OR: [{ tenantId: input.tenantId }, { visibility: DeviceIncidentVisibility.NETWORK }],
    },
    orderBy: { reportedAt: "desc" },
  });
  const result = !match ? DeviceTrustResult.CLEAR
    : blocking.includes(match.status) ? DeviceTrustResult.MATCH : DeviceTrustResult.REVIEW;
  const check = await db.deviceTrustCheck.create({ data: {
    tenantId: input.tenantId, branchId: input.branchId, actorId: input.actorId,
    matchedReportId: match?.id, imeiHash: identity.hash, imeiLast4: identity.last4,
    context: input.context, devicePresent: true, result,
    blocked: result === DeviceTrustResult.MATCH,
    referenceType: input.referenceType, referenceId: input.referenceId,
  } });
  await db.auditEvent.create({ data: {
    tenantId: input.tenantId, branchId: input.branchId, actorId: input.actorId,
    action: "device-trust.checked", entityType: "DeviceTrustCheck", entityId: check.id,
    after: { context: input.context, result, blocked: check.blocked, imeiLast4: identity.last4 },
  } });
  return check;
}
export async function overrideDeviceTrustBlock(input: {
  tenantId: string; checkId: string; overrideActorId: string; reason: string;
}) {
  if (input.reason.trim().length < 8) throw new Error("Override reason is required");
  const authorized = await db.user.count({ where: {
    id: input.overrideActorId, tenantId: input.tenantId,
    userRoles: { some: { role: { permissions: { some: {
      permission: { code: "device-trust.override" },
    } } } } },
  } });
  if (!authorized) throw new Error("Missing device-trust.override permission");
  const current = await db.deviceTrustCheck.findFirstOrThrow({
    where: { id: input.checkId, tenantId: input.tenantId },
  });
  if (!current.blocked) throw new Error("Only blocked checks can be overridden");
  const updated = await db.deviceTrustCheck.update({
    where: { id: current.id },
    data: { blocked: false, overrideActorId: input.overrideActorId, overrideReason: input.reason.trim() },
  });
  await db.auditEvent.create({ data: {
    tenantId: input.tenantId, branchId: current.branchId, actorId: input.overrideActorId,
    action: "device-trust.block.overridden", entityType: "DeviceTrustCheck", entityId: current.id,
    before: { blocked: true }, after: { blocked: false }, reason: input.reason.trim(),
  } });
  return updated;
}
