export const OFFER_CLICK_ANALYTICS_EVENT = "zk-offer-click-analytics";
export const METRIKA_CLIENT_ID_PARAM = "metrika_client_id";
export const OFFER_CLICK_GOAL = "offer_click";

const CLIENT_ID_PATTERN = /^\d{1,32}$/;
const SAFE_PARAM_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export type OfferClickGoalParams = {
  offer_slug: string;
  page_type?: string;
  category?: string;
  position?: number;
};

export type OfferClickAnalyticsDetail = {
  params: OfferClickGoalParams;
  accept: () => void;
  complete: (clientId: string | null) => void;
};

export type YandexMetrika = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    ym?: YandexMetrika;
  }
}

export function isValidMetrikaClientId(value: unknown): value is string {
  return typeof value === "string" && CLIENT_ID_PATTERN.test(value);
}

export function appendMetrikaClientId(href: string, clientId: string | null) {
  if (!isValidMetrikaClientId(clientId)) {
    return href;
  }

  const url = new URL(href, "https://zaimkarta.local");
  url.searchParams.set(METRIKA_CLIENT_ID_PARAM, clientId);

  return `${url.pathname}${url.search}${url.hash}`;
}

function readSafeParam(url: URL, name: string) {
  const values = url.searchParams.getAll(name);

  if (values.length !== 1) {
    return null;
  }

  const value = values[0].trim().toLowerCase();

  return value.length <= 80 && SAFE_PARAM_PATTERN.test(value) ? value : null;
}

export function getOfferClickGoalParams(href: string): OfferClickGoalParams | null {
  const url = new URL(href, "https://zaimkarta.local");
  const match = url.pathname.match(/^\/go\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);

  if (!match) {
    return null;
  }

  const pageType = readSafeParam(url, "page_type");
  const category = readSafeParam(url, "category");
  const positionValue = url.searchParams.get("position");
  const position = positionValue ? Number(positionValue) : null;

  return {
    offer_slug: match[1],
    ...(pageType ? { page_type: pageType } : {}),
    ...(category ? { category } : {}),
    ...(Number.isSafeInteger(position) && position! > 0 && position! <= 10_000
      ? { position: position! }
      : {}),
  };
}

export function dispatchOfferClickAnalytics(
  params: OfferClickGoalParams,
  complete: (clientId: string | null) => void,
) {
  let accepted = false;
  const detail: OfferClickAnalyticsDetail = {
    params,
    accept: () => {
      accepted = true;
    },
    complete,
  };

  window.dispatchEvent(
    new CustomEvent<OfferClickAnalyticsDetail>(OFFER_CLICK_ANALYTICS_EVENT, {
      detail,
    }),
  );

  return accepted;
}
