import type { ApprovalTone, Offer } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OfferCardData = {
  name: string;
  slug: string;
  logoText: string;
  logoUrl: string | null;
  badge: string;
  rating: string;
  reviewsCount: number;
  minAmount: number | null;
  maxAmount: number | null;
  minTermDays: number | null;
  maxTermDays: number | null;
  amount: string;
  term: string;
  psk: string;
  rate: string;
  decisionTime: string;
  approval: string;
  approvalTone: "low" | "medium" | "high";
  payoutMethods: string[];
  requirements: string[];
  documents: string[];
  advantages: string[];
  tags: string[];
  pageBadge?: string | null;
  pageNote?: string | null;
  pageCtaText?: string | null;
  pageHighlight?: boolean;
};

export type OfferDetailsData = OfferCardData & {
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
  | "rating"
  | "requirements"
  | "reviewsCount"
  | "slug"
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

export function mapOfferToCardData(offer: OfferForCard): OfferCardData {
  return {
    name: offer.brandName,
    slug: offer.slug,
    logoText: offer.logoText ?? offer.brandName.slice(0, 1),
    logoUrl: offer.logoUrl,
    badge: offer.badge ?? "онлайн заем",
    rating: offer.rating?.toString() ?? "0",
    reviewsCount: offer.reviewsCount,
    minAmount: offer.minAmount,
    maxAmount: offer.maxAmount,
    minTermDays: offer.minTermDays,
    maxTermDays: offer.maxTermDays,
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
    requirements: offer.requirements,
    documents: offer.documents,
    advantages: offer.advantages,
    tags: offer.advantages.slice(0, 3),
  };
}

export async function getActiveOffers(): Promise<OfferCardData[]> {
  const offers = await prisma.offer.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: [{ displayPriority: "asc" }, { rating: "desc" }, { brandName: "asc" }],
  });

  return offers.map(mapOfferToCardData);
}

export async function getOfferDetails(
  slug: string,
): Promise<OfferDetailsData | null> {
  const offer = await prisma.offer.findFirst({
    where: {
      slug,
      status: "ACTIVE",
    },
  });

  if (!offer) {
    return null;
  }

  return {
    name: offer.brandName,
    slug: offer.slug,
    logoText: offer.logoText ?? offer.brandName.slice(0, 1),
    logoUrl: offer.logoUrl,
    badge: offer.badge ?? "онлайн заем",
    rating: offer.rating?.toString() ?? "0",
    reviewsCount: offer.reviewsCount,
    minAmount: offer.minAmount,
    maxAmount: offer.maxAmount,
    minTermDays: offer.minTermDays,
    maxTermDays: offer.maxTermDays,
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
    requirements: offer.requirements,
    documents: offer.documents,
    advantages: offer.advantages,
    tags: offer.advantages.slice(0, 3),
    legalName: offer.legalName,
    officialSite: offer.officialSite,
    shortDescription: offer.shortDescription,
    repaymentMethods: offer.repaymentMethods,
    warnings: offer.warnings,
    legalDisclosure: offer.legalDisclosure,
  };
}
