"use client";

import { useMemo, useState } from "react";
import {
  calculateRepaymentDate,
  toLocalInputDateValue,
} from "@/lib/repayment-date";
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
  const [startDateValue, setStartDateValue] = useState(
    toLocalInputDateValue(today),
  );
  const [termDaysValue, setTermDaysValue] = useState(
    String(
      Math.min(
        Math.max(config.defaults?.termDays ?? 30, limits.termMinDays),
        limits.termMaxDays,
      ),
    ),
  );
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
  const showToolHeader = pageType !== "service" || variant !== "FULL";

  function handleOffersClick() {
    if (result.ok) {
      publishOfferTermFilter(result.termDays);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
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

          <div className={`${showToolHeader ? "mt-6" : ""} grid gap-5`}>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">
                {config.labels?.startDate ?? "Когда вы получили деньги?"}
              </span>
              <input
                type="date"
                value={startDateValue}
                onChange={(event) => setStartDateValue(event.target.value)}
                className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
              />
            </label>

            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {config.labels?.termDays ?? "На какой срок вы взяли займ?"}
                </span>
                <span className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={limits.termMinDays}
                    max={limits.termMaxDays}
                    step="1"
                    value={termDaysValue}
                    onChange={(event) => setTermDaysValue(event.target.value)}
                    className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-600">
                    {config.labels?.termUnit ?? "дней"}
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                {quickTerms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setTermDaysValue(String(term))}
                    className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition ${
                      termDaysValue === String(term)
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {getTermDaysText(term)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside
          aria-live="polite"
          className="rounded-lg border border-emerald-100 bg-emerald-50 p-5"
        >
          {result.ok ? (
            <>
              <p className="text-sm font-medium text-emerald-800">
                Ориентировочная дата
              </p>
              <h3 className="mt-2 text-2xl font-bold leading-tight text-slate-950">
                {resultTitle}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {formatWeekday(result.repaymentDate)} · срок займа{" "}
                {getTermDaysText(result.termDays)}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {result.isPast
                  ? (config.result?.pastText ??
                    "Расчетная дата возврата уже прошла. Проверьте актуальный статус займа в личном кабинете кредитора.")
                  : result.isToday
                    ? (config.result?.todayText ??
                      "Расчетная дата возврата приходится на сегодня.")
                    : applyTemplate(
                        config.result?.futureTextTemplate ??
                          "До расчетной даты осталось {days}.",
                        {
                          days: getDaysUntilText(result.daysUntil),
                        },
                      )}
              </p>
              {result.isWeekend ? (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  {config.result?.weekendWarning ??
                    "Расчетная дата приходится на выходной. Возможность переноса платежа зависит от условий договора и правил кредитора."}
                </p>
              ) : null}
              <a
                href="#offers"
                onClick={handleOffersClick}
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                {config.cta?.text ?? "Посмотреть предложения"}
              </a>
            </>
          ) : (
            <p className="text-sm leading-6 text-amber-900">{result.error}</p>
          )}
        </aside>
      </div>

      {config.riskNotice?.text ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {config.riskNotice.text}
        </p>
      ) : null}
    </section>
  );
}
