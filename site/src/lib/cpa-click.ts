import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductionSecret } from "@/lib/production-secret";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRussianRegionByCode } from "@/lib/russian-regions";
import { getAbsoluteUrl } from "@/lib/site-url";

const LEAD_COOKIE_NAME = "zk_lead_id";
const REGION_COOKIE_NAME = "zk_region_code";
const OFFER_FALLBACK_PATH = "/?offer_unavailable=1";
const REGION_FALLBACK_PATH = "/?offer_unavailable_region=1";
const NOINDEX_HEADER_VALUE = "noindex, nofollow";
const GO_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const GO_IP_RATE_LIMIT = 30;
const GO_LEAD_RATE_LIMIT = 12;

const BOT_USER_AGENT_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|vkshare|telegrambot|whatsapp|preview|parser/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readSearchParam(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  return value && value.trim().length > 0 ? value.trim() : null;
}

function getLeadIpHashSalt() {
  return getProductionSecret({
    name: "LEAD_IP_HASH_SALT",
    value: process.env.LEAD_IP_HASH_SALT,
    localFallback: "zaimkarta-local",
  });
}

function hashIp(value: string | null) {
  if (!value) {
    return null;
  }

  return createHash("sha256")
    .update(value)
    .update(getLeadIpHashSalt())
    .digest("hex");
}

function getFallbackResponse(path = OFFER_FALLBACK_PATH) {
  const response = NextResponse.redirect(getAbsoluteUrl(path), 302);
  response.headers.set("X-Robots-Tag", NOINDEX_HEADER_VALUE);

  return response;
}

function getTooManyRequestsResponse(retryAfterSeconds: number) {
  return new NextResponse("Too many requests", {
    status: 429,
    headers: {
      "Retry-After": String(retryAfterSeconds),
      "X-Robots-Tag": NOINDEX_HEADER_VALUE,
    },
  });
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",").at(0)?.trim() || realIp?.trim() || null;
}

function isKnownBot(userAgent: string | null) {
  return !userAgent || BOT_USER_AGENT_PATTERN.test(userAgent);
}

function getPublicLeadId(request: NextRequest) {
  const cookieLeadId = request.cookies.get(LEAD_COOKIE_NAME)?.value?.trim();

  return cookieLeadId && UUID_PATTERN.test(cookieLeadId)
    ? cookieLeadId
    : randomUUID();
}

function warnBlockedClick(reason: string, slug: string, retryAfterSeconds?: number) {
  const warningLimit = checkRateLimit({
    key: `go:warning:${reason}:${slug}`,
    limit: 1,
    windowMs: GO_RATE_LIMIT_WINDOW_MS,
  });

  if (!warningLimit.allowed) {
    return;
  }

  console.warn("CPA redirect blocked", {
    reason,
    slug,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  });
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
  const userAgent = request.headers.get("user-agent");
  const clientIp = getClientIp(request);
  getLeadIpHashSalt();
  const ipHash = hashIp(clientIp);
  const publicLeadId = getPublicLeadId(request);

  if (isKnownBot(userAgent)) {
    warnBlockedClick("bot", slug);
    return getFallbackResponse();
  }

  const ipRateLimit = ipHash
    ? checkRateLimit({
        key: `go:ip:${slug}:${ipHash}`,
        limit: GO_IP_RATE_LIMIT,
        windowMs: GO_RATE_LIMIT_WINDOW_MS,
      })
    : { allowed: true, retryAfterSeconds: 0 };
  const leadRateLimit = checkRateLimit({
    key: `go:lead:${slug}:${publicLeadId}`,
    limit: GO_LEAD_RATE_LIMIT,
    windowMs: GO_RATE_LIMIT_WINDOW_MS,
  });

  if (!ipRateLimit.allowed || !leadRateLimit.allowed) {
    const retryAfterSeconds = Math.max(
      ipRateLimit.retryAfterSeconds,
      leadRateLimit.retryAfterSeconds,
    );
    warnBlockedClick("rate_limit", slug, retryAfterSeconds);
    return getTooManyRequestsResponse(retryAfterSeconds);
  }

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
  const selectedRegionCode = getRussianRegionByCode(
    request.cookies.get(REGION_COOKIE_NAME)?.value,
  )?.code;

  if (!offer || !affiliateOffer) {
    warnBlockedClick("offer_unavailable", slug);
    return getFallbackResponse();
  }

  if (
    selectedRegionCode &&
    offer.restrictedRegionCodes.includes(selectedRegionCode)
  ) {
    warnBlockedClick("region_restricted", slug);
    return getFallbackResponse(REGION_FALLBACK_PATH);
  }

  const clickId = randomUUID();
  const redirectUrl = buildRedirectUrl({
    trackingBaseUrl: affiliateOffer.trackingBaseUrl,
    leadId: publicLeadId,
    clickId,
    slug,
  });

  if (!redirectUrl) {
    warnBlockedClick("invalid_cpa_url", slug);
    return getFallbackResponse();
  }

  const pageUrl = readSearchParam(request, "page_url");
  const pageType = readSearchParam(request, "page_type");
  const categorySlug = readSearchParam(request, "category");
  const cardPositionValue = readSearchParam(request, "position");
  const cardPosition = cardPositionValue ? Number(cardPositionValue) : null;
  const referrer = request.headers.get("referer");
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
  response.headers.set("X-Robots-Tag", NOINDEX_HEADER_VALUE);
  response.cookies.set(LEAD_COOKIE_NAME, publicLeadId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}
