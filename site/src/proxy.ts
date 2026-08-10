import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ARCHIVED_OFFER_REWRITE_HEADER,
  getArchivedOfferRoutingDecision,
} from "@/lib/offer-archive-policy";
import { prisma } from "@/lib/prisma";

const OFFER_PATH_PREFIX = "/offers/";
const OFFER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const slug = request.nextUrl.pathname.slice(OFFER_PATH_PREFIX.length);

  if (!OFFER_SLUG_PATTERN.test(slug)) {
    return NextResponse.next();
  }

  const offer = await prisma.offer.findUnique({
    where: { slug },
    select: {
      status: true,
      replacementOffer: {
        select: {
          slug: true,
          status: true,
        },
      },
    },
  });

  if (!offer) {
    return NextResponse.next();
  }

  const decision = getArchivedOfferRoutingDecision({
    sourceSlug: slug,
    sourceStatus: offer.status,
    replacement: offer.replacementOffer,
  });

  if (decision.type === "PASS") {
    return NextResponse.next();
  }

  if (decision.type === "REDIRECT") {
    return NextResponse.redirect(
      new URL(`/offers/${decision.replacementSlug}`, request.url),
      301,
    );
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/offers/${slug}/gone`;
  rewriteUrl.search = "";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ARCHIVED_OFFER_REWRITE_HEADER, "1");

  const response = NextResponse.rewrite(rewriteUrl, {
    status: 410,
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("X-Robots-Tag", "noindex, follow");

  return response;
}

export const config = {
  matcher: "/offers/:slug",
};
