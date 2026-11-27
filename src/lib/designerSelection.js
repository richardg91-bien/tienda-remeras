export function buildDesignerSelectionUrl(product, { size, color } = {}) {
  const params = new URLSearchParams();
  params.set("productRef", product?.productRef || "tee-classic");
  if (product?.id != null) params.set("catalogProductId", String(product.id));
  if (size) params.set("size", size);
  if (color) params.set("color", color);
  return `/disenar?${params.toString()}`;
}
