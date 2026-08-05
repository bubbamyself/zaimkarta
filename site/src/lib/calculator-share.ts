import {
  calculateRepaymentDate,
  type RepaymentDateResult,
} from "@/lib/repayment-date";

export const REPAYMENT_DATE_SLUG = "kalkulyator-daty-vozvrata-zayma";
export const OVERPAYMENT_SLUG = "raschet-pereplati";
export const CALCULATOR_SHARE_VERSION = "1";

const CALCULATOR_PRIVATE_QUERY_PARAMS = [
  "share",
  "v",
  "amount",
  "term",
  "rate",
  "start",
] as const;

export const REPAYMENT_SHARE_LIMITS = {
  termMinDays: 1,
  termMaxDays: 365,
};

export const OVERPAYMENT_SHARE_LIMITS = {
  amountMin: 1000,
  amountMax: 100000,
  amountStep: 1000,
  termMinDays: 1,
  termMaxDays: 365,
  dailyRateMin: 0,
  dailyRateMax: 1,
  dailyRateStep: 0.1,
};

type SearchParamValue = string | string[] | undefined;
export type CalculatorSearchParams =
  | URLSearchParams
  | Record<string, SearchParamValue>;

export type RepaymentShareData = {
  tool: "repayment_date";
  start: string;
  term: number;
  result: Extract<RepaymentDateResult, { ok: true }>;
};

export type OverpaymentShareData = {
  tool: "overpayment";
  amount: number;
  term: number;
  rate: number;
  result: {
    dailyCost: number;
    overpayment: number;
    totalReturn: number;
  };
};

export type CalculatorShareData = RepaymentShareData | OverpaymentShareData;

export function sanitizeCalculatorAnalyticsUrl(value: string) {
  if (!value) {
    return value;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (
    url.pathname !== `/${REPAYMENT_DATE_SLUG}` &&
    url.pathname !== `/${OVERPAYMENT_SLUG}`
  ) {
    return value;
  }

  for (const key of CALCULATOR_PRIVATE_QUERY_PARAMS) {
    url.searchParams.delete(key);
  }

  return url.toString();
}

function getValues(params: CalculatorSearchParams, key: string) {
  if (params instanceof URLSearchParams) {
    return params.getAll(key);
  }

  const value = params[key];

  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getSingleValue(params: CalculatorSearchParams, key: string) {
  const values = getValues(params, key);

  return values.length === 1 ? values[0] : null;
}

function parseStrictNumber(value: string | null) {
  if (value === null || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalPlaces(value: number) {
  const [, decimals = ""] = String(value).split(".");
  return decimals.length;
}

function normalizeToStep(value: number, min: number, step: number) {
  const precision = Math.max(decimalPlaces(min), decimalPlaces(step));
  const normalized = min + Math.round((value - min) / step) * step;

  return Number(normalized.toFixed(precision));
}

function hasExactShareEnvelope(params: CalculatorSearchParams) {
  return (
    getSingleValue(params, "share") === "1" &&
    getSingleValue(params, "v") === CALCULATOR_SHARE_VERSION
  );
}

export function parseRepaymentShareParams(
  params: CalculatorSearchParams,
): RepaymentShareData | null {
  if (!hasExactShareEnvelope(params)) {
    return null;
  }

  const start = getSingleValue(params, "start");
  const termValue = getSingleValue(params, "term");

  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return null;
  }

  const year = Number(start.slice(0, 4));

  if (year < 2000 || year > 2100) {
    return null;
  }

  if (termValue === null || !/^\d+$/.test(termValue)) {
    return null;
  }

  const term = Number(termValue);
  const result = calculateRepaymentDate({
    startDateValue: start,
    termDaysValue: termValue,
    minTermDays: REPAYMENT_SHARE_LIMITS.termMinDays,
    maxTermDays: REPAYMENT_SHARE_LIMITS.termMaxDays,
  });

  if (!result.ok || term !== result.termDays) {
    return null;
  }

  return { tool: "repayment_date", start, term, result };
}

export function parseOverpaymentShareParams(
  params: CalculatorSearchParams,
): OverpaymentShareData | null {
  if (!hasExactShareEnvelope(params)) {
    return null;
  }

  const amountValue = parseStrictNumber(getSingleValue(params, "amount"));
  const termValue = getSingleValue(params, "term");
  const rateValue = parseStrictNumber(getSingleValue(params, "rate"));

  if (
    amountValue === null ||
    amountValue < OVERPAYMENT_SHARE_LIMITS.amountMin ||
    amountValue > OVERPAYMENT_SHARE_LIMITS.amountMax ||
    termValue === null ||
    !/^\d+$/.test(termValue) ||
    rateValue === null ||
    rateValue < OVERPAYMENT_SHARE_LIMITS.dailyRateMin ||
    rateValue > OVERPAYMENT_SHARE_LIMITS.dailyRateMax
  ) {
    return null;
  }

  const term = Number(termValue);

  if (
    !Number.isInteger(term) ||
    term < OVERPAYMENT_SHARE_LIMITS.termMinDays ||
    term > OVERPAYMENT_SHARE_LIMITS.termMaxDays
  ) {
    return null;
  }

  const amount = normalizeToStep(
    amountValue,
    OVERPAYMENT_SHARE_LIMITS.amountMin,
    OVERPAYMENT_SHARE_LIMITS.amountStep,
  );
  const rate = normalizeToStep(
    rateValue,
    OVERPAYMENT_SHARE_LIMITS.dailyRateMin,
    OVERPAYMENT_SHARE_LIMITS.dailyRateStep,
  );
  const overpayment = amount * (rate / 100) * term;

  return {
    tool: "overpayment",
    amount,
    term,
    rate,
    result: {
      dailyCost: term > 0 ? overpayment / term : 0,
      overpayment,
      totalReturn: amount + overpayment,
    },
  };
}

function createShareUrl(origin: string, pathname: string) {
  const url = new URL(pathname, `${origin.replace(/\/+$/, "")}/`);
  url.search = "";
  return url;
}

export function buildRepaymentShareUrl({
  origin,
  start,
  term,
}: {
  origin: string;
  start: string;
  term: number;
}) {
  const url = createShareUrl(origin, `/${REPAYMENT_DATE_SLUG}`);
  url.searchParams.set("share", "1");
  url.searchParams.set("v", CALCULATOR_SHARE_VERSION);
  url.searchParams.set("start", start);
  url.searchParams.set("term", String(term));
  url.searchParams.set("utm_source", "calculator_share");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "repayment_date");
  return url.toString();
}

export function buildOverpaymentShareUrl({
  origin,
  amount,
  term,
  rate,
}: {
  origin: string;
  amount: number;
  term: number;
  rate: number;
}) {
  const url = createShareUrl(origin, `/${OVERPAYMENT_SLUG}`);
  url.searchParams.set("share", "1");
  url.searchParams.set("v", CALCULATOR_SHARE_VERSION);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("term", String(term));
  url.searchParams.set("rate", String(rate));
  url.searchParams.set("utm_source", "calculator_share");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "overpayment");
  return url.toString();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "RUB",
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date);
}

