const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || LOCAL_SITE_URL).replace(/\/+$/, "");
}

export function getAbsoluteUrl(path: string) {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
