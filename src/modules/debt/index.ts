export const debtModule = {
  name: "debt",
  owns: ["debt-accounts", "debt-entries", "repayments", "statements"],
  stage: 5,
} as const;