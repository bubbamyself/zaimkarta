export type OverpaymentResultCopyInput = {
  amount: number;
  termDays: number;
  dailyRate: number;
  overpayment: number;
  totalReturn: number;
  dailyCost: number;
};

export type OverpaymentResultCopy = {
  title: string;
  paragraphs: string[];
  warning?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "RUB",
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

export function getOverpaymentTemplateState(input: OverpaymentResultCopyInput) {
  return input.dailyRate === 0 ? ("zero_rate" as const) : ("positive_rate" as const);
}

export function getOverpaymentResultCopy(
  input: OverpaymentResultCopyInput,
): OverpaymentResultCopy {
  const amount = formatMoney(input.amount);
  const termDays = pluralizeDays(input.termDays);
  const dailyRate = input.dailyRate.toLocaleString("ru-RU");
  const overpayment = formatMoney(input.overpayment);
  const totalReturn = formatMoney(input.totalReturn);
  const dailyCost = formatMoney(input.dailyCost);

  if (input.dailyRate === 0) {
    return {
      title: "Что означает результат",
      paragraphs: [
        `При выбранной сумме ${amount} и сроке ${termDays} введённая ставка 0% даёт переплату по процентам ${overpayment}. Ориентировочно вернуть потребуется ${totalReturn}.`,
        "Такой результат означает только расчёт по введённой ставке. Применение нулевой ставки обычно зависит от условий акции: она может действовать для определённых клиентов, ограниченный срок и только при своевременном возврате.",
        "Перед оформлением проверьте правила акции, ПСК, дополнительные услуги и индивидуальные условия на стороне кредитора.",
      ],
    };
  }

  return {
    title: "Что означает результат",
    paragraphs: [
      `Если взять ${amount} на ${termDays} при ставке ${dailyRate}% в день, ориентировочно вернуть потребуется ${totalReturn}. Из этой суммы ${overpayment} — рассчитанная переплата по процентам за весь выбранный срок.`,
      `Пользование деньгами обходится примерно в ${dailyCost} за каждый день. При неизменных сумме и ставке каждый дополнительный день увеличивает расчётную переплату примерно на эту величину.`,
      "Сравните результат с ПСК, стоимостью дополнительных услуг и итоговой суммой на стороне кредитора: они могут изменить фактическую стоимость займа.",
    ],
  };
}
