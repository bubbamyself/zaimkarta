"use client";

import { useEffect, useMemo, useState } from "react";
import { publishOfferChecklistFilter } from "./filterable-offers";
import type {
  ApplicationChecklistConfig,
  SeoToolRenderProps,
} from "./types";

type ChecklistAnswers = {
  age18?: "yes" | "no";
  rfPassport?: "yes" | "no";
  payout?: "card" | "cash" | "online" | "any";
  priority?: "zero" | "fast" | "approval" | "long" | "any";
};

const QUESTIONS = [
  {
    id: "age18",
    text: "Вам уже есть 18 лет?",
    answers: [
      { label: "Да", value: "yes" },
      { label: "Нет", value: "no" },
    ],
  },
  {
    id: "rfPassport",
    text: "У вас есть паспорт гражданина РФ?",
    answers: [
      { label: "Да", value: "yes" },
      { label: "Нет / другой документ", value: "no" },
    ],
  },
  {
    id: "payout",
    text: "Как удобнее получить деньги?",
    answers: [
      { label: "На карту", value: "card" },
      { label: "Наличными", value: "cash" },
      { label: "Онлайн", value: "online" },
      { label: "Не важно", value: "any" },
    ],
  },
  {
    id: "priority",
    text: "Что для вас важнее?",
    answers: [
      { label: "Первый заем под 0%", value: "zero" },
      { label: "Быстрое решение", value: "fast" },
      { label: "Высокая вероятность", value: "approval" },
      { label: "Длинный срок", value: "long" },
      { label: "Не важно", value: "any" },
    ],
  },
] as const;

function getCompletionPercent(answers: ChecklistAnswers) {
  const selectedCount = Object.values(answers).filter(Boolean).length;
  return Math.round((selectedCount / QUESTIONS.length) * 100);
}

function getWarnings(answers: ChecklistAnswers) {
  const warnings: string[] = [];

  if (answers.age18 === "no") {
    warnings.push(
      "Большинство МФО выдают займы только совершеннолетним заемщикам. Не переходите к заявке, если требование по возрасту не выполнено.",
    );
  }

  if (answers.rfPassport === "no") {
    warnings.push(
      "Большинство офферов рассчитаны на заемщиков с паспортом гражданина РФ. Если у вас другой документ, внимательно проверяйте требования МФО.",
    );
  }

  return warnings;
}

function getResult(answers: ChecklistAnswers) {
  const warnings = getWarnings(answers);
  const percent = getCompletionPercent(answers);

  if (warnings.length > 0) {
    return {
      title: "Нужно проверить требования",
      text: "Мы покажем предложения аккуратно, но перед заявкой важно сверить возраст, документы и условия конкретной МФО.",
      tone: "warning" as const,
    };
  }

  if (percent === 100) {
    return {
      title: "Подберем предложения по вашим ответам",
      text: "Карточки ниже будут перестроены с учетом способа получения и выбранного приоритета.",
      tone: "success" as const,
    };
  }

  return {
    title: "Ответьте на несколько вопросов",
    text: "После этого мы поднимем выше офферы, которые лучше совпадают с вашим сценарием.",
    tone: "info" as const,
  };
}

export function ApplicationChecklist({
  title,
  intro,
  config,
}: SeoToolRenderProps<ApplicationChecklistConfig>) {
  const [answers, setAnswers] = useState<ChecklistAnswers>({});
  const selectedCount = Object.values(answers).filter(Boolean).length;
  const percent = getCompletionPercent(answers);
  const warnings = useMemo(() => getWarnings(answers), [answers]);
  const result = useMemo(() => getResult(answers), [answers]);

  useEffect(() => {
    if (selectedCount > 0) {
      publishOfferChecklistFilter(answers);
    }
  }, [answers, selectedCount]);

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
    publishOfferChecklistFilter(answers);
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
            Чек-лист подбора
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
          {intro ? (
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">{intro}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-500">Заполнено</p>
          <p className="text-2xl font-bold text-slate-950">{percent}%</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {QUESTIONS.map((question, index) => (
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
        ))}
      </div>

      {selectedCount > 0 ? (
        <div className={`mt-5 rounded-lg border p-5 ${resultClass}`}>
          <h3 className="text-lg font-bold text-slate-950">{result.title}</h3>
          <p className="mt-2 leading-7 text-slate-700">{result.text}</p>
          {warnings.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
              {warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
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
