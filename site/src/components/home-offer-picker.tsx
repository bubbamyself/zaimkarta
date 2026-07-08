"use client";

import { useState } from "react";
import {
  type OfferPickerPriority,
  publishOfferAmountFilter,
} from "@/components/seo-tools/filterable-offers";

const AMOUNT_OPTIONS = [
  { label: "До 10 000 ₽", value: 10000 },
  { label: "До 30 000 ₽", value: 30000 },
  { label: "До 50 000 ₽", value: 50000 },
  { label: "Больше 50 000 ₽", value: 50001 },
];

const TERM_OPTIONS = [
  { label: "До 7 дней", value: 7 },
  { label: "До 30 дней", value: 30 },
  { label: "До 90 дней", value: 90 },
  { label: "Больше 90 дней", value: 91 },
];

const PRIORITY_OPTIONS: { label: string; value: OfferPickerPriority }[] = [
  { label: "Минимальная ставка", value: "lowRate" },
  { label: "Быстрое решение", value: "fast" },
  { label: "Первый заем под 0%", value: "zero" },
  { label: "Высокая вероятность одобрения", value: "approval" },
];

export function HomeOfferPicker() {
  const [amount, setAmount] = useState(AMOUNT_OPTIONS[0].value);
  const [termDays, setTermDays] = useState(TERM_OPTIONS[0].value);
  const [priority, setPriority] = useState<OfferPickerPriority>(
    PRIORITY_OPTIONS[0].value,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    publishOfferAmountFilter({
      amount,
      termDays,
      priority,
    });

    document.getElementById("offers")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-slate-50 p-5"
    >
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Сумма займа</span>
          <select
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
          >
            {AMOUNT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Срок</span>
          <select
            value={termDays}
            onChange={(event) => setTermDays(Number(event.target.value))}
            className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
          >
            {TERM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Что важно</span>
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as OfferPickerPriority)
            }
            className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="mt-2 inline-flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-6 text-base font-semibold text-white transition hover:bg-slate-800"
        >
          Подобрать
        </button>
      </div>
    </form>
  );
}
