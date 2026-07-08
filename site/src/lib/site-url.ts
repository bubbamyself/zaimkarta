const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL is required in production. Set NEXT_PUBLIC_SITE_URL=https://zaimkarta.ru.",
      );
    }

    return LOCAL_SITE_URL;
  }

  const siteUrl = configuredSiteUrl.replace(/\/+$/, "");
  let parsedSiteUrl: URL;

  try {
    parsedSiteUrl = new URL(siteUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be a valid absolute URL, for example https://zaimkarta.ru.",
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    ["localhost", "127.0.0.1", "::1"].includes(parsedSiteUrl.hostname)
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL cannot use localhost in production. Set NEXT_PUBLIC_SITE_URL=https://zaimkarta.ru.",
    );
  }

  return siteUrl;
}

export function getAbsoluteUrl(path: string) {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
