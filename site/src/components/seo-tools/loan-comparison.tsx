"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { OfferCardData } from "@/lib/offers";
import { REGION_COOKIE_NAME } from "@/lib/region-cookie-config";
import type {
  ComparisonConfig,
  ComparisonPriority,
  SeoToolRenderProps,
} from "./types";

type CheckResult = {
  ok: boolean;
  label: string;
  reason?: string;
  attention?: string;
};

type OfferEvaluation = {
  offer: OfferCardData;
  amount: CheckResult;
  term: CheckResult;
  region: CheckResult;
  rateNotice: string | null;
  overpayment: {
    ok: boolean;
    from: number;
    to: number;
    text: string;
    totalText: string;
  } | null;
  isEligible: boolean;
  ctaBlockedReason: string | null;
};

const PRIORITIES: { value: ComparisonPriority; label: string }[] = [
  { value: "none", label: "Без приоритета" },
  { value: "min_overpayment", label: "Минимальная ориентировочная переплата" },
  { value: "fast_decision", label: "Быстрое решение" },
  { value: "payout_method", label: "Удобный способ получения" },
  { value: "simple_requirements", label: "Минимум требований" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "RUB",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "нет даты";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatRange(from: number, to: number, formatter: (value: number) => string) {
  if (Math.round(from) === Math.round(to)) {
    return formatter(from);
  }

  return `от ${formatter(from)} до ${formatter(to)}`;
}

function getTermText(days: number) {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  const unit =
    lastDigit === 1 && lastTwoDigits !== 11
      ? "день"
      : lastDigit >= 2 &&
          lastDigit <= 4 &&
          (lastTwoDigits < 12 || lastTwoDigits > 14)
        ? "дня"
        : "дней";

  return `${days} ${unit}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeListValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ")
    .replace("банковская карта", "карта")
    .replace("с банковской карты", "карта")
    .replace("онлайн в личном кабинете", "личный кабинет");
}

function normalizeList(values: string[]) {
  return Array.from(new Set(values.map(normalizeListValue).filter(Boolean)));
}

function listsEqual(first: string[], second: string[]) {
  const normalizedFirst = normalizeList(first).sort();
  const normalizedSecond = normalizeList(second).sort();

  return (
    normalizedFirst.length === normalizedSecond.length &&
    normalizedFirst.every((value, index) => value === normalizedSecond[index])
  );
}

function displayList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "нет данных";
}

function readRegionCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${REGION_COOKIE_NAME}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

function parsePositiveInteger(value: string, fallback: number) {
  if (!/^\d+$/.test(value.trim())) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function checkAmount(offer: OfferCardData, amount: number): CheckResult {
  if (offer.minAmount === null || offer.maxAmount === null) {
    return {
      ok: false,
      label: "Недостаточно данных",
      reason: "Недостаточно данных для проверки суммы.",
      attention: "Не указаны границы суммы.",
    };
  }

  if (amount < offer.minAmount) {
    return {
      ok: false,
      label: "Не подходит",
      reason: `минимальная сумма ${formatMoney(offer.minAmount)}`,
      attention: `Сумма ниже минимума у ${offer.name}.`,
    };
  }

  if (amount > offer.maxAmount) {
    return {
      ok: false,
      label: "Не подходит",
      reason: `максимальная сумма ${formatMoney(offer.maxAmount)}`,
      attention: `Сумма выше максимума у ${offer.name}.`,
    };
  }

  return {
    ok: true,
    label: "Подходит",
  };
}

function checkTerm(offer: OfferCardData, termDays: number): CheckResult {
  if (offer.minTermDays === null || offer.maxTermDays === null) {
    return {
      ok: false,
      label: "Недостаточно данных",
      reason: "Недостаточно данных для проверки срока.",
      attention: "Не указаны границы срока.",
    };
  }

  if (termDays < offer.minTermDays) {
    return {
      ok: false,
      label: "Не подходит",
      reason: `минимальный срок ${getTermText(offer.minTermDays)}`,
      attention: `Срок меньше минимума у ${offer.name}.`,
    };
  }

  if (termDays > offer.maxTermDays) {
    return {
      ok: false,
      label: "Не подходит",
      reason: `срок до ${getTermText(offer.maxTermDays)}`,
      attention: `Срок больше максимума у ${offer.name}.`,
    };
  }

  return {
    ok: true,
    label: "Подходит",
  };
}

function checkRegion(
  offer: OfferCardData,
  selectedRegionCode: string | null,
): CheckResult {
  if (!selectedRegionCode) {
    return {
      ok: true,
      label: "Регион не выбран",
      reason: "региональные ограничения не учитывались",
    };
  }

  if (offer.restrictedRegionCodes.includes(selectedRegionCode)) {
    return {
      ok: false,
      label: "Недоступен",
      reason: "недоступен в выбранном регионе",
      attention: `${offer.name} недоступен в выбранном регионе.`,
    };
  }

  return {
    ok: true,
    label: "Доступен",
  };
}

function calculateOverpayment(
  offer: OfferCardData,
  amount: number,
  termDays: number,
) {
  if (
    offer.dailyRateFrom === null ||
    offer.dailyRateTo === null ||
    offer.dailyRateFrom < 0 ||
    offer.dailyRateTo < 0 ||
    offer.dailyRateFrom > offer.dailyRateTo
  ) {
    return null;
  }

  const from = amount * (offer.dailyRateFrom / 100) * termDays;
  const to = amount * (offer.dailyRateTo / 100) * termDays;

  return {
    ok: true,
    from,
    to,
    text: formatRange(from, to, formatMoney),
    totalText: formatRange(amount + from, amount + to, formatMoney),
  };
}

function evaluateOffer({
  offer,
  amount,
  termDays,
  selectedRegionCode,
}: {
  offer: OfferCardData;
  amount: number;
  termDays: number;
  selectedRegionCode: string | null;
}): OfferEvaluation {
  const amountCheck = checkAmount(offer, amount);
  const termCheck = checkTerm(offer, termDays);
  const regionCheck = checkRegion(offer, selectedRegionCode);
  const overpayment = calculateOverpayment(offer, amount, termDays);
  const isEligible = amountCheck.ok && termCheck.ok && regionCheck.ok;
  const ctaBlockedReason = !amountCheck.ok
    ? `Не подходит: ${amountCheck.reason}`
    : !termCheck.ok
      ? `Не подходит: ${termCheck.reason}`
      : !regionCheck.ok
        ? "Недоступен в выбранном регионе"
        : null;

  return {
    offer,
    amount: amountCheck,
    term: termCheck,
    region: regionCheck,
    overpayment,
    rateNotice:
      offer.dailyRateFrom === 0
        ? "Нулевая ставка может действовать только при выполнении условий акции. Проверьте условия у кредитора."
        : null,
    isEligible,
    ctaBlockedReason,
  };
}

function getDifferenceBlocks(
  first: OfferEvaluation,
  second: OfferEvaluation,
  {
    priority,
    sameCostText,
  }: {
    priority: ComparisonPriority;
    sameCostText: string;
  },
) {
  const differences: string[] = [];
  const matches: string[] = [];
  const attention: string[] = [];

  const rows: {
    label: string;
    first: string;
    second: string;
    compare?: "list" | "text";
    firstList?: string[];
    secondList?: string[];
  }[] = [
    {
      label: "Лимит суммы",
      first: first.offer.amount,
      second: second.offer.amount,
    },
    {
      label: "Срок",
      first: first.offer.term,
      second: second.offer.term,
    },
    {
      label: "Ориентировочная переплата",
      first:
        first.overpayment?.text ??
        "Недостаточно данных для расчета ориентировочной переплаты",
      second:
        second.overpayment?.text ??
        "Недостаточно данных для расчета ориентировочной переплаты",
    },
    {
      label: "ПСК",
      first: first.offer.psk,
      second: second.offer.psk,
    },
    {
      label: "Время рассмотрения",
      first: first.offer.decisionTime,
      second: second.offer.decisionTime,
    },
    {
      label: "Способы получения",
      first: displayList(first.offer.payoutMethods),
      second: displayList(second.offer.payoutMethods),
      compare: "list",
      firstList: first.offer.payoutMethods,
      secondList: second.offer.payoutMethods,
    },
    {
      label: "Способы погашения",
      first: displayList(first.offer.repaymentMethods),
      second: displayList(second.offer.repaymentMethods),
      compare: "list",
      firstList: first.offer.repaymentMethods,
      secondList: second.offer.repaymentMethods,
    },
    {
      label: "Документы",
      first: displayList(first.offer.documents),
      second: displayList(second.offer.documents),
      compare: "list",
      firstList: first.offer.documents,
      secondList: second.offer.documents,
    },
    {
      label: "Требования",
      first: displayList(first.offer.requirements),
      second: displayList(second.offer.requirements),
      compare: "list",
      firstList: first.offer.requirements,
      secondList: second.offer.requirements,
    },
  ];

  rows.forEach((row) => {
    const isEqual =
      row.compare === "list"
        ? listsEqual(row.firstList ?? [], row.secondList ?? [])
        : row.first === row.second;
    const text = `${row.label}: ${row.first} / ${row.second}`;

    if (isEqual) {
      matches.push(`${row.label}: ${row.first}`);
    } else {
      differences.push(text);
    }
  });

  [first, second].forEach((item) => {
    [item.amount.attention, item.term.attention, item.region.attention, item.rateNotice]
      .filter(Boolean)
      .forEach((text) => attention.push(text as string));

    if (!item.offer.conditionsCheckedAt) {
      attention.push(`У ${item.offer.name} не указана дата последней проверки условий.`);
    }

    item.offer.warnings.forEach((warning) =>
      attention.push(`${item.offer.name}: ${warning}`),
    );
  });

  if (
    first.overpayment &&
    second.overpayment &&
    Math.round(first.overpayment.from) === Math.round(second.overpayment.from) &&
    Math.round(first.overpayment.to) === Math.round(second.overpayment.to)
  ) {
    attention.push(sameCostText);
  }

  if (priority === "min_overpayment") {
    attention.push("Смотрите на диапазон ориентировочной переплаты, а не только на промоставку 0%.");
  }

  if (priority === "fast_decision") {
    attention.push("Сравните указанное время рассмотрения, но помните, что фактическое решение принимает кредитор.");
  }

  if (priority === "payout_method") {
    attention.push("Проверьте, есть ли нужный способ получения денег в карточке каждого оффера.");
  }

  if (priority === "simple_requirements") {
    attention.push("Сравните документы и требования, но финальную проверку проводит кредитор.");
  }

  return {
    differences: Array.from(new Set(differences)).slice(0, 8),
    matches: Array.from(new Set(matches)).slice(0, 6),
    attention: Array.from(new Set(attention)).slice(0, 10),
  };
}

function OfferLogo({ offer }: { offer: OfferCardData }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-emerald-50 text-lg font-black text-emerald-700">
      {offer.logoUrl ? (
        <Image
          src={offer.logoUrl}
          alt={`Логотип ${offer.name}`}
          width={44}
          height={44}
          className="h-full w-full rounded-lg bg-white object-contain p-1.5"
        />
      ) : (
        offer.logoText
      )}
    </div>
  );
}

function SelectOffer({
  label,
  value,
  offers,
  disabledSlug,
  onChange,
}: {
  label: string;
  value: string;
  offers: OfferCardData[];
  disabledSlug: string;
  onChange: (value: string) => void;
}) {
  const selectedOffer = offers.find((offer) => offer.slug === value);

  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        {selectedOffer ? (
          <span className="flex items-center gap-3">
            <OfferLogo offer={selectedOffer} />
            <span className="min-w-0">
              <span className="block font-semibold text-slate-950">
                {selectedOffer.name}
              </span>
              <span className="block text-xs leading-5 text-slate-500">
                {selectedOffer.amount} · {selectedOffer.term}
              </span>
            </span>
          </span>
        ) : null}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
        >
          {offers.map((offer) => (
            <option
              key={offer.slug}
              value={offer.slug}
              disabled={offer.slug === disabledSlug}
            >
              {offer.name} · {offer.amount} · {offer.term}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function CheckLine({ label, check }: { label: string; check: CheckResult }) {
  const className = check.ok
    ? "border-emerald-100 bg-emerald-50 text-emerald-900"
    : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <p className={`rounded-md border px-3 py-2 text-sm leading-6 ${className}`}>
      <span className="font-semibold">{label}:</span> {check.label}
      {check.reason ? ` — ${check.reason}` : ""}
    </p>
  );
}

function ComparedOffer({
  evaluation,
  pageType,
  categorySlug,
  position,
  ctaText,
}: {
  evaluation: OfferEvaluation;
  pageType: string;
  categorySlug: string;
  position: number;
  ctaText: string;
}) {
  const clickParams = new URLSearchParams({
    page_type: pageType,
    category: categorySlug,
    position: String(position),
  });

  return (
    <article className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <OfferLogo offer={evaluation.offer} />
        <div className="min-w-0">
          <h3 className="break-words text-xl font-bold text-slate-950">
            {evaluation.offer.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {evaluation.offer.amount} · {evaluation.offer.term}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <CheckLine label="Сумма" check={evaluation.amount} />
        <CheckLine label="Срок" check={evaluation.term} />
        <CheckLine label="Регион" check={evaluation.region} />
      </div>

      <dl className="grid gap-3 text-sm">
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-slate-500">Ориентировочная переплата</dt>
          <dd className="mt-1 font-semibold text-slate-950">
            {evaluation.overpayment?.text ??
              "Недостаточно данных для расчета ориентировочной переплаты."}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-slate-500">Вернуть всего</dt>
          <dd className="mt-1 font-semibold text-slate-950">
            {evaluation.overpayment?.totalText ?? "Недостаточно данных"}
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">ПСК</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {evaluation.offer.psk}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Рассмотрение</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {evaluation.offer.decisionTime}
            </dd>
          </div>
        </div>
        <div>
          <dt className="text-slate-500">Получение</dt>
          <dd className="mt-1 text-slate-800">
            {displayList(evaluation.offer.payoutMethods)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Погашение</dt>
          <dd className="mt-1 text-slate-800">
            {displayList(evaluation.offer.repaymentMethods)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Документы</dt>
          <dd className="mt-1 text-slate-800">
            {displayList(evaluation.offer.documents)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Требования</dt>
          <dd className="mt-1 text-slate-800">
            {displayList(evaluation.offer.requirements)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Проверка условий</dt>
          <dd className="mt-1 text-slate-800">
            {formatDate(evaluation.offer.conditionsCheckedAt)}
          </dd>
        </div>
      </dl>

      {evaluation.rateNotice ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {evaluation.rateNotice}
        </p>
      ) : null}

      {evaluation.isEligible ? (
        <a
          href={`/go/${evaluation.offer.slug}?${clickParams.toString()}`}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800"
        >
          {ctaText}
        </a>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          {evaluation.ctaBlockedReason}
        </p>
      )}
    </article>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}

export function LoanComparison({
  title,
  intro,
  config,
  variant,
  offers,
  pageType,
  categorySlug,
  selectedRegionCode,
}: SeoToolRenderProps<ComparisonConfig>) {
  const limits = {
    amountMin: config.limits?.amountMin ?? 1000,
    amountMax: config.limits?.amountMax ?? 100000,
    termMinDays: config.limits?.termMinDays ?? 1,
    termMaxDays: config.limits?.termMaxDays ?? 365,
  };
  const amountStep = config.steps?.amount ?? 1000;
  const termStep = config.steps?.termDays ?? 1;
  const quickAmounts = config.quickAmounts?.length
    ? config.quickAmounts
    : [5000, 10000, 15000, 30000];
  const quickTerms = config.quickTerms?.length
    ? config.quickTerms
    : [7, 14, 21, 30];
  const priorities = config.priorities?.length ? config.priorities : PRIORITIES;
  const [currentRegionCode, setCurrentRegionCode] = useState(
    selectedRegionCode ?? null,
  );
  const availableOffers = useMemo(
    () =>
      currentRegionCode
        ? offers.filter(
            (offer) => !offer.restrictedRegionCodes.includes(currentRegionCode),
          )
        : offers,
    [currentRegionCode, offers],
  );
  const [firstSlug, setFirstSlug] = useState(availableOffers[0]?.slug ?? "");
  const [secondSlug, setSecondSlug] = useState(availableOffers[1]?.slug ?? "");
  const [amountValue, setAmountValue] = useState(
    String(
      clamp(
        config.defaults?.amount ?? 10000,
        limits.amountMin,
        limits.amountMax,
      ),
    ),
  );
  const [termDaysValue, setTermDaysValue] = useState(
    String(
      clamp(
        config.defaults?.termDays ?? 14,
        limits.termMinDays,
        limits.termMaxDays,
      ),
    ),
  );
  const [priority, setPriority] = useState<ComparisonPriority>(
    config.defaults?.priority ?? "none",
  );
  const showToolHeader = pageType !== "service" || variant !== "FULL";

  useEffect(() => {
    function syncRegionFromCookie() {
      setCurrentRegionCode(readRegionCookie());
    }

    syncRegionFromCookie();
    window.addEventListener("focus", syncRegionFromCookie);
    const intervalId = window.setInterval(syncRegionFromCookie, 1000);

    return () => {
      window.removeEventListener("focus", syncRegionFromCookie);
      window.clearInterval(intervalId);
    };
  }, []);

  if (availableOffers.length < 2) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {showToolHeader ? (
          <>
            <p className="text-sm font-semibold uppercase text-emerald-700">
              Сравнение
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
            {intro ? (
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">{intro}</p>
            ) : null}
          </>
        ) : null}
        <p className={showToolHeader ? "mt-5 leading-7 text-slate-700" : "leading-7 text-slate-700"}>
          Для сравнения нужны минимум два активных оффера, доступных для текущего
          региона.
        </p>
      </section>
    );
  }

  const resolvedFirstSlug = availableOffers.some((offer) => offer.slug === firstSlug)
    ? firstSlug
    : availableOffers[0]?.slug;
  const resolvedSecondSlug =
    availableOffers.some((offer) => offer.slug === secondSlug) &&
    secondSlug !== resolvedFirstSlug
      ? secondSlug
      : availableOffers.find((offer) => offer.slug !== resolvedFirstSlug)?.slug;
  const firstOffer = availableOffers.find(
    (offer) => offer.slug === resolvedFirstSlug,
  );
  const secondOffer = availableOffers.find(
    (offer) => offer.slug === resolvedSecondSlug,
  );
  const amount = clamp(
    parsePositiveInteger(amountValue, config.defaults?.amount ?? 10000),
    limits.amountMin,
    limits.amountMax,
  );
  const termDays = clamp(
    parsePositiveInteger(termDaysValue, config.defaults?.termDays ?? 14),
    limits.termMinDays,
    limits.termMaxDays,
  );

  const firstEvaluation = firstOffer
    ? evaluateOffer({
        offer: firstOffer,
        amount,
        termDays,
        selectedRegionCode: currentRegionCode,
      })
    : null;
  const secondEvaluation = secondOffer
    ? evaluateOffer({
        offer: secondOffer,
        amount,
        termDays,
        selectedRegionCode: currentRegionCode,
      })
    : null;
  const summary =
    firstEvaluation && secondEvaluation
      ? getDifferenceBlocks(firstEvaluation, secondEvaluation, {
          priority,
          sameCostText:
            config.result?.sameCostText ??
            "По доступным данным существенной разницы в стоимости не найдено.",
        })
      : null;

  function updateAmount(value: string) {
    setAmountValue(String(clamp(parsePositiveInteger(value, amount), limits.amountMin, limits.amountMax)));
  }

  function updateTerm(value: string) {
    setTermDaysValue(String(clamp(parsePositiveInteger(value, termDays), limits.termMinDays, limits.termMaxDays)));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {showToolHeader ? (
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-700">
            Сравнение
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
          {intro ? (
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">{intro}</p>
          ) : null}
        </div>
      ) : null}

      <div className={`${showToolHeader ? "mt-6" : ""} grid gap-5`}>
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectOffer
            label={config.labels?.firstOffer ?? "Первый оффер"}
            value={resolvedFirstSlug ?? ""}
            offers={availableOffers}
            disabledSlug={resolvedSecondSlug ?? ""}
            onChange={(value) => {
              setFirstSlug(value);
              if (value === resolvedSecondSlug) {
                setSecondSlug(
                  availableOffers.find((offer) => offer.slug !== value)?.slug ?? "",
                );
              }
            }}
          />
          <SelectOffer
            label={config.labels?.secondOffer ?? "Второй оффер"}
            value={resolvedSecondSlug ?? ""}
            offers={availableOffers}
            disabledSlug={resolvedFirstSlug ?? ""}
            onChange={(value) => {
              setSecondSlug(value);
              if (value === resolvedFirstSlug) {
                setFirstSlug(
                  availableOffers.find((offer) => offer.slug !== value)?.slug ?? "",
                );
              }
            }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <label className="grid gap-2">
              <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                {config.labels?.amount ?? "Сумма займа"}
                <strong className="text-slate-950">{formatMoney(amount)}</strong>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={limits.amountMin}
                max={limits.amountMax}
                step={amountStep}
                value={amountValue}
                onChange={(event) => updateAmount(event.target.value)}
                className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmountValue(String(quickAmount))}
                  className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition ${
                    amount === quickAmount
                      ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  {formatMoney(quickAmount)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-2">
              <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                {config.labels?.termDays ?? "Срок займа"}
                <strong className="text-slate-950">{getTermText(termDays)}</strong>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={limits.termMinDays}
                max={limits.termMaxDays}
                step={termStep}
                value={termDaysValue}
                onChange={(event) => updateTerm(event.target.value)}
                className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {quickTerms.map((quickTerm) => (
                <button
                  key={quickTerm}
                  type="button"
                  onClick={() => setTermDaysValue(String(quickTerm))}
                  className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition ${
                    termDays === quickTerm
                      ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  {getTermText(quickTerm)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-slate-700">
            {config.labels?.priority ?? "Что важнее"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {priorities.map((item) => (
              <label
                key={item.value}
                className={`inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3 text-sm font-semibold transition ${
                  priority === item.value
                    ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                }`}
              >
                <input
                  type="radio"
                  name="comparisonPriority"
                  value={item.value}
                  checked={priority === item.value}
                  onChange={() => setPriority(item.value)}
                  className="sr-only"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          {currentRegionCode
            ? `Учитывается выбранный регион сайта: ${currentRegionCode}.`
            : "Регион не выбран, региональные ограничения не учитывались."}
        </p>
      </div>

      {firstEvaluation && secondEvaluation && summary ? (
        <div aria-live="polite" className="mt-6 grid gap-5">
          <div>
            <h3 className="text-xl font-bold text-slate-950">
              {config.result?.title ?? "Сравнение по выбранным параметрам"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Инструмент не выбирает победителя и показывает только различия по
              доступным данным карточек.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ComparedOffer
              evaluation={firstEvaluation}
              pageType={pageType}
              categorySlug={categorySlug}
              position={1}
              ctaText={config.cta?.text ?? "Перейти к предложению"}
            />
            <ComparedOffer
              evaluation={secondEvaluation}
              pageType={pageType}
              categorySlug={categorySlug}
              position={2}
              ctaText={config.cta?.text ?? "Перейти к предложению"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SummaryList
              title="Что действительно отличается"
              items={summary.differences}
            />
            <SummaryList title="Что совпадает" items={summary.matches} />
            <SummaryList
              title="На что обратить внимание"
              items={summary.attention}
            />
          </div>
        </div>
      ) : null}

      {config.riskNotice?.text ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {config.riskNotice.text}
        </p>
      ) : null}
    </section>
  );
}
