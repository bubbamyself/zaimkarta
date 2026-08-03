import { OVERDUE_LOAN_RULES } from "@/lib/overdue-loan-rules";

export type InterestMode = "yes" | "no" | "";
export type PenaltyType = "annual" | "daily";
export type PenaltyBase = "scheduled-payment" | "principal";
export type PartialPaymentsMode = "yes" | "no" | "";

export type OverdueLoanInput = {
  loanAmountValue: string;
  receivedDateValue: string;
  termDaysValue: string;
  plannedPaymentDateValue: string;
  exactDueDateValue?: string;
  dailyRateValue?: string;
  overdueDailyRateValue?: string;
  interestMode: InterestMode;
  partialPaymentsMode?: PartialPaymentsMode;
  outstandingPrincipalValue?: string;
  accruedInterestAtDueDateValue?: string;
  penaltyType?: PenaltyType | "";
  penaltyRateValue?: string;
  penaltyStartDayValue?: string;
  penaltyBase?: PenaltyBase | "";
  otherChargesValue?: string;
};

export type AppliedAssumption = {
  field: string;
  value: string;
};

export type LimitCheckResult =
  | {
      applies: true;
      percent: number;
      capAmount: number;
      calculatedCharges: number;
      allowedCharges: number;
      reduction: number;
      note: string;
    }
  | {
      applies: false;
      reason: string;
    };

