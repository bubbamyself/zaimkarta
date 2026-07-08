"use client";

import { useEffect, useMemo, useState } from "react";
import { publishOfferChecklistFilter } from "./filterable-offers";
import type {
  ApplicationChecklistConfig,
  SeoToolRenderProps,
} from "./types";

type ChecklistAnswers = {
  passportReady?: "yes" | "no";
  namedCard?: "yes" | "no";
  repaymentPlan?: "yes" | "no";
  overpaymentCalculated?: "yes" | "no";
  contractReady?: "yes" | "no";
};

type ConfiguredChecklistAnswers = Record<string, number>;

type ConfiguredChecklistQuestion = {
  id: string;
  text: string;
  weakTip: string | undefined;
  answers: {
    label: string;
    value: number;
  }[];
};

const QUESTIONS = [
  {
    id: "passportReady",
    text: "Паспорт под рукой?",
    answers: [
      { label: "Да", value: "yes" },
      { label: "Нет", value: "no" },
    ],
  },
  {
    id: "namedCard",
    text: "Есть именная банковская карта?",
    answers: [
      { label: "Да", value: "yes" },
      { label: "Нет", value: "no" },
    ],
  },
  {
    id: "repaymentPlan",
    text: "Понимаете, из каких средств будете гасить заем?",
    answers: [
      { label: "Да", value: "yes" },
      { label: "Нет", value: "no" },
    ],
  },
  {
    id: "overpaymentCalculated",
    text: "Рассчитали примерную переплату?",
    answers: [
      { label: "Да", value: "yes" },
      { label: "Нет", value: "no" },
    ],
  },
  {
    id: "contractReady",
    text: "Готовы внимательно читать договор перед подписанием?",
    answers: [
      { label: "Да", value: "yes" },
      { label: "Нет", value: "no" },
    ],
  },
] as const;

function getConfiguredQuestions(
  config: ApplicationChecklistConfig,
): ConfiguredChecklistQuestion[] {
  void config;

  // В текущем MVP вопросы чек-листа намеренно фиксированные: только "Да" и "Нет".
  // Конфиг оставляем для текстов результата, но не даем ему вернуть старую балльную анкету.
  return [];
}

function getConfiguredCompletion({
  answers,
  questions,
}: {
  answers: ConfiguredChecklistAnswers;
  questions: ConfiguredChecklistQuestion[];
}) {
  const selectedValues = questions
    .map((question) => answers[question.id])
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  const score = selectedValues.reduce((sum, value) => sum + value, 0);
  const maxScore = questions.reduce((sum, question) => {
    const maxQuestionScore = Math.max(
      ...question.answers.map((answer) => answer.value),
    );

    return sum + Math.max(maxQuestionScore, 0);
  }, 0);

  return {
    percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    selectedCount: selectedValues.length,
  };
}

function getCompletionPercent(answers: ChecklistAnswers) {
  const selectedCount = Object.values(answers).filter(Boolean).length;
  return Math.round((selectedCount / QUESTIONS.length) * 100);
}

function getWarnings(answers: ChecklistAnswers) {
  const warnings: string[] = [];

  if (answers.passportReady === "no") {
    warnings.push(
      "Без паспорта часть предложений может не подойти. Мы покажем только варианты, где паспорт не указан как обязательный документ.",
    );
  }

  if (answers.namedCard === "no") {
    warnings.push(
      "Если именной карты нет, мы уберем варианты, где получение завязано только на карту или СБП.",
    );
  }

  return warnings;
}

function getConfiguredResult(
  config: ApplicationChecklistConfig,
  percent: number,
  fallback: {
    title: string;
    text: string;
  },
) {
  const result = config.results
    ?.slice()
    .sort((first, second) => second.minPercent - first.minPercent)
    .find((item) => percent >= item.minPercent);

  return {
    title: result?.title ?? fallback.title,
    text: result?.text ?? fallback.text,
  };
}

function getConfiguredWeakTips({
  answers,
  questions,
}: {
  answers: ConfiguredChecklistAnswers;
  questions: ConfiguredChecklistQuestion[];
}) {
  return questions.flatMap((question) => {
    const selectedValue = answers[question.id];

    if (selectedValue === undefined || !question.weakTip) {
      return [];
    }

    const maxQuestionScore = Math.max(
      ...question.answers.map((answer) => answer.value),
    );

    return selectedValue < maxQuestionScore ? [question.weakTip] : [];
  });
}

function getResult(answers: ChecklistAnswers, config: ApplicationChecklistConfig) {
  const warnings = getWarnings(answers);
  const percent = getCompletionPercent(answers);

  if (warnings.length > 0) {
    return {
      title: "Нужно проверить требования",
      text: "Мы покажем предложения аккуратно, но перед заявкой важно сверить документы, способ получения и условия конкретного кредитора.",
      tone: "warning" as const,
    };
  }

  if (percent === 100) {
    const configuredResult = getConfiguredResult(config, percent, {
      title: "Подберем предложения по вашим ответам",
      text:
        "Карточки ниже будут отфильтрованы с учетом документов, карты и готовности к заявке.",
    });

    return {
      title: configuredResult.title,
      text: configuredResult.text,
      tone: "success" as const,
    };
  }

  const configuredResult = getConfiguredResult(config, percent, {
    title: "Ответьте на несколько вопросов",
    text: "После этого мы отфильтруем офферы, которые не подходят под ваши ответы.",
  });

  return {
    title: configuredResult.title,
    text: configuredResult.text,
    tone: "info" as const,
  };
}

