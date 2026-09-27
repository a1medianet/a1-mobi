export type DomainEvent<T = unknown> = {
  id: string;
  tenantId: string;
  branchId?: string;
  type: string;
  occurredAt: string;
  payload: T;
};