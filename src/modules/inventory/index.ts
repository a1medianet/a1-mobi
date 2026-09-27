export const inventoryModule = {
  name: "inventory",
  owns: ["suppliers", "purchases", "locations", "movements", "counts"],
  stage: 2,
} as const;