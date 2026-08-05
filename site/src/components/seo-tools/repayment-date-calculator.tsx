"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalculatorShareActions } from "./calculator-share-actions";
import {
  calculateRepaymentDate,
  toLocalInputDateValue,
} from "@/lib/repayment-date";
import {
  buildRepaymentShareUrl,
  REPAYMENT_DATE_SLUG,
} from "@/lib/calculator-share";
import { publishCalculatorAnalytics } from "@/lib/calculator-analytics";
import {
  getRepaymentDateResultCopy,
  getRepaymentDateTemplateState,
} from "@/lib/repayment-date-result-copy";
import { publishOfferTermFilter } from "./filterable-offers";
import type {
  RepaymentDateCalculatorConfig,
  SeoToolRenderProps,
} from "./types";

function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
  }).format(date);
}

function getDaysUntilText(daysUntil: number) {
  const absoluteDays = Math.abs(daysUntil);
  const lastDigit = absoluteDays % 10;
  const lastTwoDigits = absoluteDays % 100;
  const unit =
    lastDigit === 1 && lastTwoDigits !== 11
      ? "календарный день"
      : lastDigit >= 2 &&
          lastDigit <= 4 &&
          (lastTwoDigits < 12 || lastTwoDigits > 14)
        ? "календарных дня"
        : "календарных дней";

  return `${absoluteDays} ${unit}`;
}

