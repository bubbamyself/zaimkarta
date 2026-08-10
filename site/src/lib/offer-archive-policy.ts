import type { OfferStatus } from "@prisma/client";

export const ARCHIVED_OFFER_REWRITE_HEADER =
  "x-zaimkarta-archived-offer-rewrite";

export type ArchivedOfferRoutingDecision =
  | { type: "PASS" }
  | { type: "GONE" }
  | { type: "REDIRECT"; replacementSlug: string };

export function getArchivedOfferRoutingDecision({
  sourceSlug,
  sourceStatus,
  replacement,
}: {
  sourceSlug: string;
  sourceStatus: OfferStatus;
  replacement: {
    slug: string;
    status: OfferStatus;
  } | null;
}): ArchivedOfferRoutingDecision {
  if (sourceStatus !== "ARCHIVED") {
    return { type: "PASS" };
  }

  if (
    replacement?.status === "ACTIVE" &&
    replacement.slug !== sourceSlug
  ) {
    return {
      type: "REDIRECT",
      replacementSlug: replacement.slug,
    };
  }

  return { type: "GONE" };
}

export function getReplacementOfferValidationError({
  sourceOfferId,
  sourceStatus,
  replacement,
}: {
  sourceOfferId: string | null;
  sourceStatus: OfferStatus;
  replacement: {
    id: string;
    status: OfferStatus;
  } | null;
}) {
  if (!replacement || sourceStatus !== "ARCHIVED") {
    return null;
  }

  if (replacement.id === sourceOfferId) {
    return "Оффер не может перенаправлять сам на себя";
  }

  if (replacement.status !== "ACTIVE") {
    return "Заменой может быть только активный оффер";
  }

  return null;
}
