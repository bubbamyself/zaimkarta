import type { ApprovalTone } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OfferCardData = {
  name: string;
  slug: string;
  logoText: string;
  badge: string;
  rating: string;
  reviewsCount: number;
  amount: string;
  term: string;
  psk: string;
  rate: string;
  decisionTime: string;
  approval: string;
  approvalTone: "low" | "medium" | "high";
  payoutMethods: string[];
  tags: string[];
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

export async function getActiveOffers(): Promise<OfferCardData[]> {
  const offers = await prisma.offer.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: [{ rating: "desc" }, { brandName: "asc" }],
  });

  return offers.map((offer) => ({
    name: offer.brandName,
    slug: offer.slug,
    logoText: offer.logoText ?? offer.brandName.slice(0, 1),
    badge: offer.badge ?? "онлайн заем",
    rating: offer.rating?.toString() ?? "0",
    reviewsCount: offer.reviewsCount,
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
    tags: offer.advantages.slice(0, 3),
  }));
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
    badge: offer.badge ?? "онлайн заем",
    rating: offer.rating?.toString() ?? "0",
    reviewsCount: offer.reviewsCount,
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
    tags: offer.advantages.slice(0, 3),
    legalName: offer.legalName,
    officialSite: offer.officialSite,
    shortDescription: offer.shortDescription,
    repaymentMethods: offer.repaymentMethods,
    requirements: offer.requirements,
    documents: offer.documents,
    advantages: offer.advantages,
    warnings: offer.warnings,
    legalDisclosure: offer.legalDisclosure,
  };
}
