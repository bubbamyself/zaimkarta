import { NextRequest } from "next/server";
import { redirectToAffiliateOffer } from "@/lib/cpa-click";

type GoRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, context: GoRouteContext) {
  const { slug } = await context.params;

  return redirectToAffiliateOffer({ request, slug });
}
