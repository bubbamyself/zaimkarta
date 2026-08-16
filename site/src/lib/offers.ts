import type { ApprovalTone, Offer, OfferStatus } from "@prisma/client";
import { hasActiveHttpsAffiliateOffer } from "@/lib/affiliate-offer-availability";
import { PUBLIC_OFFER_STATUSES } from "@/lib/offer-publication";
import { prisma } from "@/lib/prisma";
import { isRussianRegionCode } from "@/lib/russian-regions";
import { isPromoReady } from "@/lib/offer-promo";

export type OfferCardDisplayVariant = "standard" | "promo_zero";

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
  promoEnabled: boolean;
  promoReady: boolean;
  promoTitle: string | null;
  promoDailyRate: number | null;
  promoPsk: number | null;
  promoMinAmount: number | null;
  promoMaxAmount: number | null;
  promoZeroTermDays: number | null;
  promoNewClientsOnly: boolean;
  promoConditions: string | null;
  displayVariant: OfferCardDisplayVariant;
  promoUnavailable: boolean;
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
  promoCollections: Array<{
    slug: string;
    title: string;
  }>;
  legalName: string | null;
  officialSite: string | null;
  shortDescription: string | null;
  repaymentMethods: string[];
  requirements: string[];
  documents: string[];
  advantages: string[];
  warnings: string[];
  legalDisclosure: string | null;
  promoLateConsequences: string | null;
  promoPaidServices: string | null;
  promoSourceUrl: string | null;
  promoCheckedAt: string | null;
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
  | "promoEnabled"
  | "promoTitle"
  | "promoDailyRate"
  | "promoPsk"
  | "promoMinAmount"
  | "promoMaxAmount"
  | "promoZeroTermDays"
  | "promoNewClientsOnly"
  | "promoConditions"
  | "promoLateConsequences"
  | "promoPaidServices"
  | "promoSourceUrl"
  | "promoCheckedAt"
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

function formatMoneyRange(from: number | null, to: number | null) {
  if (from === null && to === null) {
    return "индивидуально";
  }

  if (from !== null && to !== null && from !== to) {
    return `${formatMoney(from)}–${formatMoney(to)}`;
  }

  return formatMoney(from ?? to);
}

function formatDays(value: number) {
  const absoluteValue = Math.abs(value);
  const lastTwoDigits = absoluteValue % 100;
  const lastDigit = absoluteValue % 10;
  const unit =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? "дней"
      : lastDigit === 1
        ? "день"
        : lastDigit >= 2 && lastDigit <= 4
          ? "дня"
          : "дней";

  return `${value} ${unit}`;
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

export function mapOfferToCardData(
  offer: OfferForCard,
  options: { displayVariant?: OfferCardDisplayVariant } = {},
): OfferCardData {
  const displayVariant = options.displayVariant ?? "standard";
  const promoReady = isPromoReady(offer);
  const usePromo = displayVariant === "promo_zero" && promoReady;
  const promoUnavailable = displayVariant === "promo_zero" && !promoReady;

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
    promoEnabled: offer.promoEnabled,
    promoReady,
    promoTitle: offer.promoTitle,
    promoDailyRate: decimalToNumber(offer.promoDailyRate),
    promoPsk: decimalToNumber(offer.promoPsk),
    promoMinAmount: offer.promoMinAmount,
    promoMaxAmount: offer.promoMaxAmount,
    promoZeroTermDays: offer.promoZeroTermDays,
    promoNewClientsOnly: offer.promoNewClientsOnly,
    promoConditions: offer.promoConditions,
    displayVariant,
    promoUnavailable,
    amount: promoUnavailable
      ? "условия акции уточняются"
      : usePromo
        ? formatMoneyRange(offer.promoMinAmount, offer.promoMaxAmount)
        : `до ${formatMoney(offer.maxAmount)}`,
    term: promoUnavailable
      ? "условия акции уточняются"
      : usePromo
        ? `${formatDays(offer.promoZeroTermDays!)} по акции`
        : offer.minTermDays && offer.maxTermDays
          ? `${offer.minTermDays}-${offer.maxTermDays} дней`
          : "индивидуально",
    psk: promoUnavailable
      ? "условия акции уточняются"
      : usePromo
        ? formatPercentRange(offer.promoPsk, offer.promoPsk)
        : formatPercentRange(offer.pskFrom, offer.pskTo),
    rate: promoUnavailable
      ? "условия акции уточняются"
      : usePromo
        ? formatPercentRange(offer.promoDailyRate, offer.promoDailyRate)
        : formatPercentRange(offer.dailyRateFrom, offer.dailyRateTo),
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
    .map((offer) => mapOfferToCardData(offer));
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
      seoPageOffers: {
        where: {
          usePromo: true,
          seoPage: {
            slug: "0-procentov-na-pervii-zaem",
            status: "PUBLISHED",
            pageType: "CATEGORY",
          },
        },
        orderBy: {
          position: "asc",
        },
        select: {
          seoPage: {
            select: {
              slug: true,
              h1: true,
            },
          },
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
    promoCollections: offer.seoPageOffers.map((item) => ({
      slug: item.seoPage.slug,
      title: item.seoPage.h1,
    })),
    ...mapOfferToCardData(offer),
    legalName: offer.legalName,
    officialSite: offer.officialSite,
    shortDescription: offer.shortDescription,
    legalDisclosure: offer.legalDisclosure,
    promoLateConsequences: offer.promoLateConsequences,
    promoPaidServices: offer.promoPaidServices,
    promoSourceUrl: offer.promoSourceUrl,
    promoCheckedAt: offer.promoCheckedAt
      ? offer.promoCheckedAt.toISOString()
      : null,
  };
}
