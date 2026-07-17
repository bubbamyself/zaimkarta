import "server-only";
import { prisma } from "@/lib/prisma";
import { isRussianRegionCode } from "@/lib/russian-regions";

export const HOMEPAGE_FEATURED_OFFER_KEY = "homepage_featured_offer_id";

type FeaturedOfferFields = {
  slug: string;
  status: string;
  brandName: string;
  legalName: string | null;
  logoText: string | null;
  logoUrl: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  dailyRateFrom: { toString(): string } | null;
  dailyRateTo: { toString(): string } | null;
  pskFrom: { toString(): string } | null;
  pskTo: { toString(): string } | null;
  approvalLabel: string | null;
  decisionTime: string | null;
  payoutMethods: string[];
};

type FeaturedAffiliateFields = {
  trackingBaseUrl: string;
  isActive: boolean;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function extractErid(trackingBaseUrl: string | null | undefined) {
  if (!trackingBaseUrl) {
    return null;
  }

  try {
    const url = new URL(trackingBaseUrl);

    if (url.protocol !== "https:") {
      return null;
    }

    return url.searchParams.get("erid")?.trim() || null;
  } catch {
    return null;
  }
}

export function getFeaturedOfferValidationError(
  offer: FeaturedOfferFields,
  affiliateOffer: FeaturedAffiliateFields | null,
) {
  if (offer.status !== "ACTIVE") {
    return "Главным можно назначить только активный оффер.";
  }

  if (!affiliateOffer?.isActive) {
    return "Для главного оффера нужна активная CPA-ссылка.";
  }

  let affiliateUrl: URL;

  try {
    affiliateUrl = new URL(affiliateOffer.trackingBaseUrl);
  } catch {
    return "Активная CPA-ссылка оффера должна быть корректным URL.";
  }

  if (affiliateUrl.protocol !== "https:") {
    return "Активная CPA-ссылка оффера должна использовать HTTPS.";
  }

  if (!extractErid(affiliateOffer.trackingBaseUrl)) {
    return "В активной CPA-ссылке оффера не найден параметр erid.";
  }

  const missingFields = [
    !hasText(offer.brandName) ? "название кредитора" : null,
    !hasText(offer.legalName) ? "юридическое название рекламодателя" : null,
    !hasText(offer.logoUrl) && !hasText(offer.logoText) ? "логотип" : null,
    !hasText(offer.decisionTime) ? "время рассмотрения" : null,
    !hasText(offer.approvalLabel) ? "оценка одобрения" : null,
    offer.payoutMethods.length === 0 ? "способы получения" : null,
    offer.minAmount === null ? "минимальная сумма" : null,
    offer.maxAmount === null ? "максимальная сумма" : null,
  ].filter(Boolean);

  if (missingFields.length > 0) {
    return `Для главной карточки заполни: ${missingFields.join(", ")}.`;
  }

  return null;
}

function formatPercent(value: { toString(): string }) {
  return value.toString().replace(".", ",");
}

function formatPercentRange(
  from: { toString(): string } | null,
  to: { toString(): string } | null,
) {
  if (!from && !to) {
    return null;
  }

  if (from && to && from.toString() !== to.toString()) {
    return `${formatPercent(from)}–${formatPercent(to)}%`;
  }

  return `${formatPercent((from ?? to)!)}%`;
}

export type HomepageFeaturedOffer = {
  slug: string;
  brandName: string;
  legalName: string;
  logoText: string | null;
  logoUrl: string | null;
  minAmount: number;
  maxAmount: number;
  decisionTime: string;
  approvalLabel: string;
  payoutMethods: string[];
  rate: string | null;
  psk: string | null;
  erid: string;
};

export async function getHomepageFeaturedOffer(
  regionCode: string | null,
): Promise<HomepageFeaturedOffer | null> {
  if (!regionCode || !isRussianRegionCode(regionCode)) {
    return null;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: HOMEPAGE_FEATURED_OFFER_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return null;
    }

    const offer = await prisma.offer.findUnique({
      where: { id: setting.value },
      include: {
        affiliateOffers: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!offer || offer.restrictedRegionCodes.includes(regionCode)) {
      return null;
    }

    const affiliateOffer = offer.affiliateOffers.at(0) ?? null;
    const validationError = getFeaturedOfferValidationError(
      offer,
      affiliateOffer,
    );
    const erid = extractErid(affiliateOffer?.trackingBaseUrl);

    if (validationError || !affiliateOffer || !erid) {
      return null;
    }

    return {
      slug: offer.slug,
      brandName: offer.brandName,
      legalName: offer.legalName!,
      logoText: offer.logoText,
      logoUrl: offer.logoUrl,
      minAmount: offer.minAmount!,
      maxAmount: offer.maxAmount!,
      decisionTime: offer.decisionTime!,
      approvalLabel: offer.approvalLabel!,
      payoutMethods: offer.payoutMethods,
      rate: formatPercentRange(offer.dailyRateFrom, offer.dailyRateTo),
      psk: formatPercentRange(offer.pskFrom, offer.pskTo),
      erid,
    };
  } catch (error) {
    console.error("Failed to render homepage featured offer", error);
    return null;
  }
}
