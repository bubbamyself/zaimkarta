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

export const SEO_TOOL_TYPES: SeoToolType[] = [
  "OVERPAYMENT_CALCULATOR",
  "APPLICATION_CHECKLIST",
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

  if (status === "ACTIVE" && errors.length > 0) {
    throw new Error(`Нельзя активировать инструмент: ${errors.join("; ")}.`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}
