import type { SeoToolStatus, SeoToolType } from "@prisma/client";

type JsonRecord = Record<string, unknown>;

export const OVERPAYMENT_CALCULATOR_CONFIG = {
  version: 1,
  defaults: {
    amount: 10000,
    termDays: 14,
    dailyRate: 0.8,
  },
  limits: {
    amountMin: 1000,
    amountMax: 100000,
    termMinDays: 1,
    termMaxDays: 365,
    dailyRateMin: 0,
    dailyRateMax: 1,
  },
  steps: {
    amount: 1000,
    termDays: 1,
    dailyRate: 0.1,
  },
  labels: {
    amount: "Сумма займа",
    termDays: "Срок, дней",
    dailyRate: "Ставка в день",
  },
  result: {
    title: "Ориентировочный расчет",
    formulaNote: "Расчет примерный и не является условиями договора.",
    showTotalReturn: true,
    showOverpayment: true,
    showDailyCost: true,
  },
  cta: {
    text: "Посмотреть предложения",
    target: "offers",
  },
  offers: {
    source: "page",
    limit: 3,
    fallback: "active",
  },
  riskNotice: {
    text:
      "Расчет показывает ориентировочную переплату. Точные условия, полная стоимость займа, комиссии, штрафы и порядок продления нужно проверять в договоре конкретного кредитора перед подписанием.",
  },
};

export const APPLICATION_CHECKLIST_CONFIG = {
  version: 1,
  results: [
    {
      minPercent: 80,
      title: "Подберем предложения по вашим ответам",
      text: "Карточки ниже отфильтруются с учетом документов, карты и готовности к заявке.",
    },
    {
      minPercent: 40,
      title: "Есть что уточнить",
      text: "Ответьте на оставшиеся вопросы, чтобы подборка стала точнее.",
    },
    {
      minPercent: 0,
      title: "Начните с базовых условий",
      text: "Проверим возраст, документ, способ получения и главный приоритет.",
    },
  ],
  cta: {
    text: "Показать подходящие предложения",
    target: "offers",
  },
  riskNotice: {
    text:
      "Чек-лист не является финансовой рекомендацией, не сохраняет ответы и не гарантирует одобрение. Перед заявкой проверьте требования кредитора, договор и полную стоимость займа.",
  },
};

export const REPAYMENT_DATE_CALCULATOR_CONFIG = {
  version: 1,
  defaults: {
    termDays: 30,
  },
  limits: {
    termMinDays: 1,
    termMaxDays: 365,
  },
  quickTerms: [7, 14, 21, 30],
  labels: {
    startDate: "Когда вы получили деньги?",
    termDays: "На какой срок вы взяли займ?",
    termUnit: "дней",
  },
  result: {
    titleTemplate: "Вернуть займ: {date}",
    pastText:
      "Расчетная дата возврата уже прошла. Проверьте актуальный статус займа в личном кабинете кредитора.",
    todayText: "Расчетная дата возврата приходится на сегодня.",
    futureTextTemplate: "До расчетной даты осталось {days}.",
    weekendWarning:
      "Расчетная дата приходится на выходной. Возможность переноса платежа зависит от условий договора и правил кредитора.",
  },
  cta: {
    text: "Посмотреть предложения",
    target: "offers",
  },
  riskNotice: {
    text:
      "Расчет носит справочный характер. Точная дата возврата, порядок исчисления срока и условия платежа указаны в договоре займа и личном кабинете кредитора.",
  },
};

