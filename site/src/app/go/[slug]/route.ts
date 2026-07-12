import { NextRequest } from "next/server";
import { redirectToAffiliateOffer } from "@/lib/cpa-click";
import { isMaintenanceModeEnabled } from "@/lib/maintenance-mode";

type GoRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, context: GoRouteContext) {
  if (await isMaintenanceModeEnabled()) {
    return new Response(
      "В настоящий момент на сервисе ZAIMKARTA проводятся технические работы. Спасибо за понимание, возвращайтесь позже.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "3600",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  const { slug } = await context.params;

  return redirectToAffiliateOffer({ request, slug });
}
