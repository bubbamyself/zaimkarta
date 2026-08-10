import type { OfferStatus } from "@prisma/client";

export const PUBLIC_OFFER_STATUSES = ["ACTIVE", "PAUSED"] as const satisfies
  readonly OfferStatus[];

export type OfferApplicationAvailabilityReason =
  | "AVAILABLE"
  | "PAUSED"
  | "REGION_REQUIRED"
  | "REGION_RESTRICTED"
  | "AFFILIATE_UNAVAILABLE"
  | "NOT_PUBLIC";

export function isPublicOfferStatus(status: OfferStatus) {
  return PUBLIC_OFFER_STATUSES.some((publicStatus) => publicStatus === status);
}

export function getOfferApplicationAvailability({
  status,
  restrictedRegionCodes,
  selectedRegionCode,
  hasActiveAffiliateOffer,
}: {
  status: OfferStatus;
  restrictedRegionCodes: string[];
  selectedRegionCode: string | null;
  hasActiveAffiliateOffer: boolean;
}): {
  isAvailable: boolean;
  reason: OfferApplicationAvailabilityReason;
} {
  if (!isPublicOfferStatus(status)) {
    return { isAvailable: false, reason: "NOT_PUBLIC" };
  }

  if (status === "PAUSED") {
    return { isAvailable: false, reason: "PAUSED" };
  }

  if (!selectedRegionCode) {
    return { isAvailable: false, reason: "REGION_REQUIRED" };
  }

  if (restrictedRegionCodes.includes(selectedRegionCode)) {
    return { isAvailable: false, reason: "REGION_RESTRICTED" };
  }

  if (!hasActiveAffiliateOffer) {
    return { isAvailable: false, reason: "AFFILIATE_UNAVAILABLE" };
  }

  return { isAvailable: true, reason: "AVAILABLE" };
}
