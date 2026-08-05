export type PublicSharePageType = "category" | "offer";

export const PUBLIC_SHARE_ANALYTICS_EVENT = "zk-public-share-analytics";

export type PublicShareAnalyticsGoal =
  | "page_share_link_created"
  | "page_share_link_copied"
  | "page_share_native_opened"
  | "page_share_native_completed";

export type PublicShareAnalyticsDetail = {
  goal: PublicShareAnalyticsGoal;
  params: {
    page_type: PublicSharePageType;
    page_slug: string;
    share_method?: "native" | "clipboard" | "manual";
  };
};

function getInternalUrl(origin: string, pathname: string) {
  if (!/^\/(?!\/)/.test(pathname)) {
    throw new Error("Public share pathname must be an internal absolute path.");
  }

  const baseUrl = new URL(`${origin.replace(/\/+$/, "")}/`);
  const url = new URL(pathname, baseUrl);

  if (url.origin !== baseUrl.origin) {
    throw new Error("Public share URL must use the ZaimKarta origin.");
  }

  url.search = "";
  url.hash = "";
  return url;
}

export function buildPublicPageShareUrl({
  origin,
  pathname,
  pageType,
  pageSlug,
}: {
  origin: string;
  pathname: string;
  pageType: PublicSharePageType;
  pageSlug: string;
}) {
  const url = getInternalUrl(origin, pathname);
  url.searchParams.set("utm_source", "page_share");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", pageType);
  url.searchParams.set("utm_content", pageSlug);
  return url.toString();
}

export function buildPublicShareImageUrl({
  origin,
  pageType,
  pageSlug,
}: {
  origin: string;
  pageType: PublicSharePageType;
  pageSlug: string;
}) {
  const url = new URL(
    "/api/og/public-share",
    `${origin.replace(/\/+$/, "")}/`,
  );
  url.searchParams.set("type", pageType);
  url.searchParams.set("slug", pageSlug);
  return url.toString();
}

export function publishPublicShareAnalytics(
  goal: PublicShareAnalyticsGoal,
  params: PublicShareAnalyticsDetail["params"],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PublicShareAnalyticsDetail>(PUBLIC_SHARE_ANALYTICS_EVENT, {
      detail: { goal, params },
    }),
  );
}
