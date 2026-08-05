export const OFFER_UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const MAX_UTM_VALUE_LENGTH = 200;
const URL_BASE = "https://zaimkarta.local";

export function buildAttributedGoHref(
  href: string,
  currentSearch: string | URLSearchParams,
) {
  const url = new URL(href, URL_BASE);
  const sourceParams =
    typeof currentSearch === "string"
      ? new URLSearchParams(currentSearch)
      : currentSearch;

  for (const key of OFFER_UTM_PARAMS) {
    const values = sourceParams.getAll(key);

    if (values.length !== 1) {
      continue;
    }

    const value = values[0].trim();

    if (value && value.length <= MAX_UTM_VALUE_LENGTH) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
