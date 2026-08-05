import type { RepaymentDateResult } from "@/lib/repayment-date";

export type ResultCopy = {
  title: string;
  paragraphs: string[];
  warning?: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(/\.$/, "");
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date);
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

export function getRepaymentDateTemplateState(
  result: Extract<RepaymentDateResult, { ok: true }>,
) {
  if (result.isToday) {
    return "today" as const;
  }

  if (result.isPast) {
    return "past" as const;
  }

  return "future" as const;
}

export function getRepaymentDateResultCopy(
  result: Extract<RepaymentDateResult, { ok: true }>,
): ResultCopy {
  const repaymentDate = formatDate(result.repaymentDate);
  const weekday = formatWeekday(result.repaymentDate);
  let paragraphs: string[];

  if (result.isToday) {
    paragraphs = [
      `Расчётная дата возврата приходится на сегодня — ${repaymentDate}.`,
      "Проверьте статус займа и доступные способы оплаты в личном кабинете кредитора.",
      "Условия договора и данные кредитора имеют приоритет над расчётом.",
    ];
  } else if (result.isPast) {
    paragraphs = [
      `Расчётная дата возврата была ${repaymentDate}.`,
      "Она уже прошла. Проверьте актуальный статус займа и сумму к оплате у кредитора.",
      "Калькулятор не определяет наличие просрочки и не заменяет данные личного кабинета.",
    ];
  } else {
    paragraphs = [
      `Вернуть займ ориентировочно ${repaymentDate}.`,
      `Это ${weekday}; срок займа — ${pluralizeDays(result.termDays)}. До расчётной даты осталось ${pluralizeDays(result.daysUntil)}.`,
      "Сверьте дату с индивидуальными условиями договора и личным кабинетом кредитора.",
    ];
  }

  return {
    title: "Что означает результат",
    paragraphs,
    warning: result.isWeekend
      ? `Дата приходится на ${weekday}. Заранее проверьте в договоре, переносится ли платёж и когда кредитор учитывает перевод.`
      : undefined,
  };
}
