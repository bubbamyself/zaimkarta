export const OVERDUE_LOAN_RULES = {
  version: 2,
  supportedFrom: "2023-07-01",
  dailyRateWarningPercent: 0.8,
  annualPenaltyWarningPercent: 20,
  dailyPenaltyWarningPercent: 0.1,
  limits: [
    {
      id: "microloan-130-from-2023-07-01",
      percent: 130,
      startsAt: "2023-07-01",
      endsAt: "2026-03-31",
      note:
        "Для договоров с 1 июля 2023 года до 31 марта 2026 года включительно применяется контрольный лимит 130% для займов сроком до года.",
    },
    {
      id: "microloan-100-from-2026-04-01",
      percent: 100,
      startsAt: "2026-04-01",
      endsAt: null,
      note:
        "Для договоров с 1 апреля 2026 года применяется контрольный лимит 100% для займов сроком до года.",
    },
  ],
  sources: [
    {
      title: "Банк России: снижение максимальной переплаты до 100%",
      url: "https://www.cbr.ru/press/event/?id=28447",
    },
    {
      title: "Банк России: платежи за просрочку",
      url: "https://www.cbr.ru/press/event/?id=11014",
    },
  ],
} as const;
