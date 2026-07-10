import { NextRequest, NextResponse } from "next/server";

type ClickRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, context: ClickRouteContext) {
  const { slug } = await context.params;
  const goUrl = new URL(`/go/${encodeURIComponent(slug)}`, request.url);

  goUrl.search = request.nextUrl.search;

  const response = NextResponse.redirect(goUrl, 302);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  return response;
}
