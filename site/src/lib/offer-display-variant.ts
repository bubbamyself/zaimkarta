export const OFFER_DISPLAY_VARIANTS = ["standard", "promo_zero"] as const;

export type OfferDisplayVariantParam =
  (typeof OFFER_DISPLAY_VARIANTS)[number];

export function parseOfferDisplayVariant(
  value: string | null | undefined,
): OfferDisplayVariantParam {
  return value === "promo_zero" ? "promo_zero" : "standard";
}

export function getOfferClickVariant(
  pageType: string,
  promoReady: boolean,
): OfferDisplayVariantParam {
  return pageType === "category" && promoReady ? "promo_zero" : "standard";
}

export function toStoredOfferDisplayVariant(value: OfferDisplayVariantParam) {
  return value === "promo_zero" ? ("PROMO_ZERO" as const) : ("STANDARD" as const);
}
