import type { ApprovalTone, Offer, OfferStatus } from "@prisma/client";
import { hasActiveHttpsAffiliateOffer } from "@/lib/affiliate-offer-availability";
import { PUBLIC_OFFER_STATUSES } from "@/lib/offer-publication";
import { prisma } from "@/lib/prisma";
import { isRussianRegionCode } from "@/lib/russian-regions";

export type OfferCardData = {
  name: string;
  slug: string;
  logoText: string;
  logoUrl: string | null;
  badge: string;
  minAmount: number | null;
  maxAmount: number | null;
  minTermDays: number | null;
  maxTermDays: number | null;
  dailyRateFrom: number | null;
  dailyRateTo: number | null;
  pskFrom: number | null;
  pskTo: number | null;
  amount: string;
  term: string;
  psk: string;
  rate: string;
  decisionTime: string;
  approval: string;
  approvalTone: "low" | "medium" | "high";
  payoutMethods: string[];
  repaymentMethods: string[];
  requirements: string[];
  documents: string[];
  advantages: string[];
  warnings: string[];
  restrictedRegionCodes: string[];
  conditionsCheckedAt: string | null;
  tags: string[];
  pageBadge?: string | null;
  pageNote?: string | null;
  pageCtaText?: string | null;
  pageHighlight?: boolean;
};

export type OfferDetailsData = OfferCardData & {
  status: OfferStatus;
  hasActiveAffiliateOffer: boolean;
  legalName: string | null;
  officialSite: string | null;
  shortDescription: string | null;
  repaymentMethods: string[];
  requirements: string[];
  documents: string[];
  advantages: string[];
  warnings: string[];
  legalDisclosure: string | null;
};

type OfferForCard = Pick<
  Offer,
  | "advantages"
  | "approvalLabel"
  | "approvalTone"
  | "badge"
  | "brandName"
  | "dailyRateFrom"
  | "dailyRateTo"
  | "decisionTime"
  | "documents"
  | "logoText"
  | "logoUrl"
  | "minAmount"
  | "maxAmount"
  | "maxTermDays"
  | "minTermDays"
  | "payoutMethods"
  | "pskFrom"
  | "pskTo"
  | "repaymentMethods"
  | "requirements"
  | "restrictedRegionCodes"
  | "slug"
  | "warnings"
  | "conditionsCheckedAt"
>;