export type OverdueLoanResult =
  | {
      ok: true;
      loanAmount: number;
      receivedDate: Date;
      dueDate: Date;
      plannedPaymentDate: Date;
      termDays: number;
      contractInterestDays: number;
      daysOverdue: number;
      dailyRate: number;
      overdueDailyRate: number;
      hasPartialPayments: boolean;
      outstandingPrincipal: number;
      accruedInterestAtDueDate: number;
      contractInterest: number;
      scheduledPayment: number;
      overdueInterest: number;
      penaltyDays: number;
      penalty: number;
      otherCharges: number;
      calculatedTotal: number;
      estimatedTotal: number;
      limitCheck: LimitCheckResult;
      assumptions: AppliedAssumption[];
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseLocalInputDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toLocalInputDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addCalendarDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function localMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffCalendarDays(from: Date, to: Date) {
  return Math.round(
    (localMidnight(to).getTime() - localMidnight(from).getTime()) / 86_400_000,
  );
}

function daysInYear(year: number) {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

function addCalendarYears(date: Date, years: number) {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + years);
  return nextDate;
}

function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function readNumber(
  value: string | undefined,
  label: string,
  errors: string[],
  options: { positive?: boolean; integer?: boolean } = {},
) {
  const normalizedValue = value?.trim().replace(",", ".") ?? "";

  if (!normalizedValue) {
    errors.push(`${label}: укажите значение`);
    return null;
  }

  const number = Number(normalizedValue);

  if (!Number.isFinite(number)) {
    errors.push(`${label}: укажите число`);
    return null;
  }

  if (number < 0 || (options.positive && number <= 0)) {
    errors.push(`${label}: значение должно быть больше нуля`);
    return null;
  }

  if (options.integer && !Number.isInteger(number)) {
    errors.push(`${label}: укажите целое число дней`);
    return null;
  }

  return number;
}

function readOptionalNumber(
  value: string | undefined,
  label: string,
  errors: string[],
) {
  if (!value?.trim()) {
    return 0;
  }

  return readNumber(value, label, errors);
}

function calculatePenalty({
  base,
  rate,
  penaltyType,
  interestMode,
  firstPenaltyDate,
  penaltyDays,
}: {
  base: number;
  rate: number;
  penaltyType: PenaltyType;
  interestMode: Exclude<InterestMode, "">;
  firstPenaltyDate: Date;
  penaltyDays: number;
}) {
  let penalty = 0;

  for (let dayIndex = 0; dayIndex < penaltyDays; dayIndex += 1) {
    const currentDate = addCalendarDays(firstPenaltyDate, dayIndex);
    const contractDailyRate =
      penaltyType === "annual"
        ? rate / daysInYear(currentDate.getFullYear())
        : rate;
    const legalDailyRate =
      interestMode === "yes"
        ? OVERDUE_LOAN_RULES.annualPenaltyWarningPercent /
          daysInYear(currentDate.getFullYear())
        : OVERDUE_LOAN_RULES.dailyPenaltyWarningPercent;
    penalty += base * (Math.min(contractDailyRate, legalDailyRate) / 100);
  }

  return penalty;
}

function getLimitCheck({
  receivedDate,
  dueDate,
  loanAmount,
  calculatedCharges,
  hasPartialPayments,
}: {
  receivedDate: Date;
  dueDate: Date;
  loanAmount: number;
  calculatedCharges: number;
  hasPartialPayments: boolean;
}): LimitCheckResult {
  if (hasPartialPayments) {
    return {
      applies: false,
      reason:
        "После частичных платежей для проверки общего предела нужна полная история уже уплаченных процентов и других начислений.",
    };
  }

  if (dueDate > addCalendarYears(receivedDate, 1)) {
    return {
      applies: false,
      reason:
        "Общий предел 100% или 130% применяется только к договорам, срок возврата по которым при заключении не превышал одного года.",
    };
  }

  const receivedDateValue = toLocalInputDateValue(receivedDate);
  const rule = OVERDUE_LOAN_RULES.limits.find((item) => {
    if (receivedDateValue < item.startsAt) {
      return false;
    }

    return !item.endsAt || receivedDateValue <= item.endsAt;
  });

  if (!rule) {
    return {
      applies: false,
      reason:
        "Для этой даты или срока калькулятор не применяет автоматический общий предел начислений.",
    };
  }

  const capAmount = loanAmount * (rule.percent / 100);
  const allowedCharges = Math.min(calculatedCharges, capAmount);

  return {
    applies: true,
    percent: rule.percent,
    capAmount,
    calculatedCharges,
    allowedCharges,
    reduction: Math.max(calculatedCharges - allowedCharges, 0),
    note: rule.note,
  };
}

export function calculateOverdueLoan(input: OverdueLoanInput): OverdueLoanResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const assumptions: AppliedAssumption[] = [];
  const loanAmount = readNumber(
    input.loanAmountValue,
    "Сумма займа",
    errors,
    { positive: true },
  );
  const termDays = readNumber(input.termDaysValue, "Срок займа", errors, {
    positive: true,
    integer: true,
  });
  const receivedDate = parseLocalInputDate(input.receivedDateValue);
  const exactDueDate = input.exactDueDateValue?.trim()
    ? parseLocalInputDate(input.exactDueDateValue)
    : null;
  const plannedPaymentDate = parseLocalInputDate(input.plannedPaymentDateValue);

  if (!receivedDate) {
    errors.push("Дата получения денег: укажите корректную дату");
  } else if (
    toLocalInputDateValue(receivedDate) < OVERDUE_LOAN_RULES.supportedFrom
  ) {
    errors.push(
      "Калькулятор поддерживает договоры, заключённые с 1 июля 2023 года. Для более раннего договора запросите расчёт у кредитора.",
    );
  }

  if (input.exactDueDateValue?.trim() && !exactDueDate) {
    errors.push("Дата возврата из договора: укажите корректную дату");
  }

  if (!plannedPaymentDate) {
    errors.push("Дата фактического возврата: укажите корректную дату");
  }

  const dailyRate = input.dailyRateValue?.trim()
    ? readNumber(input.dailyRateValue, "Ставка в день", errors)
    : OVERDUE_LOAN_RULES.dailyRateWarningPercent;

  if (!input.dailyRateValue?.trim()) {
    assumptions.push({
      field: "Ставка в день",
      value: `${OVERDUE_LOAN_RULES.dailyRateWarningPercent}% — предельное значение`,
    });
  }

  const interestMode = input.interestMode || "yes";

  if (!input.interestMode) {
    assumptions.push({
      field: "Проценты во время просрочки",
      value: "продолжают начисляться",
    });
  }

  const overdueDailyRate =
    interestMode === "yes"
      ? input.overdueDailyRateValue?.trim()
        ? readNumber(
            input.overdueDailyRateValue,
            "Ставка после наступления просрочки",
            errors,
          )
        : dailyRate
      : 0;

  if (interestMode === "yes" && !input.overdueDailyRateValue?.trim()) {
    assumptions.push({
      field: "Ставка после просрочки",
      value: "такая же, как ставка за обычный срок",
    });
  }

  const penaltyType: PenaltyType =
    input.penaltyType || (interestMode === "yes" ? "annual" : "daily");

  if (!input.penaltyType) {
    assumptions.push({
      field: "Вид неустойки",
      value: interestMode === "yes" ? "20% годовых" : "0,1% в день",
    });
  }

  const defaultPenaltyRate =
    interestMode === "yes"
      ? penaltyType === "annual"
        ? OVERDUE_LOAN_RULES.annualPenaltyWarningPercent
        : OVERDUE_LOAN_RULES.annualPenaltyWarningPercent / 365
      : penaltyType === "annual"
        ? OVERDUE_LOAN_RULES.dailyPenaltyWarningPercent * 366
        : OVERDUE_LOAN_RULES.dailyPenaltyWarningPercent;
  const penaltyRate = input.penaltyRateValue?.trim()
    ? readNumber(input.penaltyRateValue, "Ставка неустойки", errors)
    : defaultPenaltyRate;

  if (!input.penaltyRateValue?.trim()) {
    assumptions.push({
      field: "Ставка неустойки",
      value:
        interestMode === "yes"
          ? penaltyType === "annual"
            ? "20% годовых"
            : "эквивалент 20% годовых — около 0,0548% в день"
          : penaltyType === "annual"
            ? "до 36,6% годовых с ограничением 0,1% за каждый день"
            : "0,1% в день",
    });
  }

  const penaltyStartDay = input.penaltyStartDayValue?.trim()
    ? readNumber(
        input.penaltyStartDayValue,
        "Первый день начисления неустойки",
        errors,
        { positive: true, integer: true },
      )
    : 1;

  if (!input.penaltyStartDayValue?.trim()) {
    assumptions.push({
      field: "Начало неустойки",
      value: "с первого дня просрочки",
    });
  }

  const penaltyBase = input.penaltyBase || "scheduled-payment";

  if (!input.penaltyBase) {
    assumptions.push({
      field: "Сумма, на которую начисляется неустойка",
      value: "весь просроченный платёж",
    });
  }

  const otherCharges = readOptionalNumber(
    input.otherChargesValue,
    "Платные услуги кредитора из договора",
    errors,
  );
  const hasPartialPayments = input.partialPaymentsMode === "yes";

  if (!input.partialPaymentsMode) {
    assumptions.push({
      field: "Частичные платежи",
      value: "считаем, что их не было",
    });
  }

  const enteredOutstandingPrincipal = hasPartialPayments
    ? readNumber(
        input.outstandingPrincipalValue,
        "Остаток основного долга",
        errors,
      )
    : null;
  const enteredAccruedInterest = hasPartialPayments
    ? readNumber(
        input.accruedInterestAtDueDateValue,
        "Неоплаченные проценты на дату возврата",
        errors,
      )
    : null;

  if (
    errors.length > 0 ||
    loanAmount === null ||
    termDays === null ||
    !receivedDate ||
    !plannedPaymentDate ||
    dailyRate === null ||
    overdueDailyRate === null ||
    penaltyRate === null ||
    penaltyStartDay === null ||
    otherCharges === null ||
    (hasPartialPayments &&
      (enteredOutstandingPrincipal === null || enteredAccruedInterest === null))
  ) {
    return { ok: false, errors, warnings };
  }

  const calculatedDueDate = addCalendarDays(receivedDate, termDays);
  const dueDate = exactDueDate ?? calculatedDueDate;
  const contractInterestDays = exactDueDate
    ? diffCalendarDays(receivedDate, exactDueDate)
    : termDays;

  if (dueDate <= receivedDate) {
    errors.push("Дата возврата должна быть позже даты получения денег");
  }

  if (exactDueDate && contractInterestDays !== termDays) {
    warnings.push(
      `Точная дата возврата не совпадает со сроком ${termDays} дней. Проценты до даты возврата рассчитаны за ${contractInterestDays} дней.`,
    );
  }

  if (!exactDueDate && isWeekend(calculatedDueDate)) {
    warnings.push(
      "Расчётная дата возврата выпала на выходной. Проверьте точную дату платежа в договоре: срок может переноситься на следующий рабочий день.",
    );
  }

  if (plannedPaymentDate < receivedDate) {
    errors.push("Дата фактического возврата не может быть раньше получения денег");
  }

  if (plannedPaymentDate < dueDate) {
    errors.push(
      "Для расчёта просрочки дата фактического возврата должна быть не раньше даты возврата по договору",
    );
  }

  if (dailyRate > OVERDUE_LOAN_RULES.dailyRateWarningPercent) {
    warnings.push(
      "Указанная дневная ставка выше 0,8%. Проверьте договор: калькулятор ограничил её предельным значением.",
    );
  }

  if (
    overdueDailyRate > OVERDUE_LOAN_RULES.dailyRateWarningPercent
  ) {
    warnings.push(
      "Указанная ставка после просрочки выше 0,8% в день. В расчёте применён предельный размер.",
    );
  }

  if (
    hasPartialPayments &&
    enteredOutstandingPrincipal !== null &&
    enteredOutstandingPrincipal > loanAmount
  ) {
    warnings.push(
      "Остаток основного долга больше первоначальной суммы займа. Проверьте значение в личном кабинете кредитора.",
    );
  }

  if (
    interestMode === "yes" &&
    (penaltyType === "annual"
      ? penaltyRate > OVERDUE_LOAN_RULES.annualPenaltyWarningPercent
      : penaltyRate * 365 > OVERDUE_LOAN_RULES.annualPenaltyWarningPercent)
  ) {
    warnings.push(
      "Указанная неустойка в пересчёте выше 20% годовых. В расчёте применён предельный размер.",
    );
  }

  if (
    interestMode === "no" &&
    (penaltyType === "daily"
      ? penaltyRate > OVERDUE_LOAN_RULES.dailyPenaltyWarningPercent
      : penaltyRate / 365 > OVERDUE_LOAN_RULES.dailyPenaltyWarningPercent)
  ) {
    warnings.push(
      "Указанная неустойка выше 0,1% в день. В расчёте применён предельный размер.",
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const appliedDailyRate = Math.min(
    dailyRate,
    OVERDUE_LOAN_RULES.dailyRateWarningPercent,
  );
  const appliedOverdueDailyRate = Math.min(
    overdueDailyRate,
    OVERDUE_LOAN_RULES.dailyRateWarningPercent,
  );
  const daysOverdue = Math.max(diffCalendarDays(dueDate, plannedPaymentDate), 0);
  const contractInterest =
    loanAmount * (appliedDailyRate / 100) * contractInterestDays;
  const outstandingPrincipal = hasPartialPayments
    ? (enteredOutstandingPrincipal ?? 0)
    : loanAmount;
  const accruedInterestAtDueDate = hasPartialPayments
    ? (enteredAccruedInterest ?? 0)
    : contractInterest;
  const scheduledPayment = outstandingPrincipal + accruedInterestAtDueDate;
  const overdueInterest =
    interestMode === "yes"
      ? outstandingPrincipal * (appliedOverdueDailyRate / 100) * daysOverdue
      : 0;
  const penaltyDays = Math.max(daysOverdue - penaltyStartDay + 1, 0);
  const penaltyBaseAmount =
    penaltyBase === "principal" ? outstandingPrincipal : scheduledPayment;
  const firstPenaltyDate = addCalendarDays(dueDate, penaltyStartDay);
  const penalty = calculatePenalty({
    base: penaltyBaseAmount,
    rate: penaltyRate,
    penaltyType,
    interestMode,
    firstPenaltyDate,
    penaltyDays,
  });
  const calculatedCharges =
    contractInterest + overdueInterest + penalty + otherCharges;
  const limitCheck = getLimitCheck({
    receivedDate,
    dueDate,
    loanAmount,
    calculatedCharges,
    hasPartialPayments,
  });
  const allowedCharges = limitCheck.applies
    ? limitCheck.allowedCharges
    : calculatedCharges;
  const calculatedTotal =
    scheduledPayment + overdueInterest + penalty + otherCharges;
  const estimatedTotal = limitCheck.applies
    ? loanAmount + allowedCharges
    : calculatedTotal;

  return {
    ok: true,
    loanAmount,
    receivedDate,
    dueDate,
    plannedPaymentDate,
    termDays,
    contractInterestDays,
    daysOverdue,
    dailyRate: appliedDailyRate,
    overdueDailyRate: appliedOverdueDailyRate,
    hasPartialPayments,
    outstandingPrincipal,
    accruedInterestAtDueDate,
    contractInterest,
    scheduledPayment,
    overdueInterest,
    penaltyDays,
    penalty,
    otherCharges,
    calculatedTotal,
    estimatedTotal,
    limitCheck,
    assumptions,
    warnings,
  };
}

export function isValidOverdueConfig(config: unknown) {
  if (!isRecord(config)) {
    return false;
  }

  return isRecord(config.defaults) && isRecord(config.limits) && isRecord(config.riskNotice);
}