export function ApplicationChecklist({
  title,
  intro,
  config,
}: SeoToolRenderProps<ApplicationChecklistConfig>) {
  const configuredQuestions = useMemo(() => getConfiguredQuestions(config), [config]);
  const usesConfiguredQuestions = configuredQuestions.length > 0;
  const [configuredAnswers, setConfiguredAnswers] =
    useState<ConfiguredChecklistAnswers>({});
  const [answers, setAnswers] = useState<ChecklistAnswers>({});
  const selectedCount = Object.values(answers).filter(Boolean).length;
  const percent = getCompletionPercent(answers);
  const configuredCompletion = useMemo(
    () =>
      getConfiguredCompletion({
        answers: configuredAnswers,
        questions: configuredQuestions,
      }),
    [configuredAnswers, configuredQuestions],
  );
  const displayedSelectedCount = usesConfiguredQuestions
    ? configuredCompletion.selectedCount
    : selectedCount;
  const displayedPercent = usesConfiguredQuestions
    ? configuredCompletion.percent
    : percent;
  const warnings = useMemo(() => getWarnings(answers), [answers]);
  const configuredWeakTips = useMemo(
    () =>
      getConfiguredWeakTips({
        answers: configuredAnswers,
        questions: configuredQuestions,
      }),
    [configuredAnswers, configuredQuestions],
  );
  const result = useMemo(
    () =>
      usesConfiguredQuestions
        ? {
            ...getConfiguredResult(config, displayedPercent, {
              title: "Оцените готовность",
              text: "Ответьте на вопросы, чтобы увидеть ориентировочный результат.",
            }),
            tone:
              displayedPercent >= 80
                ? ("success" as const)
                : displayedPercent >= 40
                  ? ("info" as const)
                  : ("warning" as const),
          }
        : getResult(answers, config),
    [answers, config, displayedPercent, usesConfiguredQuestions],
  );

  useEffect(() => {
    if (!usesConfiguredQuestions && selectedCount > 0) {
      publishOfferChecklistFilter(answers);
    }
  }, [answers, selectedCount, usesConfiguredQuestions]);

  function updateAnswer<Key extends keyof ChecklistAnswers>(
    key: Key,
    value: ChecklistAnswers[Key],
  ) {
    setAnswers((current) => {
      return {
        ...current,
        [key]: value,
      };
    });
  }

  function handleOffersClick() {
    if (!usesConfiguredQuestions) {
      publishOfferChecklistFilter(answers);
    }
  }

  function updateConfiguredAnswer(questionId: string, value: number) {
    setConfiguredAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  const resultClass =
    result.tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : result.tone === "success"
        ? "border-emerald-100 bg-emerald-50"
        : "border-slate-200 bg-slate-50";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-700">
            Чек-лист
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
          {intro ? (
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">{intro}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-500">Заполнено</p>
          <p className="text-2xl font-bold text-slate-950">{displayedPercent}%</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {usesConfiguredQuestions ? (
          configuredQuestions.map((question, index) => (
            <fieldset
              key={question.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <legend className="px-1 font-semibold text-slate-950">
                {index + 1}. {question.text}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {question.answers.map((answer) => {
                  const isSelected = configuredAnswers[question.id] === answer.value;

                  return (
                    <label
                      key={`${question.id}-${answer.value}`}
                      className={`inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3 text-sm font-semibold transition ${
                        isSelected
                          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={answer.value}
                        checked={isSelected}
                        onChange={() =>
                          updateConfiguredAnswer(question.id, answer.value)
                        }
                        className="sr-only"
                      />
                      {answer.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))
        ) : (
          QUESTIONS.map((question, index) => (
          <fieldset
            key={question.id}
            className="rounded-lg border border-slate-200 p-4"
          >
            <legend className="px-1 font-semibold text-slate-950">
              {index + 1}. {question.text}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {question.answers.map((answer) => {
                const isSelected =
                  answers[question.id as keyof ChecklistAnswers] === answer.value;

                return (
                  <label
                    key={answer.value}
                    className={`inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3 text-sm font-semibold transition ${
                      isSelected
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={answer.value}
                      checked={isSelected}
                      onChange={() =>
                        updateAnswer(
                          question.id as keyof ChecklistAnswers,
                          answer.value as never,
                        )
                      }
                      className="sr-only"
                    />
                    {answer.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          ))
        )}
      </div>

      {displayedSelectedCount > 0 ? (
        <div className={`mt-5 rounded-lg border p-5 ${resultClass}`}>
          <h3 className="text-lg font-bold text-slate-950">{result.title}</h3>
          <p className="mt-2 leading-7 text-slate-700">{result.text}</p>
          {warnings.length > 0 || configuredWeakTips.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
              {warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
              {configuredWeakTips.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          ) : null}
          <a
            href="#offers"
            onClick={handleOffersClick}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800"
          >
            {config.cta?.text ?? "Показать подходящие предложения"}
          </a>
        </div>
      ) : null}

      {config.riskNotice?.text ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {config.riskNotice.text}
        </p>
      ) : null}
    </section>
  );
}