function formatMoney(value: number | null) {
  if (value === null) {
    return "индивидуально";
  }

  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function formatPercentRange(
  from: { toString(): string } | null,
  to: { toString(): string } | null,
) {
  if (!from && !to) {
    return "индивидуально";
  }

  if (from && to && from.toString() !== to.toString()) {
    return `${from.toString().replace(".", ",")}-${to
      .toString()
      .replace(".", ",")}%`;
  }

  return `${(from ?? to)?.toString().replace(".", ",")}%`;
}

function mapApprovalTone(tone: ApprovalTone): "low" | "medium" | "high" {
  if (tone === "HIGH") {
    return "high";
  }

  if (tone === "LOW") {
    return "low";
  }

  return "medium";
}

function decimalToNumber(value: { toString(): string } | null) {
  return value ? Number(value.toString()) : null;
}

export function mapOfferToCardData(offer: OfferForCard): OfferCardData {
  return {
    name: offer.brandName,
    slug: offer.slug,
    logoText: offer.logoText ?? offer.brandName.slice(0, 1),
    logoUrl: offer.logoUrl,
    badge: offer.badge ?? "онлайн заем",
    minAmount: offer.minAmount,
    maxAmount: offer.maxAmount,
    minTermDays: offer.minTermDays,
    maxTermDays: offer.maxTermDays,
    dailyRateFrom: decimalToNumber(offer.dailyRateFrom),
    dailyRateTo: decimalToNumber(offer.dailyRateTo),
    pskFrom: decimalToNumber(offer.pskFrom),
    pskTo: decimalToNumber(offer.pskTo),
    amount: `до ${formatMoney(offer.maxAmount)}`,
    term:
      offer.minTermDays && offer.maxTermDays
        ? `${offer.minTermDays}-${offer.maxTermDays} дней`
        : "индивидуально",
    psk: formatPercentRange(offer.pskFrom, offer.pskTo),
    rate: formatPercentRange(offer.dailyRateFrom, offer.dailyRateTo),
    decisionTime: offer.decisionTime ?? "индивидуально",
    approval: offer.approvalLabel ?? "Индивидуально",
    approvalTone: mapApprovalTone(offer.approvalTone),
    payoutMethods: offer.payoutMethods,
    repaymentMethods: offer.repaymentMethods,
    requirements: offer.requirements,
    documents: offer.documents,
    advantages: offer.advantages,
    warnings: offer.warnings,
    restrictedRegionCodes: offer.restrictedRegionCodes,
    conditionsCheckedAt: offer.conditionsCheckedAt
      ? offer.conditionsCheckedAt.toISOString()
      : null,
    tags: offer.advantages.slice(0, 3),
  };
}

export async function getActiveOffers(): Promise<OfferCardData[]> {
  return getActiveOffersForRegion(null);
}

export async function getActiveOffersForRegion(
  regionCode: string | null,
  options?: {
    requireActiveAffiliateOffer?: boolean;
  },
): Promise<OfferCardData[]> {
  const selectedRegionCode = regionCode && isRussianRegionCode(regionCode)
    ? regionCode
    : null;
  const offers = await prisma.offer.findMany({
    where: {
      status: "ACTIVE",
      ...(selectedRegionCode
        ? {
            NOT: {
              restrictedRegionCodes: {
                has: selectedRegionCode,
              },
            },
          }
        : {}),
    },
    orderBy: [{ displayPriority: "asc" }, { brandName: "asc" }],
    include: {
      affiliateOffers: {
        where: {
          isActive: true,
        },
        select: {
          trackingBaseUrl: true,
        },
      },
    },
  });

  return offers
    .filter(
      (offer) =>
        !options?.requireActiveAffiliateOffer ||
        hasActiveHttpsAffiliateOffer(offer.affiliateOffers),
    )
    .map(mapOfferToCardData);
}

export async function getOfferDetails(
  slug: string,
): Promise<OfferDetailsData | null> {
  const offer = await prisma.offer.findFirst({
    where: {
      slug,
      status: {
        in: [...PUBLIC_OFFER_STATUSES],
      },
    },
    include: {
      affiliateOffers: {
        where: {
          isActive: true,
        },
        select: {
          trackingBaseUrl: true,
        },
      },
    },
  });

  if (!offer) {
    return null;
  }

  return {
    status: offer.status,
    hasActiveAffiliateOffer: hasActiveHttpsAffiliateOffer(
      offer.affiliateOffers,
    ),
    name: offer.brandName,
    slug: offer.slug,
    logoText: offer.logoText ?? offer.brandName.slice(0, 1),
    logoUrl: offer.logoUrl,
    badge: offer.badge ?? "онлайн заем",
    minAmount: offer.minAmount,
    maxAmount: offer.maxAmount,
    minTermDays: offer.minTermDays,
    maxTermDays: offer.maxTermDays,
    dailyRateFrom: decimalToNumber(offer.dailyRateFrom),
    dailyRateTo: decimalToNumber(offer.dailyRateTo),
    pskFrom: decimalToNumber(offer.pskFrom),
    pskTo: decimalToNumber(offer.pskTo),
    amount: `до ${formatMoney(offer.maxAmount)}`,
    term:
      offer.minTermDays && offer.maxTermDays
        ? `${offer.minTermDays}-${offer.maxTermDays} дней`
        : "индивидуально",
    psk: formatPercentRange(offer.pskFrom, offer.pskTo),
    rate: formatPercentRange(offer.dailyRateFrom, offer.dailyRateTo),
    decisionTime: offer.decisionTime ?? "индивидуально",
    approval: offer.approvalLabel ?? "Индивидуально",
    approvalTone: mapApprovalTone(offer.approvalTone),
    payoutMethods: offer.payoutMethods,
    repaymentMethods: offer.repaymentMethods,
    requirements: offer.requirements,
    documents: offer.documents,
    advantages: offer.advantages,
    warnings: offer.warnings,
    restrictedRegionCodes: offer.restrictedRegionCodes,
    conditionsCheckedAt: offer.conditionsCheckedAt
      ? offer.conditionsCheckedAt.toISOString()
      : null,
    tags: offer.advantages.slice(0, 3),
    legalName: offer.legalName,
    officialSite: offer.officialSite,
    shortDescription: offer.shortDescription,
    legalDisclosure: offer.legalDisclosure,
  };
}
