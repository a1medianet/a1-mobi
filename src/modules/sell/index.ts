export const sellModule = {
  name: "sell",
  owns: ["cart", "sales", "pricing-guard", "payments", "returns", "exchanges"],
  stage: 3,
} as const;