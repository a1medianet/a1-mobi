export type AuditInput = {
  tenantId: string;
  branchId?: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};

export function createAuditEvent(input: AuditInput) {
  if (!input.tenantId || !input.actorId || !input.action) {
    throw new Error("INVALID_AUDIT_EVENT");
  }
  return {
    ...input,
    occurredAt: new Date().toISOString(),
  };
}