export const cashModule = {
  name: "cash",
  owns: ["cash-sessions", "cash-movements", "expenses", "fx-snapshots"],
  stage: 6,
} as const;