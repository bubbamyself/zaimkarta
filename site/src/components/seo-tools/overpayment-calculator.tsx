"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { publishCalculatorAnalytics } from "@/lib/calculator-analytics";
import {
  buildOverpaymentShareUrl,
  OVERPAYMENT_SLUG,
} from "@/lib/calculator-share";
import {
  getOverpaymentResultCopy,
  getOverpaymentTemplateState,
} from "@/lib/overpayment-result-copy";
import { CalculatorShareActions } from "./calculator-share-actions";
import { publishOfferAmountFilter } from "./filterable-offers";
import type {
  OverpaymentCalculatorConfig,
  SeoToolRenderProps,
} from "./types";

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "RUB",
  }).format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeToStep(value: number, min: number, max: number, step: number) {
  const precision = String(step).split(".")[1]?.length ?? 0;
  const normalized = min + Math.round((value - min) / step) * step;
  return Number(clamp(normalized, min, max).toFixed(precision));
}

function getDaysText(days: number) {
  const absoluteDays = Math.abs(days);
  const lastDigit = absoluteDays % 10;
  const lastTwoDigits = absoluteDays % 100;
  const unit =
    lastDigit === 1 && lastTwoDigits !== 11
      ? "день"
      : lastDigit >= 2 &&
          lastDigit <= 4 &&
          (lastTwoDigits < 12 || lastTwoDigits > 14)
        ? "дня"
        : "дней";

  return `${absoluteDays} ${unit}`;
}

function ResultRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border bg-white p-3 ${
        strong ? "border-emerald-300" : "border-transparent"
      }`}
    >
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd
        className={`${strong ? "text-lg" : ""} text-right font-bold text-slate-950`}
      >
        {value}
      </dd>
    </div>
  );
}

export function OverpaymentCalculator({
  title,
  intro,
  config,
  variant,
  offers,
  pageType,
  categorySlug,
  calculatorShare,
  offerFilterTarget,
}: SeoToolRenderProps<OverpaymentCalculatorConfig>) {
  const limits = {
    amountMin: config.limits?.amountMin ?? 1000,
    amountMax: config.limits?.amountMax ?? 100000,
    termMinDays: config.limits?.termMinDays ?? 1,
    termMaxDays: config.limits?.termMaxDays ?? 365,
    dailyRateMin: config.limits?.dailyRateMin ?? 0,
    dailyRateMax: config.limits?.dailyRateMax ?? 1,
  };
  const steps = {
    amount: config.steps?.amount ?? 1000,
    termDays: config.steps?.termDays ?? 1,
    dailyRate: config.steps?.dailyRate ?? 0.1,
  };
  const quickAmounts = [5000, 10000, 15000, 30000].filter(
    (value) => value >= limits.amountMin && value <= limits.amountMax,
  );
  const quickTerms = [7, 14, 21, 30].filter(
    (value) => value >= limits.termMinDays && value <= limits.termMaxDays,
  );
  const quickRates = [0, 0.5, 0.8, 1].filter(
    (value) => value >= limits.dailyRateMin && value <= limits.dailyRateMax,
  );
  const sharedData =
    calculatorShare?.tool === "overpayment" &&
    calculatorShare.amount >= limits.amountMin &&
    calculatorShare.amount <= limits.amountMax &&
    calculatorShare.term >= limits.termMinDays &&
    calculatorShare.term <= limits.termMaxDays &&
    calculatorShare.rate >= limits.dailyRateMin &&
    calculatorShare.rate <= limits.dailyRateMax
      ? calculatorShare
      : null;
  const [amount, setAmount] = useState(
    sharedData?.amount ??
      clamp(config.defaults?.amount ?? 10000, limits.amountMin, limits.amountMax),
  );
  const [termDays, setTermDays] = useState(
    sharedData?.term ??
      clamp(config.defaults?.termDays ?? 14, limits.termMinDays, limits.termMaxDays),
  );
  const [dailyRate, setDailyRate] = useState(
    sharedData?.rate ??
      clamp(
        config.defaults?.dailyRate ?? 0.8,
        limits.dailyRateMin,
        limits.dailyRateMax,
      ),
  );
  const [hasUserChanged, setHasUserChanged] = useState(false);
  const trackedResults = useRef(new Set<string>());
  const trackedSharedChange = useRef(false);
  const result = useMemo(() => {
    const interest = amount * (dailyRate / 100) * termDays;

    return {
      dailyCost: termDays > 0 ? interest / termDays : 0,
      interest,
      totalReturn: amount + interest,
    };
  }, [amount, dailyRate, termDays]);
  const resultCopy = getOverpaymentResultCopy({
    amount,
    termDays,
    dailyRate,
    overpayment: result.interest,
    totalReturn: result.totalReturn,
    dailyCost: result.dailyCost,
  });
  const hasOffers = offers.length > 0;
  const matchingOffers = offers.filter(
    (offer) =>
      (offer.minAmount === null || offer.minAmount <= amount) &&
      (offer.maxAmount === null || offer.maxAmount >= amount) &&
      (offer.minTermDays === null || offer.minTermDays <= termDays) &&
      (offer.maxTermDays === null || offer.maxTermDays >= termDays),
  );
  const showToolHeader = pageType !== "service" || variant !== "FULL";
  const source = sharedData ? "shared" : "direct";

  useEffect(() => {
    if (!sharedData) {
      return;
    }

    publishCalculatorAnalytics("shared_link_opened", {
      tool_type: "overpayment",
      page_slug: categorySlug,
      source: "shared",
    });
  }, [categorySlug, sharedData]);

  useEffect(() => {
    if (!hasUserChanged) {
      return;
    }

    const key = `${amount}|${termDays}|${dailyRate}`;

    if (!trackedResults.current.has(key)) {
      trackedResults.current.add(key);
      publishCalculatorAnalytics("calculator_personalized_result_viewed", {
        tool_type: "overpayment",
        page_slug: categorySlug,
        template_state: getOverpaymentTemplateState({
          amount,
          termDays,
          dailyRate,
          overpayment: result.interest,
          totalReturn: result.totalReturn,
          dailyCost: result.dailyCost,
        }),
        source,
      });
    }

    if (sharedData && !trackedSharedChange.current) {
      trackedSharedChange.current = true;
      publishCalculatorAnalytics("shared_calculator_changed", {
        tool_type: "overpayment",
        page_slug: categorySlug,
        source: "shared",
      });
    }
  }, [
    amount,
    categorySlug,
    dailyRate,
    hasUserChanged,
    result,
    sharedData,
    source,
    termDays,
  ]);

  function markUserChanged() {
    setHasUserChanged(true);
  }

  function handleOffersClick() {
    publishCalculatorAnalytics("calculator_offer_list_requested", {
      tool_type: "overpayment",
      page_slug: categorySlug,
      scenario: "amount_term",
      source,
    });
    publishOfferAmountFilter({
      amount,
      termDays,
      target: offerFilterTarget,
      sourceTool: "overpayment",
      source,
    });
  }

  function updateAmount(value: number) {
    if (!Number.isFinite(value)) return;
    markUserChanged();
    setAmount(clamp(value, limits.amountMin, limits.amountMax));
  }

  function updateTermDays(value: number) {
    if (!Number.isFinite(value)) return;
    markUserChanged();
    setTermDays(Math.round(clamp(value, limits.termMinDays, limits.termMaxDays)));
  }

  function updateDailyRate(value: number) {
    if (!Number.isFinite(value)) return;
    markUserChanged();
    setDailyRate(clamp(value, limits.dailyRateMin, limits.dailyRateMax));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-5">
          {showToolHeader ? (
            <>
              <p className="text-sm font-semibold uppercase text-emerald-700">
                Интерактивный расчет
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
              {intro ? (
                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                  {intro}
                </p>
              ) : null}
            </>
          ) : null}

          <section
            className={`${showToolHeader ? "mt-1" : ""} grid gap-5 rounded-xl border border-slate-200 p-4`}
          >
            <div>
              <p className="text-sm font-semibold text-emerald-700">Шаг 1</p>
              <h3 className="text-xl font-bold text-slate-950">Параметры займа</h3>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid content-start gap-3">
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
                    step={steps.amount}
                    value={amount}
                    onChange={(event) => updateAmount(Number(event.target.value))}
                    onBlur={() =>
                      setAmount(
                        normalizeToStep(
                          amount,
                          limits.amountMin,
                          limits.amountMax,
                          steps.amount,
                        ),
                      )
                    }
                    className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateAmount(value)}
                      className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition ${
                        amount === value
                          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                      }`}
                    >
                      {formatMoney(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid content-start gap-3">
                <label className="grid gap-2">
                  <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                    {config.labels?.termDays ?? "Срок займа"}
                    <strong className="text-slate-950">
                      {getDaysText(termDays)}
                    </strong>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={limits.termMinDays}
                    max={limits.termMaxDays}
                    step={steps.termDays}
                    value={termDays}
                    onChange={(event) => updateTermDays(Number(event.target.value))}
                    className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickTerms.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateTermDays(value)}
                      className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition ${
                        termDays === value
                          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                      }`}
                    >
                      {getDaysText(value)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid content-start gap-3">
              <label className="grid gap-2">
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                  {config.labels?.dailyRate ?? "Ставка в день, %"}
                  <strong className="text-slate-950">
                    {dailyRate.toLocaleString("ru-RU")}% в день
                  </strong>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={limits.dailyRateMin}
                  max={limits.dailyRateMax}
                  step={steps.dailyRate}
                  value={dailyRate}
                  onChange={(event) => updateDailyRate(Number(event.target.value))}
                  onBlur={() =>
                    setDailyRate(
                      normalizeToStep(
                        dailyRate,
                        limits.dailyRateMin,
                        limits.dailyRateMax,
                        steps.dailyRate,
                      ),
                    )
                  }
                  className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {quickRates.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateDailyRate(value)}
                    className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition ${
                      dailyRate === value
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                    }`}
                  >
                    {value.toLocaleString("ru-RU")}% в день
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside
          aria-live="polite"
          className="rounded-lg border border-emerald-100 bg-emerald-50 p-5"
        >
          {sharedData ? (
            <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">
              Вы открыли расчёт, которым с вами поделились. Измените параметры,
              чтобы рассчитать свой вариант.
            </p>
          ) : null}
          <h3 className="text-xl font-bold text-slate-950">
            {config.result?.title ?? "Ориентировочный расчет"}
          </h3>
          <dl className="mt-4 grid gap-2">
            {config.result?.showOverpayment !== false ? (
              <ResultRow label="Переплата" value={formatMoney(result.interest)} />
            ) : null}
            {config.result?.showTotalReturn !== false ? (
              <ResultRow
                label="Вернуть всего"
                value={formatMoney(result.totalReturn)}
                strong
              />
            ) : null}
            {config.result?.showDailyCost !== false ? (
              <ResultRow
                label="Стоимость одного дня"
                value={formatMoney(result.dailyCost)}
              />
            ) : null}
          </dl>
          {config.result?.formulaNote ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
              {config.result.formulaNote}
            </p>
          ) : null}
          {hasOffers ? (
            <a
              href="#offers"
              onClick={handleOffersClick}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800"
            >
              {config.cta?.text?.trim() &&
              config.cta.text.trim() !== "Посмотреть предложения"
                ? config.cta.text
                    .replace("{amount}", formatMoney(amount))
                    .replace("{term_days}", getDaysText(termDays))
                : "Выбрать подходящий займ"}
            </a>
          ) : null}
          <CalculatorShareActions
            createUrl={() =>
              buildOverpaymentShareUrl({
                origin: window.location.origin,
                amount,
                term: termDays,
                rate: dailyRate,
              })
            }
            title={`${formatMoney(amount)} — расчёт переплаты`}
            text={resultCopy.paragraphs[0]}
            toolType="overpayment"
            pageSlug={categorySlug || OVERPAYMENT_SLUG}
            source={source}
          />
        </aside>
      </div>

      <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Персональный разбор
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-950">
          {resultCopy.title}
        </h3>
        <div className="mt-4 grid max-w-4xl gap-4 text-base leading-7 text-slate-700">
          {resultCopy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {config.riskNotice?.text ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {config.riskNotice.text}
        </p>
      ) : null}

      {hasOffers && matchingOffers.length === 0 ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          В этой подборке нет офферов под выбранные сумму и срок.
        </p>
      ) : null}
    </section>
  );
}