export function getRepaymentSharePreview(
  data: RepaymentShareData,
  origin: string,
) {
  const sharedUrl = buildRepaymentShareUrl({
    origin,
    start: data.start,
    term: data.term,
  });
  const imageUrl = new URL("/api/og/calculator", `${origin.replace(/\/+$/, "")}/`);
  imageUrl.searchParams.set("tool", data.tool);
  imageUrl.searchParams.set("share", "1");
  imageUrl.searchParams.set("v", CALCULATOR_SHARE_VERSION);
  imageUrl.searchParams.set("start", data.start);
  imageUrl.searchParams.set("term", String(data.term));

  return {
    title: `Вернуть займ ориентировочно ${formatDate(data.result.repaymentDate)}`,
    description: `Расчёт для срока ${data.term} дней. Откройте ссылку и измените параметры под себя.`,
    sharedUrl,
    imageUrl: imageUrl.toString(),
    image: {
      repaymentDate: formatDate(data.result.repaymentDate),
      term: `${data.term} дней`,
      weekday: formatWeekday(data.result.repaymentDate),
    },
  };
}

export function getOverpaymentSharePreview(
  data: OverpaymentShareData,
  origin: string,
) {
  const sharedUrl = buildOverpaymentShareUrl({
    origin,
    amount: data.amount,
    term: data.term,
    rate: data.rate,
  });
  const imageUrl = new URL("/api/og/calculator", `${origin.replace(/\/+$/, "")}/`);
  imageUrl.searchParams.set("tool", data.tool);
  imageUrl.searchParams.set("share", "1");
  imageUrl.searchParams.set("v", CALCULATOR_SHARE_VERSION);
  imageUrl.searchParams.set("amount", String(data.amount));
  imageUrl.searchParams.set("term", String(data.term));
  imageUrl.searchParams.set("rate", String(data.rate));

  return {
    title: `${formatMoney(data.amount)} на ${data.term} дней — расчёт переплаты`,
    description: `Вернуть примерно ${formatMoney(data.result.totalReturn)}. Переплата — ${formatMoney(data.result.overpayment)}. Рассчитайте свой вариант.`,
    sharedUrl,
    imageUrl: imageUrl.toString(),
    image: {
      amountAndTerm: `${formatMoney(data.amount)} на ${data.term} дней`,
      totalReturn: formatMoney(data.result.totalReturn),
      overpayment: formatMoney(data.result.overpayment),
      dailyCost: formatMoney(data.result.dailyCost),
      dailyRate: data.rate.toLocaleString("ru-RU"),
    },
  };
}