function getTermDaysText(termDays: number) {
  const absoluteDays = Math.abs(termDays);
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

function applyTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

export function RepaymentDateCalculator({
  title,
  intro,
  config,
  variant,
  offers,
  pageType,
  categorySlug,
  calculatorShare,
  offerFilterTarget,
}: SeoToolRenderProps<RepaymentDateCalculatorConfig>) {
  const today = useMemo(() => new Date(), []);
  const configuredTermMaxDays = config.limits?.termMaxDays ?? 365;
  const maximumOfferTermDays = Math.max(
    0,
    ...offers.flatMap((offer) =>
      offer.maxTermDays === null ? [] : [offer.maxTermDays],
    ),
  );
  const limits = {
    termMinDays: config.limits?.termMinDays ?? 1,
    termMaxDays:
      maximumOfferTermDays > 0
        ? Math.min(configuredTermMaxDays, maximumOfferTermDays)
        : configuredTermMaxDays,
  };
  const quickTerms = config.quickTerms?.length
    ? config.quickTerms.filter(
        (term) => term >= limits.termMinDays && term <= limits.termMaxDays,
      )
    : [7, 14, 21, 30].filter(
        (term) => term >= limits.termMinDays && term <= limits.termMaxDays,
      );
  const sharedData =
    calculatorShare?.tool === "repayment_date" &&
    calculatorShare.term >= limits.termMinDays &&
    calculatorShare.term <= limits.termMaxDays
      ? calculatorShare
      : null;
  const [startDateValue, setStartDateValue] = useState(
    sharedData?.start ?? toLocalInputDateValue(today),
  );
  const [termDaysValue, setTermDaysValue] = useState(
    sharedData
      ? String(sharedData.term)
      : String(
          Math.min(
            Math.max(config.defaults?.termDays ?? 30, limits.termMinDays),
            limits.termMaxDays,
          ),
        ),
  );
  const [hasUserChanged, setHasUserChanged] = useState(false);
  const trackedResults = useRef(new Set<string>());
  const trackedSharedChange = useRef(false);
  const result = calculateRepaymentDate({
    startDateValue,
    termDaysValue,
    minTermDays: limits.termMinDays,
    maxTermDays: limits.termMaxDays,
    today,
  });
  const resultDateText = result.ok ? formatDateLong(result.repaymentDate) : "";
  const resultTitle = result.ok
    ? applyTemplate(config.result?.titleTemplate ?? "Вернуть займ: {date}", {
        date: resultDateText,
      })
    : "";
  const resultCopy = result.ok ? getRepaymentDateResultCopy(result) : null;
  const showToolHeader = pageType !== "service" || variant !== "FULL";
  const source = sharedData ? "shared" : "direct";

  useEffect(() => {
    if (!sharedData) {
      return;
    }

    publishCalculatorAnalytics("shared_link_opened", {
      tool_type: "repayment_date",
      page_slug: categorySlug,
      source: "shared",
    });
  }, [categorySlug, sharedData]);

  useEffect(() => {
    if (!hasUserChanged || !result.ok) {
      return;
    }

    const key = `${startDateValue}|${result.termDays}`;

    if (!trackedResults.current.has(key)) {
      trackedResults.current.add(key);
      publishCalculatorAnalytics("calculator_personalized_result_viewed", {
        tool_type: "repayment_date",
        page_slug: categorySlug,
        template_state: getRepaymentDateTemplateState(result),
        source,
      });
    }

    if (sharedData && !trackedSharedChange.current) {
      trackedSharedChange.current = true;
      publishCalculatorAnalytics("shared_calculator_changed", {
        tool_type: "repayment_date",
        page_slug: categorySlug,
        source: "shared",
      });
    }
  }, [categorySlug, hasUserChanged, result, sharedData, source, startDateValue]);

  function markUserChanged() {
    setHasUserChanged(true);
  }

  function handleOffersClick() {
    if (result.ok) {
      publishCalculatorAnalytics("calculator_offer_list_requested", {
        tool_type: "repayment_date",
        page_slug: categorySlug,
        scenario: "term",
        source,
      });
      publishOfferTermFilter(result.termDays, {
        target: offerFilterTarget,
        sourceTool: "repayment_date",
        source,
      });
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="overflow-hidden rounded-xl border border-slate-200 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <div className="grid gap-5 p-4 sm:p-5">
          {showToolHeader ? (
            <>
              <p className="text-sm font-semibold uppercase text-emerald-700">
                Календарный расчет
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
              {intro ? (
                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                  {intro}
                </p>
              ) : null}
            </>
          ) : null}

          <section className={`${showToolHeader ? "mt-1" : ""} grid gap-5`}>
            <div>
              <p className="text-sm font-semibold text-emerald-700">Шаг 1</p>
              <h3 className="text-xl font-bold text-slate-950">Параметры займа</h3>
            </div>

            <div className="grid items-start gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {config.labels?.startDate ?? "Когда вы получили деньги?"}
                </span>
                <input
                  type="date"
                  value={startDateValue}
                  onChange={(event) => {
                    markUserChanged();
                    setStartDateValue(event.target.value);
                  }}
                  className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <span className="text-xs leading-5 text-slate-600">
                  Укажите дату, когда деньги поступили вам.
                </span>
              </label>

              <div className="grid content-start gap-3">
                <label className="grid gap-2">
                  <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                    {config.labels?.termDays ?? "На какой срок вы взяли займ?"}
                    <strong className="text-slate-950">
                      {/^\d+$/.test(termDaysValue)
                        ? getTermDaysText(Number(termDaysValue))
                        : "—"}
                    </strong>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={limits.termMinDays}
                    max={limits.termMaxDays}
                    step="1"
                    value={termDaysValue}
                    onChange={(event) => {
                      markUserChanged();
                      setTermDaysValue(event.target.value);
                    }}
                    className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {quickTerms.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        markUserChanged();
                        setTermDaysValue(String(term));
                      }}
                      className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition ${
                        termDaysValue === String(term)
                          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                      }`}
                    >
                      {getTermDaysText(term)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside
          aria-live="polite"
          className="border-t border-emerald-100 bg-emerald-50 p-4 sm:p-5 lg:border-l lg:border-t-0"
        >
          {result.ok ? (
            <>
              {sharedData ? (
                <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">
                  Вы открыли расчёт, которым с вами поделились. Измените параметры,
                  чтобы рассчитать свой вариант.
                </p>
              ) : null}
              <h3 className="text-lg font-bold text-slate-950">
                Ориентировочный результат
              </h3>
              <p className="mt-3 text-xl font-bold leading-snug text-slate-950">
                {resultTitle}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                {formatWeekday(result.repaymentDate)} · срок займа{" "}
                {getTermDaysText(result.termDays)}
              </p>
              <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-700">
                {result.isPast
                  ? (config.result?.pastText ??
                    "Расчетная дата возврата уже прошла. Проверьте актуальный статус займа в личном кабинете кредитора.")
                  : result.isToday
                    ? (config.result?.todayText ??
                      "Расчетная дата возврата приходится на сегодня.")
                    : applyTemplate(
                        config.result?.futureTextTemplate ??
                          "До расчетной даты осталось {days}.",
                        { days: getDaysUntilText(result.daysUntil) },
                      )}
              </p>
              {result.isWeekend ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">
                  {config.result?.weekendWarning ??
                    "Расчетная дата приходится на выходной. Возможность переноса платежа зависит от условий договора и правил кредитора."}
                </p>
              ) : null}
              <a
                href="#offers"
                onClick={handleOffersClick}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                {config.cta?.text?.trim() &&
                config.cta.text.trim() !== "Посмотреть предложения"
                  ? config.cta.text.replace(
                      "{term_days}",
                      getTermDaysText(result.termDays),
                    )
                  : `Показать займы на ${getTermDaysText(result.termDays)}`}
              </a>
              <CalculatorShareActions
                createUrl={() =>
                  buildRepaymentShareUrl({
                    origin: window.location.origin,
                    start: startDateValue,
                    term: result.termDays,
                  })
                }
                title={resultTitle}
                text={resultCopy?.paragraphs[0] ?? resultTitle}
                toolType="repayment_date"
                pageSlug={categorySlug || REPAYMENT_DATE_SLUG}
                source={source}
              />
            </>
          ) : (
            <p className="text-sm leading-6 text-amber-900">{result.error}</p>
          )}
        </aside>
      </div>

      {resultCopy ? (
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
          {resultCopy.warning ? (
            <p className="mt-4 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {resultCopy.warning}
            </p>
          ) : null}
        </section>
      ) : null}

      {config.riskNotice?.text ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {config.riskNotice.text}
        </p>
      ) : null}
    </section>
  );
}
