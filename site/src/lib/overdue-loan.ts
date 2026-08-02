import { OVERDUE_LOAN_RULES } from "@/lib/overdue-loan-rules";

export type InterestMode = "yes" | "no" | "unknown";
export type PenaltyType = "annual" | "daily";

export type OverdueLoanInput = {
  dueDateValue: string;
  calculationDateValue: string;
  principalDebtValue: string;
  accruedInterestAtDueDateValue: string;
  interestMode: InterestMode;
  dailyRateValue: string;
  annualPenaltyRateValue: string;
  dailyPenaltyRateValue: string;
  contractDateValue?: string;
  originalPrincipalAmountValue?: string;
  initialTermDaysValue?: string;
  otherChargesValue?: string;
};

export type LimitCheckResult =
  | {
      applies: true;
      percent: number;
      capAmount: number;
      chargesForCap: number;
      remaining: number;
      exceededBy: number;
      note: string;
    }
  | {
      applies: false;
      reason: string;
    };

export type OverdueLoanResult =
  | {
      ok: true;
      canCalculateTotal: true;
      daysOverdue: number;
      principalDebt: number;
      accruedInterestAtDueDate: number;
      overdueBase: number;
      overdueInterest: number;
      penalty: number;
      otherCharges: number;
      estimatedTotal: number;
      penaltyType: PenaltyType;
      limitCheck: LimitCheckResult;
      warnings: string[];
      formulaNotes: string[];
    }
  | {
      ok: true;
      canCalculateTotal: false;
      daysOverdue: number;
      principalDebt: number;
      accruedInterestAtDueDate: number;
      overdueBase: number;
      otherCharges: number;
      limitCheck: LimitCheckResult;
      warnings: string[];
      formulaNotes: string[];
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

function localMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffCalendarDays(from: Date, to: Date) {
  const fromMidnight = localMidnight(from).getTime();
  const toMidnight = localMidnight(to).getTime();

  return Math.round((toMidnight - fromMidnight) / 86_400_000);
}

function daysInYear(year: number) {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function readNumber(value: string, label: string, errors: string[]) {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) {
    errors.push(`${label}: укажите значение`);
    return null;
  }

  const number = Number(normalizedValue);

  if (!Number.isFinite(number)) {
    errors.push(`${label}: нужно конечное число`);
    return null;
  }

  if (number < 0) {
    errors.push(`${label}: значение не может быть отрицательным`);
    return null;
  }

  return number;
}

function readOptionalNumber(value: string | undefined, label: string, errors: string[]) {
  if (!value?.trim()) {
    return null;
  }

  return readNumber(value, label, errors);
}

function readPositiveInteger(value: string | undefined, label: string, errors: string[]) {
  if (!value?.trim()) {
    return null;
  }

  if (!/^\d+$/.test(value.trim())) {
    errors.push(`${label}: нужно целое число`);
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    errors.push(`${label}: нужно положительное целое число`);
    return null;
  }

  return number;
}

function calculateAnnualPenalty({
  base,
  annualRate,
  startDate,
  daysOverdue,
}: {
  base: number;
  annualRate: number;
  startDate: Date;
  daysOverdue: number;
}) {
  let penalty = 0;

  for (let dayIndex = 1; dayIndex <= daysOverdue; dayIndex += 1) {
    const currentDate = addDays(startDate, dayIndex);
    penalty += base * (annualRate / 100) / daysInYear(currentDate.getFullYear());
  }

  return penalty;
}

function getLimitCheck({
  contractDate,
  initialTermDays,
  originalPrincipalAmount,
  accruedInterestAtDueDate,
  overdueInterest,
  penalty,
  otherCharges,
}: {
  contractDate: Date | null;
  initialTermDays: number | null;
  originalPrincipalAmount: number | null;
  accruedInterestAtDueDate: number;
  overdueInterest: number;
  penalty: number;
  otherCharges: number;
}): LimitCheckResult {
  if (!contractDate || !initialTermDays || !originalPrincipalAmount) {
    return {
      applies: false,
      reason:
        "Недостаточно данных для автоматической проверки общего лимита: нужны дата договора, первоначальная сумма и первоначальный срок.",
    };
  }

  const contractDateValue = toLocalInputDateValue(contractDate);
  const rule = OVERDUE_LOAN_RULES.limits.find((item) => {
    if (initialTermDays > item.maxInitialTermDays) {
      return false;
    }

    if (contractDateValue < item.startsAt) {
      return false;
    }

    return !item.endsAt || contractDateValue <= item.endsAt;
  });

  if (!rule) {
    return {
      applies: false,
      reason:
        "По указанной дате или сроку калькулятор не применяет автоматический вывод о лимите.",
    };
  }

  const capAmount = originalPrincipalAmount * (rule.percent / 100);
  const chargesForCap =
    accruedInterestAtDueDate + overdueInterest + penalty + otherCharges;
  const remaining = Math.max(capAmount - chargesForCap, 0);
  const exceededBy = Math.max(chargesForCap - capAmount, 0);

  return {
    applies: true,
    percent: rule.percent,
    capAmount,
    chargesForCap,
    remaining,
    exceededBy,
    note: rule.note,
  };
}

export function calculateOverdueLoan(input: OverdueLoanInput): OverdueLoanResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dueDate = parseLocalInputDate(input.dueDateValue);
  const calculationDate = parseLocalInputDate(input.calculationDateValue);
  const contractDate = input.contractDateValue
    ? parseLocalInputDate(input.contractDateValue)
    : null;

  if (!dueDate) {
    errors.push("Дата платежа по договору: укажите корректную дату");
  }

  if (!calculationDate) {
    errors.push("Дата расчета: укажите корректную дату");
  }

  if (input.contractDateValue && !contractDate) {
    errors.push("Дата договора: укажите корректную дату");
  }

  const principalDebt = readNumber(
    input.principalDebtValue,
    "Непогашенный основной долг",
    errors,
  );
  const accruedInterestAtDueDate = readNumber(
    input.accruedInterestAtDueDateValue,
    "Начисленные проценты на дату платежа",
    errors,
  );
  const otherCharges =
    readOptionalNumber(
      input.otherChargesValue,
      "Другие начисления для проверки лимита",
      errors,
    ) ?? 0;
  const originalPrincipalAmount = readOptionalNumber(
    input.originalPrincipalAmountValue,
    "Первоначальная сумма займа",
    errors,
  );
  const initialTermDays = readPositiveInteger(
    input.initialTermDaysValue,
    "Первоначальный срок займа",
    errors,
  );

  if (dueDate && calculationDate && calculationDate < dueDate) {
    errors.push("Дата расчета не может быть раньше даты платежа");
  }

  if (
    errors.length > 0 ||
    !dueDate ||
    !calculationDate ||
    principalDebt === null ||
    accruedInterestAtDueDate === null
  ) {
    return {
      ok: false,
      errors,
      warnings,
    };
  }

  const daysOverdue = Math.max(diffCalendarDays(dueDate, calculationDate), 0);
  const overdueBase = principalDebt + accruedInterestAtDueDate;

  if (input.interestMode === "unknown") {
    const limitCheck = getLimitCheck({
      contractDate,
      initialTermDays,
      originalPrincipalAmount,
      accruedInterestAtDueDate,
      overdueInterest: 0,
      penalty: 0,
      otherCharges,
    });

    return {
      ok: true,
      canCalculateTotal: false,
      daysOverdue,
      principalDebt,
      accruedInterestAtDueDate,
      overdueBase,
      otherCharges,
      limitCheck,
      warnings: [
        "Нужно проверить в договоре, продолжают ли начисляться проценты после просрочки.",
      ],
      formulaNotes: [
        "Итоговая сумма не рассчитана, потому что неизвестно правило начисления процентов после просрочки.",
      ],
    };
  }

  const dailyRate =
    input.interestMode === "yes"
      ? readNumber(input.dailyRateValue, "Дневная ставка по договору", errors)
      : 0;
  const annualPenaltyRate =
    input.interestMode === "yes"
      ? readNumber(
          input.annualPenaltyRateValue,
          "Годовая ставка неустойки",
          errors,
        )
      : null;
  const dailyPenaltyRate =
    input.interestMode === "no"
      ? readNumber(input.dailyPenaltyRateValue, "Дневная ставка неустойки", errors)
      : null;

  if (dailyRate !== null && dailyRate > OVERDUE_LOAN_RULES.dailyRateWarningPercent) {
    warnings.push("Дневная ставка выше 0,8%. Проверьте значение в договоре.");
  }

  if (
    annualPenaltyRate !== null &&
    annualPenaltyRate > OVERDUE_LOAN_RULES.annualPenaltyWarningPercent
  ) {
    warnings.push(
      "Годовая ставка неустойки выше 20%. Проверьте применимый предел и условия договора.",
    );
  }

  if (
    dailyPenaltyRate !== null &&
    dailyPenaltyRate > OVERDUE_LOAN_RULES.dailyPenaltyWarningPercent
  ) {
    warnings.push(
      "Дневная ставка неустойки выше 0,1%. Проверьте применимый предел и условия договора.",
    );
  }

  if (errors.length > 0 || dailyRate === null) {
    return {
      ok: false,
      errors,
      warnings,
    };
  }

  const overdueInterest =
    input.interestMode === "yes"
      ? principalDebt * (dailyRate / 100) * daysOverdue
      : 0;
  const penalty =
    input.interestMode === "yes"
      ? calculateAnnualPenalty({
          base: overdueBase,
          annualRate: annualPenaltyRate ?? 0,
          startDate: dueDate,
          daysOverdue,
        })
      : overdueBase * ((dailyPenaltyRate ?? 0) / 100) * daysOverdue;
  const estimatedTotal =
    principalDebt +
    accruedInterestAtDueDate +
    overdueInterest +
    penalty +
    otherCharges;
  const limitCheck = getLimitCheck({
    contractDate,
    initialTermDays,
    originalPrincipalAmount,
    accruedInterestAtDueDate,
    overdueInterest,
    penalty,
    otherCharges,
  });

  return {
    ok: true,
    canCalculateTotal: true,
    daysOverdue,
    principalDebt,
    accruedInterestAtDueDate,
    overdueBase,
    overdueInterest,
    penalty,
    otherCharges,
    estimatedTotal,
    penaltyType: input.interestMode === "yes" ? "annual" : "daily",
    limitCheck,
    warnings,
    formulaNotes: [
      "Годовая неустойка рассчитывается по календарным дням: для каждого дня используется 365 или 366 дней в соответствующем году.",
      "Если были частичные платежи, введите уже актуальные остатки из личного кабинета или расчета кредитора.",
    ],
  };
}

export function isValidOverdueConfig(config: unknown) {
  if (!isRecord(config)) {
    return false;
  }

  return isRecord(config.defaults) && isRecord(config.limits) && isRecord(config.riskNotice);
}
