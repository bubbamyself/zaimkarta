import type { OverdueLoanResult } from "@/lib/overdue-loan";

export type OverdueLoanResultCopy = {
  title: string;
  paragraphs: string[];
  warning?: string;
};

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

function pluralizeDays(value: number) {
  const absoluteValue = Math.abs(value);
  const lastDigit = absoluteValue % 10;
  const lastTwoDigits = absoluteValue % 100;
  const unit =
    lastDigit === 1 && lastTwoDigits !== 11
      ? "день"
      : lastDigit >= 2 &&
          lastDigit <= 4 &&
          (lastTwoDigits < 12 || lastTwoDigits > 14)
        ? "дня"
        : "дней";

  return `${absoluteValue} ${unit}`;
}

export function getOverdueLoanTemplateState({
  result,
  contractDataComplete,
}: {
  result: Extract<OverdueLoanResult, { ok: true }>;
  contractDataComplete: boolean;
}) {
  if (result.daysOverdue === 0) {
    return "no_overdue" as const;
  }

  return contractDataComplete && result.assumptions.length === 0
    ? ("complete" as const)
    : ("assumptions" as const);
}

export function getOverdueLoanResultCopy({
  result,
  contractDataComplete,
}: {
  result: Extract<OverdueLoanResult, { ok: true }>;
  contractDataComplete: boolean;
}): OverdueLoanResultCopy {
  const calculationDate = formatDate(result.plannedPaymentDate);
  const estimatedTotal = formatMoney(result.estimatedTotal);
  let paragraphs: string[];

  if (result.daysOverdue === 0) {
    paragraphs = [
      "По выбранным датам просрочка не образуется: количество дней просрочки — 0.",
      `Ориентировочная сумма к выбранной дате составляет ${estimatedTotal}.`,
      "Сверьте дату и сумму с договором и личным кабинетом кредитора.",
    ];
  } else if (!contractDataComplete || result.assumptions.length > 0) {
    paragraphs = [
      `По введённым данным ориентировочная сумма к ${calculationDate} может составить ${estimatedTotal}.`,
      "Часть условий договора не указана, поэтому калькулятор применил показанные допущения. Фактическая сумма может отличаться.",
      "Проверьте жёлтые поля по договору и запросите у кредитора подробный расчёт задолженности.",
    ];
  } else {
    paragraphs = [
      `По введённым данным ориентировочная сумма к ${calculationDate} составляет ${estimatedTotal}.`,
      `Просрочка составляет ${pluralizeDays(result.daysOverdue)}. В расчёт вошли остаток основного долга, проценты, возможная неустойка и указанные платные услуги кредитора.`,
      "Сравните результат с личным кабинетом и запросите у кредитора расчёт задолженности по дням.",
    ];
  }

  return {
    title: "Что означает результат",
    paragraphs,
    warning: result.hasPartialPayments
      ? "Для проверки общего предела начислений нужна полная история начислений и платежей."
      : undefined,
  };
}
