"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { publishCalculatorAnalytics } from "@/lib/calculator-analytics";
import {
  addCalendarDays,
  calculateOverdueLoan,
  toLocalInputDateValue,
  type InterestMode,
  type PartialPaymentsMode,
  type PenaltyBase,
  type PenaltyType,
} from "@/lib/overdue-loan";
import {
  getOverdueLoanResultCopy,
  getOverdueLoanTemplateState,
} from "@/lib/overdue-loan-result-copy";
import { publishOverdueOfferVisibility } from "./filterable-offers";
import type {
  OverdueLoanCalculatorConfig,
  SeoToolRenderProps,
} from "./types";

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    style: "currency",
    currency: "RUB",
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function ResultRow({
  label,
  value,
  danger = false,
  strong = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex flex-col justify-between gap-1 rounded-md border p-3 sm:flex-row sm:items-center ${
        danger
          ? "border-red-200 bg-red-50"
          : strong
            ? "border-emerald-200 bg-white"
            : "border-transparent bg-white"
      }`}
    >
      <dt className={`text-sm ${danger ? "text-red-800" : "text-slate-600"}`}>
        {label}
      </dt>
      <dd
        className={`${strong ? "text-lg" : ""} font-bold ${
          danger ? "text-red-700" : "text-slate-950"
        }`}
      >
        {value}
      </dd>
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
  contractField = false,
  verified = false,
  placeholder,
  alignLabel = false,
  sourceLabel = "из договора",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "number" | "date";
  min?: number | string;
  max?: number | string;
  step?: number | string;
  hint?: string;
  contractField?: boolean;
  verified?: boolean;
  placeholder?: string;
  alignLabel?: boolean;
  sourceLabel?: string;
}) {
  const fieldColor = contractField
    ? verified
      ? "border-lime-300 bg-lime-50"
      : "border-amber-300 bg-amber-50"
    : "border-slate-300 bg-white";

  return (
    <label className="grid min-w-0 content-start gap-2">
      <span
        className={`flex items-start justify-between gap-2 text-sm font-medium text-slate-700 ${
          alignLabel ? "md:min-h-10" : ""
        }`}
      >
        <span>{label}</span>
        {contractField ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              verified
                ? "bg-lime-200 text-lime-900"
                : "bg-amber-200 text-amber-950"
            }`}
          >
            {verified ? "указано" : sourceLabel}
          </span>
        ) : null}
      </span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full min-w-0 rounded-md border px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 ${fieldColor}`}
      />
      {hint ? <span className="text-xs leading-5 text-slate-600">{hint}</span> : null}
    </label>
  );
}

function ContractChoice({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
}) {
  const verified = Boolean(value);

  return (
    <label className="grid min-w-0 content-start gap-2">
      <span className="flex items-start justify-between gap-2 text-sm font-medium text-slate-700 md:min-h-10">
        <span>{label}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            verified
              ? "bg-lime-200 text-lime-900"
              : "bg-amber-200 text-amber-950"
          }`}
        >
          {verified ? "указано" : "из договора"}
        </span>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full min-w-0 rounded-md border px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 ${
          verified
            ? "border-lime-300 bg-lime-50"
            : "border-amber-300 bg-amber-50"
        }`}
      >
        <option value="">Не знаю — считать по максимуму</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="text-xs leading-5 text-slate-600">{hint}</span> : null}
    </label>
  );
}

export function OverdueLoanCalculator({
  title,
  intro,
  config,
  variant,
  pageType,
  categorySlug,
  offerFilterTarget,
}: SeoToolRenderProps<OverdueLoanCalculatorConfig>) {
  const initialDates = useMemo(() => {
    const today = new Date();
    return {
      today: toLocalInputDateValue(today),
      inSevenDays: toLocalInputDateValue(addCalendarDays(today, 7)),
    };
  }, []);
  const [loanAmountValue, setLoanAmountValue] = useState("10000");
  const [receivedDateValue, setReceivedDateValue] = useState(initialDates.today);
  const [termDaysValue, setTermDaysValue] = useState("7");
  const [termVerified, setTermVerified] = useState(false);
  const [plannedPaymentDateValue, setPlannedPaymentDateValue] = useState(
    initialDates.inSevenDays,
  );
  const [exactDueDateValue, setExactDueDateValue] = useState("");
  const [dailyRateValue, setDailyRateValue] = useState("");
  const [overdueDailyRateValue, setOverdueDailyRateValue] = useState("");
  const [interestMode, setInterestMode] = useState<InterestMode>("");
  const [partialPaymentsMode, setPartialPaymentsMode] =
    useState<PartialPaymentsMode>("");
  const [outstandingPrincipalValue, setOutstandingPrincipalValue] = useState("");
  const [accruedInterestAtDueDateValue, setAccruedInterestAtDueDateValue] =
    useState("");
  const [penaltyType, setPenaltyType] = useState<PenaltyType | "">("");
  const [penaltyRateValue, setPenaltyRateValue] = useState("");
  const [penaltyStartDayValue, setPenaltyStartDayValue] = useState("");
  const [penaltyBase, setPenaltyBase] = useState<PenaltyBase | "">("");
  const [otherChargesValue, setOtherChargesValue] = useState("");
  const [existingLoanMode, setExistingLoanMode] = useState<"yes" | "no" | "">(
    "",
  );
  const [hasUserChanged, setHasUserChanged] = useState(false);
  const trackedResults = useRef(new Set<string>());
  const showToolHeader = pageType !== "service" || variant !== "FULL";
  const limits = {
    loanAmountMin: config.limits?.principalDebtMin ?? 1,
    loanAmountMax: config.limits?.principalDebtMax ?? 1_000_000,
  };
  const result = calculateOverdueLoan({
    loanAmountValue,
    receivedDateValue,
    termDaysValue,
    plannedPaymentDateValue,
    exactDueDateValue,
    dailyRateValue,
    overdueDailyRateValue,
    interestMode,
    partialPaymentsMode,
    outstandingPrincipalValue,
    accruedInterestAtDueDateValue,
    penaltyType,
    penaltyRateValue,
    penaltyStartDayValue,
    penaltyBase,
    otherChargesValue,
  });
  const contractDataComplete =
    termVerified &&
    Boolean(dailyRateValue) &&
    Boolean(interestMode) &&
    (interestMode === "no" || Boolean(overdueDailyRateValue)) &&
    Boolean(penaltyType) &&
    Boolean(penaltyRateValue) &&
    Boolean(penaltyStartDayValue) &&
    Boolean(penaltyBase);
  const resultCopy = result.ok
    ? getOverdueLoanResultCopy({ result, contractDataComplete })
    : null;

  useEffect(() => {
    if (!hasUserChanged || !result.ok) {
      return;
    }

    const key = [
      result.plannedPaymentDate.getTime(),
      result.daysOverdue,
      result.estimatedTotal,
      result.assumptions.length,
      result.hasPartialPayments,
    ].join("|");

    if (trackedResults.current.has(key)) {
      return;
    }

    trackedResults.current.add(key);
    publishCalculatorAnalytics("calculator_personalized_result_viewed", {
      tool_type: "overdue",
      page_slug: categorySlug,
      template_state: getOverdueLoanTemplateState({
        result,
        contractDataComplete,
      }),
      source: "direct",
    });
  }, [categorySlug, contractDataComplete, hasUserChanged, result]);

  function changeReceivedDate(value: string) {
    setHasUserChanged(true);
    setReceivedDateValue(value);
    const date = value ? new Date(`${value}T00:00:00`) : null;
    const term = Number(termDaysValue);

    if (date && Number.isInteger(term) && term > 0) {
      setPlannedPaymentDateValue(toLocalInputDateValue(addCalendarDays(date, term)));
    }
  }

  function changeTerm(value: string, verified = true) {
    setHasUserChanged(true);
    setTermDaysValue(value);
    setTermVerified(verified && Boolean(value));
    const date = receivedDateValue
      ? new Date(`${receivedDateValue}T00:00:00`)
      : null;
    const term = Number(value);

    if (date && Number.isInteger(term) && term > 0) {
      setPlannedPaymentDateValue(toLocalInputDateValue(addCalendarDays(date, term)));
    }
  }

  function changeExistingLoanMode(value: "yes" | "no") {
    setExistingLoanMode(value);

    if (!offerFilterTarget) {
      return;
    }

    const visible = value === "yes";
    publishCalculatorAnalytics("overdue_active_loan_answered", {
      tool_type: "overdue",
      page_slug: categorySlug,
      scenario: "paid_only",
      answer: value,
      source: "direct",
    });

    if (visible) {
      publishCalculatorAnalytics("calculator_offer_list_requested", {
        tool_type: "overdue",
        page_slug: categorySlug,
        scenario: "paid_only",
        source: "direct",
      });
    }

    publishOverdueOfferVisibility({
      visible,
      target: offerFilterTarget,
      source: "direct",
    });

    if (visible) {
      window.setTimeout(() => {
        const target = Array.from(
          document.querySelectorAll<HTMLElement>("[data-offer-filter-target]"),
        ).find(
          (element) => element.dataset.offerFilterTarget === offerFilterTarget,
        );
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }

  return (
    <section
      onChangeCapture={() => setHasUserChanged(true)}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      {showToolHeader ? (
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-700">
            Расчёт займа и просрочки
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
          {intro ? (
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">{intro}</p>
          ) : null}
        </div>
      ) : null}

      <div
        className={`${showToolHeader ? "mt-6" : ""} rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950`}
      >
        <p className="text-lg font-extrabold">
          Нет договора под рукой? Калькулятор всё равно посчитает
        </p>
        <p className="mt-2 leading-6">
          Жёлтые поля нужно заполнить по вашему договору. Срок займа выберите
          обязательно. Если оставить пустыми ставки и условия просрочки, мы
          возьмём самые строгие допустимые законом значения. Получится
          неблагоприятный пример, а не точная сумма вашего долга.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          <span className="rounded-full bg-amber-200 px-3 py-1">
            Жёлтый — проверьте договор
          </span>
          <span className="rounded-full bg-lime-200 px-3 py-1 text-lime-950">
            Зелёный — значение указано
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_390px]">
        <div className="grid gap-6">
          <section className="grid gap-4 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Шаг 1</p>
              <h3 className="text-xl font-bold text-slate-950">Ваш займ</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Сколько денег вы получили"
                value={loanAmountValue}
                onChange={setLoanAmountValue}
                min={limits.loanAmountMin}
                max={limits.loanAmountMax}
                step="0.01"
                hint="Укажите сумму, которая поступила вам на карту."
              />
              <Field
                type="date"
                label="Когда деньги поступили на карту"
                value={receivedDateValue}
                onChange={changeReceivedDate}
                min="2023-07-01"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="На сколько дней вы взяли займ"
                value={termDaysValue}
                onChange={(value) => changeTerm(value)}
                min={1}
                max={3650}
                step="1"
                contractField
                verified={termVerified}
                alignLabel
                hint="Найдите срок займа в индивидуальных условиях договора."
              />
              <Field
                label="Ставка в день, %"
                value={dailyRateValue}
                onChange={setDailyRateValue}
                min={0}
                max={5}
                step="0.01"
                placeholder="Если не знаете — 0,8%"
                contractField
                verified={Boolean(dailyRateValue)}
                alignLabel
                hint="Обычно указана на первой странице договора."
              />
            </div>

            <div className="grid items-start gap-4 md:grid-cols-2">
              <div className="grid min-w-0 content-start gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Быстрый выбор срока
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[7, 14, 21, 28, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => changeTerm(String(days))}
                      className={`h-12 rounded-md border px-3 text-sm font-semibold transition ${
                        termVerified && termDaysValue === String(days)
                          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                      }`}
                    >
                      {days} дней
                    </button>
                  ))}
                </div>
              </div>
              <Field
                type="date"
                label="Точная дата возврата из договора"
                value={exactDueDateValue}
                onChange={setExactDueDateValue}
                min={receivedDateValue || "2023-07-01"}
                hint="Необязательно: если не указать, дата будет рассчитана по сроку займа."
              />
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Шаг 2</p>
              <h3 className="text-xl font-bold text-slate-950">
                Когда вы сможете вернуть деньги
              </h3>
            </div>
            <Field
              type="date"
              label="Когда вы фактически внесёте платёж"
              value={plannedPaymentDateValue}
              onChange={setPlannedPaymentDateValue}
              min={receivedDateValue || "2023-07-01"}
              hint="Можно выбрать будущую дату и заранее оценить возможную просрочку."
            />

            <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-medium text-slate-700">
                Вы уже вносили платежи по этому займу?
              </legend>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "no", label: "Нет" },
                  { value: "yes", label: "Да" },
                ].map((item) => (
                  <label
                    key={item.value}
                    className={`inline-flex min-h-10 cursor-pointer items-center rounded-md border px-4 text-sm font-semibold transition ${
                      partialPaymentsMode === item.value
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="partialPaymentsMode"
                      value={item.value}
                      checked={partialPaymentsMode === item.value}
                      onChange={() =>
                        setPartialPaymentsMode(item.value as PartialPaymentsMode)
                      }
                      className="sr-only"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              {!partialPaymentsMode ? (
                <p className="text-xs leading-5 text-amber-800">
                  Если не выбрать ответ, калькулятор будет считать, что платежей ещё не было.
                </p>
              ) : null}
            </fieldset>

            {partialPaymentsMode === "yes" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Остаток основного долга, ₽"
                  value={outstandingPrincipalValue}
                  onChange={setOutstandingPrincipalValue}
                  min={0}
                  step="0.01"
                  contractField
                  verified={Boolean(outstandingPrincipalValue)}
                  sourceLabel="из личного кабинета"
                  alignLabel
                  hint="Не первоначальная сумма, а остаток после ваших платежей."
                />
                <Field
                  label="Неоплаченные проценты на дату возврата, ₽"
                  value={accruedInterestAtDueDateValue}
                  onChange={setAccruedInterestAtDueDateValue}
                  min={0}
                  step="0.01"
                  contractField
                  verified={Boolean(accruedInterestAtDueDateValue)}
                  sourceLabel="из личного кабинета"
                  alignLabel
                />
              </div>
            ) : null}
          </section>

          <section className="grid gap-4 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-semibold text-red-700">Шаг 3</p>
              <h3 className="text-xl font-bold text-slate-950">
                Условия просрочки из договора
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Если не знаете ответ, оставьте поле жёлтым — применится более
                строгий законный вариант.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ContractChoice
                label="Продолжают начисляться обычные проценты?"
                value={interestMode}
                onChange={(value) => setInterestMode(value as InterestMode)}
                options={[
                  { value: "yes", label: "Да, продолжают" },
                  { value: "no", label: "Нет, не начисляются" },
                ]}
              />
              <ContractChoice
                label="Как указана неустойка?"
                value={penaltyType}
                onChange={(value) => setPenaltyType(value as PenaltyType | "")}
                options={[
                  { value: "annual", label: "Процент годовых" },
                  { value: "daily", label: "Процент в день" },
                ]}
              />
              {interestMode !== "no" ? (
                <Field
                  label="Ставка после наступления просрочки, % в день"
                  value={overdueDailyRateValue}
                  onChange={setOverdueDailyRateValue}
                  min={0}
                  max={5}
                  step="0.01"
                  placeholder="Если не знаете — как до просрочки"
                  contractField
                  verified={Boolean(overdueDailyRateValue)}
                  alignLabel
                  hint="Проверьте, меняется ли ставка после даты возврата."
                />
              ) : null}
              <Field
                label="Ставка неустойки, %"
                value={penaltyRateValue}
                onChange={setPenaltyRateValue}
                min={0}
                max={100}
                step="0.01"
                placeholder={
                  penaltyType === "daily"
                    ? "Если не знаете — 0,1%"
                    : "Если не знаете — 20% годовых"
                }
                contractField
                verified={Boolean(penaltyRateValue)}
                alignLabel
              />
              <Field
                label="С какого дня просрочки начисляется неустойка"
                value={penaltyStartDayValue}
                onChange={setPenaltyStartDayValue}
                min={1}
                step="1"
                placeholder="Если не знаете — с 1-го дня"
                contractField
                verified={Boolean(penaltyStartDayValue)}
                alignLabel
              />
              <ContractChoice
                label="На какую сумму начисляется неустойка?"
                value={penaltyBase}
                onChange={(value) => setPenaltyBase(value as PenaltyBase | "")}
                options={[
                  { value: "scheduled-payment", label: "На весь просроченный платёж" },
                  { value: "principal", label: "Только на основной долг" },
                ]}
                hint="Посмотрите условие о неустойке в индивидуальных условиях договора."
              />
              <Field
                label="Платные услуги кредитора из договора, ₽"
                value={otherChargesValue}
                onChange={setOtherChargesValue}
                min={0}
                step="0.01"
                placeholder="Не добавляем, если поле пустое"
                hint="Не вводите сюда госпошлину, судебные расходы и требования сторонних взыскателей."
                alignLabel
              />
            </div>
          </section>
        </div>

        <aside
          aria-live="polite"
          className="h-fit rounded-xl border border-emerald-200 bg-emerald-50 p-5 lg:sticky lg:top-4"
        >
          <h3 className="text-xl font-bold leading-tight text-slate-950">
            Предварительный расчёт
          </h3>
          <p
            className={`mt-2 rounded-md px-3 py-2 text-sm font-semibold ${
              contractDataComplete
                ? "bg-lime-200 text-lime-950"
                : "bg-amber-200 text-amber-950"
            }`}
          >
            {contractDataComplete
              ? "Основные условия договора заполнены"
              : "Часть условий взята по законному максимуму"}
          </p>

          {!result.ok ? (
            <div className="mt-4 grid gap-2">
              {result.errors.map((error) => (
                <p
                  key={error}
                  className="rounded-md border border-amber-300 bg-white p-3 text-sm leading-6 text-amber-950"
                >
                  {error}
                </p>
              ))}
            </div>
          ) : (
            <>
              <dl className="mt-4 grid gap-2">
                <ResultRow label="Дата возврата по договору" value={formatDate(result.dueDate)} />
                <ResultRow label="Срок займа" value={`${result.termDays} дней`} />
                {result.contractInterestDays !== result.termDays ? (
                  <ResultRow
                    label="Дней начисления процентов до даты возврата"
                    value={String(result.contractInterestDays)}
                  />
                ) : null}
                <ResultRow
                  label={
                    result.hasPartialPayments
                      ? "Расчётные проценты по исходным условиям"
                      : "Проценты за срок займа"
                  }
                  value={formatMoney(result.contractInterest)}
                />
                {result.hasPartialPayments ? (
                  <>
                    <ResultRow
                      label="Остаток основного долга"
                      value={formatMoney(result.outstandingPrincipal)}
                    />
                    <ResultRow
                      label="Неоплаченные проценты на дату возврата"
                      value={formatMoney(result.accruedInterestAtDueDate)}
                    />
                  </>
                ) : null}
                <ResultRow
                  label={
                    result.hasPartialPayments
                      ? "Просроченный платёж после внесённых платежей"
                      : "Нужно было вернуть в срок"
                  }
                  value={formatMoney(result.scheduledPayment)}
                  strong
                />
                <ResultRow label="Дней просрочки" value={String(result.daysOverdue)} danger={result.daysOverdue > 0} />
                <ResultRow label="Проценты за дни просрочки" value={formatMoney(result.overdueInterest)} danger={result.overdueInterest > 0} />
                <ResultRow label={`Неустойка за ${result.penaltyDays} дн.`} value={formatMoney(result.penalty)} danger={result.penalty > 0} />
                {result.otherCharges > 0 ? (
                  <ResultRow label="Платные услуги кредитора" value={formatMoney(result.otherCharges)} danger />
                ) : null}
                <ResultRow label="Ориентировочно к выбранной дате" value={formatMoney(result.estimatedTotal)} strong />
              </dl>

              {result.assumptions.length > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="font-bold text-amber-950">
                    Что калькулятор подставил сам
                  </p>
                  <ul className="mt-2 grid gap-1 text-sm leading-5 text-amber-950">
                    {result.assumptions.map((assumption) => (
                      <li key={assumption.field}>
                        • {assumption.field}: {assumption.value}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.limitCheck.applies ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                  <p className="font-bold text-slate-950">
                    Общий предел начислений: {result.limitCheck.percent}% суммы займа
                  </p>
                  <p>Предельная сумма начислений: {formatMoney(result.limitCheck.capAmount)}</p>
                  {result.limitCheck.reduction > 0 ? (
                    <p className="mt-2 font-semibold text-red-700">
                      Расчётные начисления выше общего предела на {formatMoney(result.limitCheck.reduction)}. Итог ограничен законом.
                    </p>
                  ) : (
                    <p className="mt-2">В расчёте общий предел не превышен.</p>
                  )}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                  {result.limitCheck.reason}
                </p>
              )}

              {result.warnings.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {result.warnings.map((warning) => (
                    <p key={warning} className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </>
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
            <p className="mt-4 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
              {resultCopy.warning}
            </p>
          ) : null}
        </section>
      ) : null}

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

      {offerFilterTarget ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-xl font-bold text-slate-950">
            Проверить предложения
          </h3>
          <fieldset className="mt-4 grid gap-3">
            <legend className="text-base font-semibold text-slate-800">
              У вас уже есть действующий заём?
            </legend>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "yes" as const, label: "Да" },
                { value: "no" as const, label: "Нет" },
              ].map((item) => (
                <label
                  key={item.value}
                  className={`inline-flex min-h-11 min-w-24 cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition ${
                    existingLoanMode === item.value
                      ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="existingLoanMode"
                    value={item.value}
                    checked={existingLoanMode === item.value}
                    onChange={() => changeExistingLoanMode(item.value)}
                    className="sr-only"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          {existingLoanMode === "no" ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              Предложения не показываются. Вы можете продолжить проверку расчёта
              и материалов по теме.
            </p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

export function OverdueLoanPostOffersInfo() {
  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-5">
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <h2 className="font-bold text-slate-950">Как считается результат</h2>
        <ul className="mt-3 grid gap-2">
          <li>
            • Проценты до возврата = сумма займа × ставка в день × число дней до
            даты возврата.
          </li>
          <li>• Просрочка начинается на следующий день после даты возврата.</li>
          <li>
            • После частичных платежей проценты за просрочку считаются от
            введённого остатка основного долга.
          </li>
          <li>
            • Для просрочки применяется отдельная ставка из договора; если она
            не указана — исходная ставка.
          </li>
          <li>
            • Проценты за просрочку и неустойка показываются отдельно красным.
          </li>
          <li>
            • Если расчёт превышает применимый общий предел начислений, итог
            ограничивается этим пределом.
          </li>
        </ul>
      </section>

      <p className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        Калькулятор даёт ориентир, а не подтверждает точную задолженность.
        Частичные платежи, продления, кредитные каникулы и отдельные решения суда
        могут изменить сумму. Для точной сверки запросите у кредитора расчёт
        долга по дням.
      </p>
    </section>
  );
}