export const COMPARISON_CONFIG = {
  version: 1,
  defaults: {
    amount: 10000,
    termDays: 14,
    priority: "none",
  },
  limits: {
    amountMin: 1000,
    amountMax: 100000,
    termMinDays: 1,
    termMaxDays: 365,
  },
  steps: {
    amount: 1000,
    termDays: 1,
  },
  quickAmounts: [5000, 10000, 15000, 30000],
  quickTerms: [7, 14, 21, 30],
  priorities: [
    {
      value: "none",
      label: "Без приоритета",
    },
    {
      value: "min_overpayment",
      label: "Минимальная ориентировочная переплата",
    },
    {
      value: "fast_decision",
      label: "Быстрое решение",
    },
    {
      value: "payout_method",
      label: "Удобный способ получения",
    },
    {
      value: "simple_requirements",
      label: "Минимум требований",
    },
  ],
  labels: {
    firstOffer: "Первый оффер",
    secondOffer: "Второй оффер",
    amount: "Сумма займа",
    termDays: "Срок займа",
    priority: "Что важнее",
  },
  result: {
    title: "Сравнение по выбранным параметрам",
    sameCostText:
      "По доступным данным существенной разницы в стоимости не найдено.",
    notAvailableText: "Оффер не подходит под выбранные параметры.",
  },
  rows: [
    "eligibility",
    "overpayment",
    "totalReturn",
    "psk",
    "decisionTime",
    "payoutMethods",
    "repaymentMethods",
    "documents",
    "requirements",
    "warnings",
    "conditionsCheckedAt",
  ],
  cta: {
    text: "Перейти к предложению",
    target: "offer",
  },
  riskNotice: {
    text:
      "Расчет носит справочный характер и выполнен по опубликованным диапазонам ставок. Точные ставка, ПСК, сумма возврата и другие условия определяются кредитором индивидуально и указываются в договоре. Решение о выдаче займа принимает кредитор. Оцените свои финансовые возможности и риски.",
  },
};

export const OVERDUE_LOAN_CALCULATOR_CONFIG = {
  version: 1,
  defaults: {
    principalDebt: 10000,
    accruedInterestAtDueDate: 0,
    dailyRate: 0.8,
    annualPenaltyRate: 0,
    dailyPenaltyRate: 0,
    interestMode: "unknown",
  },
  limits: {
    principalDebtMin: 0,
    principalDebtMax: 1000000,
    accruedInterestMin: 0,
    accruedInterestMax: 1000000,
    dailyRateMin: 0,
    dailyRateMax: 5,
    annualPenaltyRateMin: 0,
    annualPenaltyRateMax: 100,
    dailyPenaltyRateMin: 0,
    dailyPenaltyRateMax: 5,
  },
  labels: {
    dueDate: "Дата платежа по договору",
    calculationDate: "Дата расчета",
    principalDebt: "Непогашенный основной долг",
    accruedInterestAtDueDate: "Начисленные проценты на дату платежа",
    interestMode: "После просрочки договорные проценты продолжают начисляться?",
    dailyRate: "Дневная ставка по договору",
    annualPenaltyRate: "Годовая ставка неустойки",
    dailyPenaltyRate: "Дневная ставка неустойки",
    contractDate: "Дата заключения договора",
    originalPrincipalAmount: "Первоначальная сумма займа",
    initialTermDays: "Первоначальный срок займа, дней",
    otherCharges: "Другие начисления для проверки лимита",
  },
  hints: {
    partialPayments:
      "Если вы уже вносили частичные платежи, укажите актуальные остатки из личного кабинета или расчета кредитора.",
    dailyRate:
      "Дневную ставку ищите на первой странице договора или в индивидуальных условиях.",
    penalty:
      "Ставку и тип неустойки проверьте в индивидуальных условиях договора.",
    limit:
      "Без первоначального срока нельзя определить применимость общего лимита для договоров сроком до года.",
    unknownInterestMode:
      "Проверьте в договоре, продолжают ли начисляться проценты после даты платежа.",
  },
  result: {
    title: "Ориентировочная структура задолженности по введенным данным",
    formulaTitle: "Примененная формула",
  },
  links: [],
  riskNotice: {
    text:
      "Расчет является ориентировочным и выполняется по введенным вами данным. Точная задолженность зависит от условий договора, даты его заключения, истории платежей, продлений и решений кредитора или суда. Проверьте сумму в личном кабинете и запросите расчет задолженности у кредитора. Инструмент не предназначен для расчета обязательств пайщиков КПК.",
  },
};

export const SEO_TOOL_TYPES: SeoToolType[] = [
  "OVERPAYMENT_CALCULATOR",
  "APPLICATION_CHECKLIST",
  "REPAYMENT_DATE_CALCULATOR",
  "OVERDUE_LOAN_CALCULATOR",
  "MINI_OFFER_PICKER",
  "LOAN_TYPE_QUIZ",
  "COMPARISON",
];

export const SEO_TOOL_STATUSES: SeoToolStatus[] = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
];

