"use client";

import { useMemo, useState } from "react";
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

export function OverpaymentCalculator({
  title,
  intro,
  config,
  offers,
}: SeoToolRenderProps<OverpaymentCalculatorConfig>) {
  const limits = {
    amountMin: config.limits?.amountMin ?? 1000,
    amountMax: config.limits?.amountMax ?? 100000,
    termMinDays: config.limits?.termMinDays ?? 1,
    termMaxDays: config.limits?.termMaxDays ?? 365,
    dailyRateMin: config.limits?.dailyRateMin ?? 0,
    dailyRateMax: config.limits?.dailyRateMax ?? 1,
  };
  const [amount, setAmount] = useState(
    clamp(config.defaults?.amount ?? 10000, limits.amountMin, limits.amountMax),
  );
  const [termDays, setTermDays] = useState(
    clamp(config.defaults?.termDays ?? 14, limits.termMinDays, limits.termMaxDays),
  );
  const [dailyRate, setDailyRate] = useState(
    clamp(
      config.defaults?.dailyRate ?? 0.8,
      limits.dailyRateMin,
      limits.dailyRateMax,
    ),
  );
  const result = useMemo(() => {
    const interest = amount * (dailyRate / 100) * termDays;

    return {
      dailyCost: termDays > 0 ? interest / termDays : 0,
      interest,
      totalReturn: amount + interest,
    };
  }, [amount, dailyRate, termDays]);
  const hasOffers = offers.length > 0;
  const matchingOffers = offers.filter(
    (offer) => offer.maxAmount === null || offer.maxAmount >= amount,
  );

  function handleOffersClick() {
    publishOfferAmountFilter(amount);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-700">
            Интерактивный расчет
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
          {intro ? (
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">{intro}</p>
          ) : null}

          <div className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="flex items-center justify-between text-sm font-medium text-slate-700">
                {config.labels?.amount ?? "Сумма займа"}
                <strong className="text-slate-950">{formatMoney(amount)}</strong>
              </span>
              <input
                type="range"
                min={limits.amountMin}
                max={limits.amountMax}
                step={config.steps?.amount ?? 1000}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="accent-emerald-700"
              />
            </label>

            <label className="grid gap-2">
              <span className="flex items-center justify-between text-sm font-medium text-slate-700">
                {config.labels?.termDays ?? "Срок, дней"}
                <strong className="text-slate-950">{termDays} дней</strong>
              </span>
              <input
                type="range"
                min={limits.termMinDays}
                max={limits.termMaxDays}
                step={config.steps?.termDays ?? 1}
                value={termDays}
                onChange={(event) => setTermDays(Number(event.target.value))}
                className="accent-emerald-700"
              />
            </label>

            <label className="grid gap-2">
              <span className="flex items-center justify-between text-sm font-medium text-slate-700">
                {config.labels?.dailyRate ?? "Ставка в день"}
                <strong className="text-slate-950">
                  {dailyRate.toLocaleString("ru-RU")}% в день
                </strong>
              </span>
              <input
                type="range"
                min={limits.dailyRateMin}
                max={limits.dailyRateMax}
                step={config.steps?.dailyRate ?? 0.1}
                value={dailyRate}
                onChange={(event) => setDailyRate(Number(event.target.value))}
                className="accent-emerald-700"
              />
            </label>
          </div>
        </div>

        <aside className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <h3 className="text-lg font-bold text-slate-950">
            {config.result?.title ?? "Ориентировочный расчет"}
          </h3>
          <dl className="mt-4 grid gap-3">
            {config.result?.showOverpayment !== false ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Переплата</dt>
                <dd className="font-bold text-slate-950">
                  {formatMoney(result.interest)}
                </dd>
              </div>
            ) : null}
            {config.result?.showTotalReturn !== false ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Вернуть всего</dt>
                <dd className="font-bold text-slate-950">
                  {formatMoney(result.totalReturn)}
                </dd>
              </div>
            ) : null}
            {config.result?.showDailyCost !== false ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">В день</dt>
                <dd className="font-bold text-slate-950">
                  {formatMoney(result.dailyCost)}
                </dd>
              </div>
            ) : null}
          </dl>
          {config.result?.formulaNote ? (
            <p className="mt-4 text-xs leading-5 text-slate-600">
              {config.result.formulaNote}
            </p>
          ) : null}
          {hasOffers ? (
            <a
              href="#offers"
              onClick={handleOffersClick}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800"
            >
              {config.cta?.text ?? "Посмотреть предложения"}
            </a>
          ) : null}
        </aside>
      </div>

      {config.riskNotice?.text ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {config.riskNotice.text}
        </p>
      ) : null}

      {hasOffers && matchingOffers.length === 0 ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          В этой подборке нет офферов с максимальной суммой от{" "}
          {amount.toLocaleString("ru-RU")} ₽.
        </p>
      ) : null}
    </section>
  );
}
