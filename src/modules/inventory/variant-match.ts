export type VariantProduct = { sku: string; nameEn: string; categoryCode: string };
export type DeviceVariantOption = { id: string; name: string; model: string };

/**
 * Catalog-created serialized products have a deterministic association:
 * their device model is nameEn and their variant is the product SKU.
 * Older PHONE-category products use a separate model flow and are not constrained here.
 */
export function matchesCatalogProductVariant(
  product: VariantProduct,
  variant: Pick<DeviceVariantOption, "name" | "model">,
): boolean {
  return product.categoryCode !== "DEVICE"
    || (product.sku === variant.name && product.nameEn === variant.model);
}

export function allowedProductVariants<V extends DeviceVariantOption>(
  product: VariantProduct | undefined,
  variants: readonly V[],
): V[] {
  if (!product) return [];
  return variants.filter(variant => matchesCatalogProductVariant(product, variant));
}
