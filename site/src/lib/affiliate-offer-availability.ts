export type ActiveAffiliateOfferLink = {
  trackingBaseUrl: string;
};

export function hasActiveHttpsAffiliateOffer(
  affiliateOffers: ActiveAffiliateOfferLink[],
) {
  return affiliateOffers.some((affiliateOffer) => {
    try {
      return new URL(affiliateOffer.trackingBaseUrl).protocol === "https:";
    } catch {
      return false;
    }
  });
}
