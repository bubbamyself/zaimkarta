"use client";

import { useState } from "react";
import { DEFAULT_PROMO_TITLE } from "@/lib/offer-promo";

type InitialPromoValue = {
  promoEnabled: boolean;
  promoTitle: string | null;
  promoDailyRate: string;
  promoPsk: string;
  promoMinAmount: number | null;
  promoMaxAmount: number | null;
  promoZeroTermDays: number | null;
  promoNewClientsOnly: boolean;
  promoConditions: string | null;
  promoLateConsequences: string | null;
  promoPaidServices: string | null;
  promoSourceUrl: string | null;
  promoCheckedAt: string;
};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={name === "promoDailyRate" || name === "promoPsk" ? "0.01" : undefined}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      />
      <span
        data-field-error-for={name}
        className="min-h-5 text-xs leading-5 text-slate-500"
      >
        {hint ?? ""}
      </span>
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
}) {
  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={3}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
      />
      <span
        data-field-error-for={name}
        className="min-h-5 text-xs leading-5 text-slate-500"
      >
        {hint ?? ""}
      </span>
    </label>
  );
}

export function OfferPromoFields({
  initialValue,
}: {
  initialValue?: InitialPromoValue;
}) {
  const [enabled, setEnabled] = useState(initialValue?.promoEnabled ?? false);

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="promoEnabled"
          defaultChecked={enabled}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
          className="mt-0.5 h-5 w-5 rounded border-slate-300 text-violet-700"
        />
        <span>
          <span className="block font-bold text-slate-950">Есть акция 0%</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            Включайте только после проверки официальных условий кредитора.
          </span>
          <span
            data-field-error-for="promoEnabled"
            className="mt-1 block min-h-5 text-xs leading-5 text-slate-500"
          />
        </span>
      </label>

      <div
        hidden={!enabled}
        aria-hidden={!enabled}
        className="mt-5 grid gap-4 border-t border-violet-200 pt-5 md:grid-cols-2"
      >
        <Field
          label="Название акции"
          name="promoTitle"
          defaultValue={initialValue?.promoTitle ?? DEFAULT_PROMO_TITLE}
        />
        <Field
          label="Ставка по акции, % в день"
          name="promoDailyRate"
          type="number"
          defaultValue={initialValue?.promoDailyRate ?? "0"}
          hint="Для акции 0% укажите 0."
        />
        <Field
          label="ПСК по акции, %"
          name="promoPsk"
          type="number"
          defaultValue={initialValue?.promoPsk ?? ""}
        />
        <Field
          label="Срок действия ставки 0%, дней"
          name="promoZeroTermDays"
          type="number"
          defaultValue={initialValue?.promoZeroTermDays}
          hint="Это срок нулевой ставки, а не обязательно весь срок займа."
        />
        <Field
          label="Минимальная сумма по акции, ₽"
          name="promoMinAmount"
          type="number"
          defaultValue={initialValue?.promoMinAmount}
        />
        <Field
          label="Максимальная сумма по акции, ₽"
          name="promoMaxAmount"
          type="number"
          defaultValue={initialValue?.promoMaxAmount}
        />
        <label className="flex items-start gap-3 rounded-md border border-violet-200 bg-white p-3 md:col-span-2">
          <input
            type="checkbox"
            name="promoNewClientsOnly"
            defaultChecked={initialValue?.promoNewClientsOnly ?? true}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-violet-700"
          />
          <span className="text-sm font-medium text-slate-700">
            Только для новых клиентов
          </span>
        </label>
        <div className="md:col-span-2">
          <TextArea
            label="Условия сохранения акции"
            name="promoConditions"
            defaultValue={initialValue?.promoConditions}
            hint="Например, требование полного своевременного погашения — только если это подтверждено источником."
          />
        </div>
        <TextArea
          label="Последствия просрочки или продления"
          name="promoLateConsequences"
          defaultValue={initialValue?.promoLateConsequences}
        />
        <TextArea
          label="Возможные платные услуги"
          name="promoPaidServices"
          defaultValue={initialValue?.promoPaidServices}
        />
        <Field
          label="Официальный источник условий"
          name="promoSourceUrl"
          type="url"
          defaultValue={initialValue?.promoSourceUrl}
          hint="Только HTTPS-ссылка кредитора или официальный документ."
        />
        <Field
          label="Дата последней проверки акции"
          name="promoCheckedAt"
          type="date"
          defaultValue={initialValue?.promoCheckedAt}
        />
      </div>
    </section>
  );
}
