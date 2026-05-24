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

  return NextResponse.redirect(goUrl, 302);
}
