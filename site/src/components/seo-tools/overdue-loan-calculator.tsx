"use client";

import { useMemo, useState } from "react";
import {
  calculateOverdueLoan,
  toLocalInputDateValue,
  type InterestMode,
} from "@/lib/overdue-loan";
import type {
  OverdueLoanCalculatorConfig,
  SeoToolRenderProps,
} from "./types";

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "RUB",
  }).format(value);
}
function formatPercent(value: number) {
  return `${value.toLocaleString("ru-RU")}%`;
}

function numberValue(value: number | undefined, fallback: number) {
  return String(value ?? fallback);
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-1 rounded-md bg-white p-3 sm:flex-row sm:items-center">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="font-bold text-slate-950">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "number",
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "number" | "date";
  min?: number;
  max?: number;
  step?: number | string;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      />
      {hint ? <span className="text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function OverdueLoanCalculator({
  title,
  intro,
  config,
  variant,
  pageType,
}: SeoToolRenderProps<OverdueLoanCalculatorConfig>) {
  const todayValue = useMemo(() => toLocalInputDateValue(new Date()), []);
  const [dueDateValue, setDueDateValue] = useState(todayValue);
  const [calculationDateValue, setCalculationDateValue] = useState(todayValue);
  const [principalDebtValue, setPrincipalDebtValue] = useState(
    numberValue(config.defaults?.principalDebt, 10000),
  );
  const [accruedInterestAtDueDateValue, setAccruedInterestAtDueDateValue] =
    useState(numberValue(config.defaults?.accruedInterestAtDueDate, 0));
  const [interestMode, setInterestMode] = useState<InterestMode>(
    config.defaults?.interestMode ?? "unknown",
  );
  const [dailyRateValue, setDailyRateValue] = useState(
    numberValue(config.defaults?.dailyRate, 0.8),
  );
  const [annualPenaltyRateValue, setAnnualPenaltyRateValue] = useState(
    numberValue(config.defaults?.annualPenaltyRate, 0),
  );
  const [dailyPenaltyRateValue, setDailyPenaltyRateValue] = useState(
    numberValue(config.defaults?.dailyPenaltyRate, 0),
  );
  const [contractDateValue, setContractDateValue] = useState("");
  const [originalPrincipalAmountValue, setOriginalPrincipalAmountValue] =
    useState("");
  const [initialTermDaysValue, setInitialTermDaysValue] = useState("");
  const [otherChargesValue, setOtherChargesValue] = useState("");
  const showToolHeader = pageType !== "service" || variant !== "FULL";
  const limits = {
    principalDebtMin: config.limits?.principalDebtMin ?? 0,
    principalDebtMax: config.limits?.principalDebtMax ?? 1000000,
    accruedInterestMin: config.limits?.accruedInterestMin ?? 0,
    accruedInterestMax: config.limits?.accruedInterestMax ?? 1000000,
    dailyRateMin: config.limits?.dailyRateMin ?? 0,
    dailyRateMax: config.limits?.dailyRateMax ?? 5,
    annualPenaltyRateMin: config.limits?.annualPenaltyRateMin ?? 0,
    annualPenaltyRateMax: config.limits?.annualPenaltyRateMax ?? 100,
    dailyPenaltyRateMin: config.limits?.dailyPenaltyRateMin ?? 0,
    dailyPenaltyRateMax: config.limits?.dailyPenaltyRateMax ?? 5,
  };
  const result = calculateOverdueLoan({
    dueDateValue,
    calculationDateValue,
    principalDebtValue,
    accruedInterestAtDueDateValue,
    interestMode,
    dailyRateValue,
    annualPenaltyRateValue,
    dailyPenaltyRateValue,
    contractDateValue,
    originalPrincipalAmountValue,
    initialTermDaysValue,
    otherChargesValue,
  });
  const checkItems = [
    "начисляются ли проценты после просрочки",
    "размер и тип неустойки",
    "базу начисления неустойки",
    "актуальный остаток после частичных платежей",
    "наличие продлений или реструктуризации",
    "применимость общего лимита",
    "расчет задолженности в личном кабинете кредитора",
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {showToolHeader ? (
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-700">
            Ориентировочный расчет
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
          {intro ? (
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">{intro}</p>
          ) : null}
        </div>
      ) : null}

      <div className={`${showToolHeader ? "mt-6" : ""} grid gap-6 lg:grid-cols-[1fr_380px]`}>
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              type="date"
              label={config.labels?.dueDate ?? "Дата платежа по договору"}
              value={dueDateValue}
              onChange={setDueDateValue}
            />
            <Field
              type="date"
              label={config.labels?.calculationDate ?? "Дата расчета"}
              value={calculationDateValue}
              onChange={setCalculationDateValue}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={
                config.labels?.principalDebt ?? "Непогашенный основной долг"
              }
              value={principalDebtValue}
              onChange={setPrincipalDebtValue}
              min={limits.principalDebtMin}
              max={limits.principalDebtMax}
              step="0.01"
            />
            <Field
              label={
                config.labels?.accruedInterestAtDueDate ??
                "Начисленные проценты на дату платежа"
              }
              value={accruedInterestAtDueDateValue}
              onChange={setAccruedInterestAtDueDateValue}
              min={limits.accruedInterestMin}
              max={limits.accruedInterestMax}
              step="0.01"
              hint={config.hints?.partialPayments}
            />
          </div>

          <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">
              {config.labels?.interestMode ??
                "После просрочки договорные проценты продолжают начисляться?"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "yes", label: "Да" },
                { value: "no", label: "Нет" },
                { value: "unknown", label: "Не уверен" },
              ].map((item) => (
                <label
                  key={item.value}
                  className={`inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3 text-sm font-semibold transition ${
                    interestMode === item.value
                      ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="interestMode"
                    value={item.value}
                    checked={interestMode === item.value}
                    onChange={() => setInterestMode(item.value as InterestMode)}
                    className="sr-only"
                  />
                  {item.label}
                </label>
              ))}
            </div>
            {interestMode === "unknown" ? (
              <p className="text-sm leading-6 text-amber-900">
                {config.hints?.unknownInterestMode ??
                  "Проверьте в договоре, продолжают ли начисляться проценты после даты платежа."}
              </p>
            ) : null}
          </fieldset>

          {interestMode === "yes" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={config.labels?.dailyRate ?? "Дневная ставка по договору"}
                value={dailyRateValue}
                onChange={setDailyRateValue}
                min={limits.dailyRateMin}
                max={limits.dailyRateMax}
                step="0.01"
                hint={config.hints?.dailyRate}
              />
              <Field
                label={
                  config.labels?.annualPenaltyRate ??
                  "Годовая ставка неустойки"
                }
                value={annualPenaltyRateValue}
                onChange={setAnnualPenaltyRateValue}
                min={limits.annualPenaltyRateMin}
                max={limits.annualPenaltyRateMax}
                step="0.01"
                hint={config.hints?.penalty}
              />
            </div>
          ) : null}

          {interestMode === "no" ? (
            <Field
              label={
                config.labels?.dailyPenaltyRate ?? "Дневная ставка неустойки"
              }
              value={dailyPenaltyRateValue}
              onChange={setDailyPenaltyRateValue}
              min={limits.dailyPenaltyRateMin}
              max={limits.dailyPenaltyRateMax}
              step="0.01"
              hint={config.hints?.penalty}
            />
          ) : null}

          <details className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer font-semibold text-slate-950">
              Проверка общего лимита
            </summary>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {config.hints?.limit}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                type="date"
                label={config.labels?.contractDate ?? "Дата заключения договора"}
                value={contractDateValue}
                onChange={setContractDateValue}
              />
              <Field
                label={
                  config.labels?.originalPrincipalAmount ??
                  "Первоначальная сумма займа"
                }
                value={originalPrincipalAmountValue}
                onChange={setOriginalPrincipalAmountValue}
                min={0}
                step="0.01"
              />
              <Field
                label={
                  config.labels?.initialTermDays ??
                  "Первоначальный срок займа, дней"
                }
                value={initialTermDaysValue}
                onChange={setInitialTermDaysValue}
                min={1}
                step="1"
              />
              <Field
                label={
                  config.labels?.otherCharges ??
                  "Другие начисления для проверки лимита"
                }
                value={otherChargesValue}
                onChange={setOtherChargesValue}
                min={0}
                step="0.01"
              />
            </div>
          </details>
        </div>

        <aside aria-live="polite" className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
          <h3 className="text-xl font-bold leading-tight text-slate-950">
            {config.result?.title ??
              "Ориентировочная структура задолженности по введенным данным"}
          </h3>

          {!result.ok ? (
            <div className="mt-4 grid gap-2">
              {result.errors.map((error) => (
                <p
                  key={error}
                  className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                >
                  {error}
                </p>
              ))}
            </div>
          ) : (
            <dl className="mt-4 grid gap-2">
              <ResultRow
                label="Дней просрочки"
                value={String(result.daysOverdue)}
              />
              <ResultRow
                label="Непогашенный основной долг"
                value={formatMoney(result.principalDebt)}
              />
              <ResultRow
                label="Проценты на дату платежа"
                value={formatMoney(result.accruedInterestAtDueDate)}
              />
              {result.canCalculateTotal ? (
                <>
                  <ResultRow
                    label="Проценты за просрочку"
                    value={formatMoney(result.overdueInterest)}
                  />
                  <ResultRow
                    label="Ориентировочная неустойка"
                    value={formatMoney(result.penalty)}
                  />
                  <ResultRow
                    label="Другие введенные начисления"
                    value={formatMoney(result.otherCharges)}
                  />
                  <ResultRow
                    label="Ориентировочная общая сумма"
                    value={formatMoney(result.estimatedTotal)}
                  />
                </>
              ) : null}
            </dl>
          )}

          {result.ok && result.limitCheck.applies ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-950">
                Контрольный предел начислений: {result.limitCheck.percent}%
              </p>
              <p>Предел: {formatMoney(result.limitCheck.capAmount)}</p>
              <p>
                Начисления для сравнения:{" "}
                {formatMoney(result.limitCheck.chargesForCap)}
              </p>
              {result.limitCheck.exceededBy > 0 ? (
                <p className="mt-2 font-semibold text-amber-900">
                  Расчетные начисления могут превышать применимый законодательный
                  предел. Проверьте расчет у кредитора.
                </p>
              ) : (
                <p className="mt-2">
                  До контрольного предела остается{" "}
                  {formatMoney(result.limitCheck.remaining)}.
                </p>
              )}
            </div>
          ) : null}

          {result.ok && !result.limitCheck.applies ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
              {result.limitCheck.reason}
            </p>
          ) : null}

          {result.ok && result.warnings.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {result.warnings.map((warning) => (
                <p
                  key={warning}
                  className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                >
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      {result.ok ? (
        <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-bold text-slate-950">
            {config.result?.formulaTitle ?? "Примененная формула"}
          </h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
            <li>
              • База просрочки = основной долг + проценты на дату платежа.
            </li>
            {result.canCalculateTotal ? (
              <>
                <li>
                  • Проценты за просрочку = основной долг × дневная ставка × дни
                  просрочки.
                </li>
                <li>
                  • Неустойка = база просрочки × ставка неустойки × период.
                </li>
                <li>
                  • Использованные ставки:{" "}
                  {interestMode === "yes"
                    ? `${formatPercent(Number(dailyRateValue.replace(",", ".")) || 0)} в день, ${formatPercent(Number(annualPenaltyRateValue.replace(",", ".")) || 0)} годовых неустойки`
                    : `${formatPercent(Number(dailyPenaltyRateValue.replace(",", ".")) || 0)} в день неустойки`}
                  .
                </li>
              </>
            ) : null}
            {result.formulaNotes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-bold text-slate-950">Что проверить</h3>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
          {checkItems.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      {config.links?.length ? (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-bold text-slate-950">Полезные материалы</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {config.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
              >
                {link.label}
              </a>
            ))}
          </div>
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
