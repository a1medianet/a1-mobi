export const PILOT_EVIDENCE_KEYS = [
  "stock-entry", "purchase-imei", "barcode-imei-sale", "price-override",
  "mixed-currency", "return-exchange", "repair-lifecycle", "debt-partial-payment",
  "topup-settlement", "day-close", "seller-cost-denied", "sensitive-audit",
  "reports-reconciled", "scanner-physical", "printer-physical", "store-day-uat",
] as const;

export type PilotEvidenceKey = (typeof PILOT_EVIDENCE_KEYS)[number];
export type PilotEvidence = Partial<Record<PilotEvidenceKey, {
  passed: boolean; reference: string; observedAt: string;
}>>;

export function evaluatePilotGate(evidence: PilotEvidence) {
  const missing = PILOT_EVIDENCE_KEYS.filter((key) => !evidence[key]?.passed);
  return {
    result: missing.length === 0 ? "PASS" as const : "BLOCKED" as const,
    missing,
    passed: PILOT_EVIDENCE_KEYS.filter((key) => evidence[key]?.passed),
  };
}