export function defaultConfigForToolType(type: SeoToolType) {
  if (type === "OVERDUE_LOAN_CALCULATOR") {
    return OVERDUE_LOAN_CALCULATOR_CONFIG;
  }

  if (type === "COMPARISON") {
    return COMPARISON_CONFIG;
  }

  if (type === "REPAYMENT_DATE_CALCULATOR") {
    return REPAYMENT_DATE_CALCULATOR_CONFIG;
  }

  if (type === "APPLICATION_CHECKLIST") {
    return APPLICATION_CHECKLIST_CONFIG;
  }

  return OVERPAYMENT_CALCULATOR_CONFIG;
}

export function parseJsonObject(value: string, label: string) {
  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error();
    }

    return parsed as JsonRecord;
  } catch {
    throw new Error(`${label}: нужен валидный JSON-объект`);
  }
}

function hasRiskNotice(config: JsonRecord) {
  const riskNotice = config.riskNotice;

  return (
    Boolean(riskNotice) &&
    typeof riskNotice === "object" &&
    !Array.isArray(riskNotice) &&
    typeof (riskNotice as JsonRecord).text === "string" &&
    ((riskNotice as JsonRecord).text as string).trim().length > 0
  );
}

export function validateSeoToolConfig({
  type,
  status,
  config,
}: {
  type: SeoToolType;
  status: SeoToolStatus;
  config: JsonRecord;
}) {
  const errors: string[] = [];

  if (!hasRiskNotice(config)) {
    errors.push("В config должен быть riskNotice.text");
  }

  if (type === "OVERPAYMENT_CALCULATOR") {
    const defaults = config.defaults as JsonRecord | undefined;
    const limits = config.limits as JsonRecord | undefined;

    if (!defaults || typeof defaults !== "object") {
      errors.push("Для калькулятора нужен defaults");
    }

    if (!limits || typeof limits !== "object") {
      errors.push("Для калькулятора нужен limits");
    }
  }

  if (type === "APPLICATION_CHECKLIST") {
    const version = config.version;

    if (typeof version !== "number") {
      errors.push("Для чек-листа нужен version");
    }
  }

  if (type === "REPAYMENT_DATE_CALCULATOR") {
    const defaults = config.defaults as JsonRecord | undefined;
    const limits = config.limits as JsonRecord | undefined;
    const quickTerms = config.quickTerms;

    if (!defaults || typeof defaults !== "object") {
      errors.push("Для калькулятора даты возврата нужен defaults");
    }

    if (!limits || typeof limits !== "object") {
      errors.push("Для калькулятора даты возврата нужен limits");
    }

    if (!Array.isArray(quickTerms) || quickTerms.length === 0) {
      errors.push("Для калькулятора даты возврата нужны быстрые сроки");
    }
  }

  if (type === "COMPARISON") {
    const defaults = config.defaults as JsonRecord | undefined;
    const limits = config.limits as JsonRecord | undefined;
    const quickAmounts = config.quickAmounts;
    const quickTerms = config.quickTerms;
    const priorities = config.priorities;

    if (!defaults || typeof defaults !== "object") {
      errors.push("Для сравнения займов нужен defaults");
    }

    if (!limits || typeof limits !== "object") {
      errors.push("Для сравнения займов нужен limits");
    }

    if (!Array.isArray(quickAmounts) || quickAmounts.length === 0) {
      errors.push("Для сравнения займов нужны быстрые суммы");
    }

    if (!Array.isArray(quickTerms) || quickTerms.length === 0) {
      errors.push("Для сравнения займов нужны быстрые сроки");
    }

    if (!Array.isArray(priorities) || priorities.length === 0) {
      errors.push("Для сравнения займов нужны приоритеты");
    }
  }

  if (type === "OVERDUE_LOAN_CALCULATOR") {
    const defaults = config.defaults as JsonRecord | undefined;
    const limits = config.limits as JsonRecord | undefined;

    if (!defaults || typeof defaults !== "object") {
      errors.push("Для калькулятора просрочки нужен defaults");
    }

    if (!limits || typeof limits !== "object") {
      errors.push("Для калькулятора просрочки нужен limits");
    }

    if (!("labels" in config)) {
      errors.push("Для калькулятора просрочки нужны labels");
    }
  }

  if (status === "ACTIVE" && errors.length > 0) {
    throw new Error(`Нельзя активировать инструмент: ${errors.join("; ")}.`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}
