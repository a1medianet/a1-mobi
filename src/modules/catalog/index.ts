export const catalogModule = {
  name: "catalog",
  owns: ["categories", "products", "parts", "accessories", "barcodes"],
  stage: 2,
} as const;