import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const LEAD_COOKIE_NAME = "zk_lead_id";
const OFFER_FALLBACK_PATH = "/?offer_unavailable=1";

function readSearchParam(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  return value && value.trim().length > 0 ? value.trim() : null;
}

function hashIp(value: string | null) {
  if (!value) {
    return null;
  }

  return createHash("sha256")
    .update(value)
    .update(process.env.LEAD_IP_HASH_SALT ?? "zaimkarta-local")
    .digest("hex");
}

function getFallbackResponse(request: NextRequest) {
  return NextResponse.redirect(new URL(OFFER_FALLBACK_PATH, request.url), 302);
}

function buildRedirectUrl({
  trackingBaseUrl,
  leadId,
  clickId,
  slug,
}: {
  trackingBaseUrl: string;
  leadId: string;
  clickId: string;
  slug: string;
}) {
  let url: URL;

  try {
    url = new URL(trackingBaseUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") {
    return null;
  }

  url.searchParams.set("lead_id", leadId);
  url.searchParams.set("click_id", clickId);
  url.searchParams.set("sub1", leadId);
  url.searchParams.set("sub2", clickId);
  url.searchParams.set("sub3", slug);

  return url.toString();
}

export async function redirectToAffiliateOffer({
  request,
  slug,
}: {
  request: NextRequest;
  slug: string;
}) {
  const offer = await prisma.offer.findFirst({
    where: {
      slug,
      status: "ACTIVE",
    },
    include: {
      affiliateOffers: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  const affiliateOffer = offer?.affiliateOffers.at(0);

  if (!offer || !affiliateOffer) {
    return getFallbackResponse(request);
  }

  const publicLeadId =
    request.cookies.get(LEAD_COOKIE_NAME)?.value?.trim() || randomUUID();
  const clickId = randomUUID();
  const redirectUrl = buildRedirectUrl({
    trackingBaseUrl: affiliateOffer.trackingBaseUrl,
    leadId: publicLeadId,
    clickId,
    slug,
  });

  if (!redirectUrl) {
    return getFallbackResponse(request);
  }

  const pageUrl = readSearchParam(request, "page_url");
  const pageType = readSearchParam(request, "page_type");
  const categorySlug = readSearchParam(request, "category");
  const cardPositionValue = readSearchParam(request, "position");
  const cardPosition = cardPositionValue ? Number(cardPositionValue) : null;
  const referrer = request.headers.get("referer");
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipHash = hashIp(forwardedFor?.split(",").at(0)?.trim() ?? null);
  const landingPageUrl = pageUrl ?? referrer;
  const leadTrackingData = {
    landingPageUrl,
    referrer,
    userAgent,
    ipHash,
    utmSource: readSearchParam(request, "utm_source"),
    utmMedium: readSearchParam(request, "utm_medium"),
    utmCampaign: readSearchParam(request, "utm_campaign"),
    utmContent: readSearchParam(request, "utm_content"),
    utmTerm: readSearchParam(request, "utm_term"),
  };

  const lead = await prisma.lead.upsert({
    where: {
      leadId: publicLeadId,
    },
    update: leadTrackingData,
    create: {
      leadId: publicLeadId,
      ...leadTrackingData,
    },
  });

  await prisma.offerClick.create({
    data: {
      id: clickId,
      leadId: lead.id,
      offerId: offer.id,
      affiliateOfferId: affiliateOffer.id,
      pageUrl,
      pageType,
      categorySlug,
      cardPosition:
        typeof cardPosition === "number" && Number.isFinite(cardPosition)
          ? cardPosition
          : null,
      redirectUrl,
    },
  });

  const response = NextResponse.redirect(redirectUrl, 302);
  response.cookies.set(LEAD_COOKIE_NAME, publicLeadId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}
