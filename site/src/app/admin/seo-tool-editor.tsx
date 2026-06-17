"use client";

import { useState } from "react";
import type { SeoPageTool, SeoTool, SeoToolType } from "@prisma/client";
import { createSeoTool, updateSeoTool } from "./seo-tool-actions";
import { defaultConfigForToolType } from "@/lib/seo-tool-config";

type SeoToolWithUsages = SeoTool & {
  pageTools?: (SeoPageTool & {
    page: {
      h1: string;
      slug: string;
      status: string;
    };
  })[];
};

function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getConfigText(config: unknown, group: string, key: string) {
  if (!isRecord(config)) {
    return "";
  }

  const groupValue = config[group];

  if (!isRecord(groupValue)) {
    return "";
  }

  const value = groupValue[key];

  return value === undefined || value === null ? "" : String(value);
}

function getTopLevelConfigText(config: unknown, key: string) {
  if (!isRecord(config)) {
    return "";
  }

  const value = config[key];

  return value === undefined || value === null ? "" : String(value);
}

function getResultConfigText(config: unknown, key: string) {
  return getConfigText(config, "result", key);
}

function getChecklistResultText(config: unknown, index: number, key: string) {
  if (!isRecord(config) || !Array.isArray(config.results)) {
    return "";
  }

  const result = config.results[index];

  if (!isRecord(result)) {
    return "";
  }

  const value = result[key];

  return value === undefined || value === null ? "" : String(value);
}

function getAdvancedConfig(config: unknown) {
  if (!isRecord(config)) {
    return "";
  }

  const managedKeys = new Set([
    "version",
    "defaults",
    "limits",
    "steps",
    "labels",
    "result",
    "results",
    "cta",
    "offers",
    "riskNotice",
  ]);
  const advancedEntries = Object.entries(config).filter(
    ([key]) => !managedKeys.has(key),
  );

  return advancedEntries.length > 0
    ? stringifyJson(Object.fromEntries(advancedEntries))
    : "";
}

function Field({
  label,
  name,
  defaultValue,
  required,
  pattern,
  title,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  required?: boolean;
  pattern?: string;
  title?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue === undefined ? "" : String(defaultValue)}
        required={required}
        pattern={pattern}
        title={title}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows = 4,
  required,
  monospace = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
  monospace?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        required={required}
        className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ${
          monospace ? "font-mono" : ""
        }`}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h4 className="font-bold text-slate-950">{title}</h4>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function OverpaymentCalculatorFields({ config }: { config: unknown }) {
  return (
    <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4">
      <SectionHeader
        title="Настройки калькулятора переплаты"
        description="Эти поля управляют стартовым примером, границами ввода, текстом результата и предупреждением."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Дефолтная сумма"
          name="defaultAmount"
          defaultValue={getConfigText(config, "defaults", "amount")}
          placeholder="10000"
        />
        <Field
          label="Дефолтный срок, дней"
          name="defaultTermDays"
          defaultValue={getConfigText(config, "defaults", "termDays")}
          placeholder="14"
        />
        <Field
          label="Дефолтная ставка в день, %"
          name="defaultDailyRate"
          defaultValue={getConfigText(config, "defaults", "dailyRate")}
          placeholder="0.8"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Минимальная сумма"
          name="amountMin"
          defaultValue={getConfigText(config, "limits", "amountMin")}
          placeholder="1000"
        />
        <Field
          label="Максимальная сумма"
          name="amountMax"
          defaultValue={getConfigText(config, "limits", "amountMax")}
          placeholder="100000"
        />
        <Field
          label="Шаг суммы"
          name="amountStep"
          defaultValue={getConfigText(config, "steps", "amount")}
          placeholder="1000"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Минимальный срок"
          name="termMinDays"
          defaultValue={getConfigText(config, "limits", "termMinDays")}
          placeholder="1"
        />
        <Field
          label="Максимальный срок"
          name="termMaxDays"
          defaultValue={getConfigText(config, "limits", "termMaxDays")}
          placeholder="365"
        />
        <Field
          label="Шаг срока"
          name="termDaysStep"
          defaultValue={getConfigText(config, "steps", "termDays")}
          placeholder="1"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Минимальная ставка"
          name="dailyRateMin"
          defaultValue={getConfigText(config, "limits", "dailyRateMin")}
          placeholder="0"
        />
        <Field
          label="Максимальная ставка"
          name="dailyRateMax"
          defaultValue={getConfigText(config, "limits", "dailyRateMax")}
          placeholder="1"
        />
        <Field
          label="Шаг ставки"
          name="dailyRateStep"
          defaultValue={getConfigText(config, "steps", "dailyRate")}
          placeholder="0.1"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Заголовок результата"
          name="resultTitle"
          defaultValue={getResultConfigText(config, "title")}
          placeholder="Ориентировочный расчет"
        />
        <Field
          label="CTA"
          name="ctaText"
          defaultValue={getConfigText(config, "cta", "text")}
          placeholder="Посмотреть предложения"
        />
      </div>

      <TextArea
        label="Пояснение к формуле"
        name="formulaNote"
        defaultValue={getResultConfigText(config, "formulaNote")}
        rows={2}
      />
      <TextArea
        label="Risk notice"
        name="riskNoticeText"
        defaultValue={getConfigText(config, "riskNotice", "text")}
        rows={3}
      />
    </section>
  );
}

function ChecklistPreviewQuestions() {
  const questions = [
    "Паспорт под рукой",
    "Именная банковская карта",
    "План возврата",
    "Расчет переплаты",
    "Готовность читать договор",
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">Вопросы MVP</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
        {questions.map((question) => (
          <li key={question}>• {question}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        В MVP вопросы зашиты в публичном компоненте, а в админке настраиваются
        тексты результата, CTA и предупреждение.
      </p>
    </div>
  );
}

function ApplicationChecklistFields({ config }: { config: unknown }) {
  return (
    <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4">
      <SectionHeader
        title="Настройки чек-листа заявки"
        description="Здесь настраиваются публичные тексты результата и следующий шаг после заполнения чек-листа."
      />

      <ChecklistPreviewQuestions />

      <div className="grid gap-4 rounded-lg border border-slate-200 p-4">
        <p className="font-semibold text-slate-950">Результат при полном заполнении</p>
        <Field
          label="Заголовок"
          name="checklistResultTitle0"
          defaultValue={getChecklistResultText(config, 0, "title")}
        />
        <TextArea
          label="Текст"
          name="checklistResultText0"
          defaultValue={getChecklistResultText(config, 0, "text")}
          rows={2}
        />
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-200 p-4">
        <p className="font-semibold text-slate-950">Результат при частичном заполнении</p>
        <Field
          label="Заголовок"
          name="checklistResultTitle1"
          defaultValue={getChecklistResultText(config, 1, "title")}
        />
        <TextArea
          label="Текст"
          name="checklistResultText1"
          defaultValue={getChecklistResultText(config, 1, "text")}
          rows={2}
        />
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-200 p-4">
        <p className="font-semibold text-slate-950">Стартовый результат</p>
        <Field
          label="Заголовок"
          name="checklistResultTitle2"
          defaultValue={getChecklistResultText(config, 2, "title")}
        />
        <TextArea
          label="Текст"
          name="checklistResultText2"
          defaultValue={getChecklistResultText(config, 2, "text")}
          rows={2}
        />
      </div>

      <Field
        label="CTA"
        name="ctaText"
        defaultValue={getConfigText(config, "cta", "text")}
        placeholder="Показать подходящие предложения"
      />
      <TextArea
        label="Risk notice"
        name="riskNoticeText"
        defaultValue={getConfigText(config, "riskNotice", "text")}
        rows={3}
      />
    </section>
  );
}

export function SeoToolEditor({ seoTool }: { seoTool?: SeoToolWithUsages }) {
  const isEdit = Boolean(seoTool);
  const defaultType = seoTool?.type ?? "OVERPAYMENT_CALCULATOR";
  const [selectedType, setSelectedType] = useState<SeoToolType>(defaultType);
  const defaultConfig =
    seoTool?.type === selectedType && seoTool?.config
      ? seoTool.config
      : defaultConfigForToolType(selectedType);

  return (
    <form
      action={isEdit ? updateSeoTool : createSeoTool}
      className="grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      {seoTool ? <input type="hidden" name="seoToolId" value={seoTool.id} /> : null}

      <div>
        <h3 className="text-lg font-bold text-slate-950">
          {isEdit ? "Редактирование инструмента" : "Новый инструмент"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Заполни понятные поля для владельца проекта. Технический JSON ниже
          нужен только для редких расширений.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Slug"
          name="slug"
          defaultValue={seoTool?.slug}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Латиница, цифры и дефисы"
          placeholder="overpayment-calculator"
        />
        <SelectField
          label="Статус"
          name="status"
          defaultValue={seoTool?.status ?? "DRAFT"}
          options={[
            { value: "DRAFT", label: "Черновик" },
            { value: "ACTIVE", label: "Активен" },
            { value: "PAUSED", label: "На паузе" },
            { value: "ARCHIVED", label: "Архив" },
          ]}
        />
        <SelectField
          label="Тип"
          name="type"
          defaultValue={selectedType}
          onChange={(value) => setSelectedType(value as SeoToolType)}
          options={[
            { value: "OVERPAYMENT_CALCULATOR", label: "Калькулятор переплаты" },
            { value: "APPLICATION_CHECKLIST", label: "Чек-лист заявки" },
            { value: "MINI_OFFER_PICKER", label: "Mini offer picker - позже", disabled: true },
            { value: "LOAN_TYPE_QUIZ", label: "Loan type quiz - позже", disabled: true },
            { value: "COMPARISON", label: "Comparison - позже", disabled: true },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Внутреннее название"
          name="name"
          defaultValue={seoTool?.name}
          required
        />
        <Field
          label="Публичный заголовок"
          name="title"
          defaultValue={seoTool?.title}
          required
        />
      </div>

      <TextArea
        label="Описание / intro"
        name="description"
        defaultValue={seoTool?.description}
        rows={3}
      />

      {selectedType === "OVERPAYMENT_CALCULATOR" ? (
        <OverpaymentCalculatorFields config={defaultConfig} />
      ) : null}

      {selectedType === "APPLICATION_CHECKLIST" ? (
        <ApplicationChecklistFields config={defaultConfig} />
      ) : null}

      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-slate-950">
          Технические JSON-настройки
        </summary>
        <div className="mt-4 grid gap-4">
          <TextArea
            label="Дополнительный config JSON"
            name="config"
            defaultValue={getAdvancedConfig(defaultConfig)}
            rows={8}
            monospace
          />
          <p className="text-xs leading-5 text-slate-500">
            Это поле добавляет редкие дополнительные ключи поверх формы. Базовые
            поля выше остаются главным способом настройки.
          </p>
          <TextArea
            label="Default block JSON"
            name="defaultBlock"
            defaultValue={
              seoTool?.defaultBlock
                ? stringifyJson(seoTool.defaultBlock)
                : getTopLevelConfigText(defaultConfig, "defaultBlock")
            }
            rows={5}
            monospace
          />
        </div>
      </details>

      {seoTool?.pageTools?.length ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="font-bold text-slate-950">Где используется</h4>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            {seoTool.pageTools.map((usage) => (
              <p key={usage.id}>
                /{usage.page.slug} · {usage.page.h1} · {usage.page.status} · blockId:{" "}
                {usage.blockId ?? "—"}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <button className="w-fit rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">
        {isEdit ? "Сохранить инструмент" : "Создать инструмент"}
      </button>
    </form>
  );
}
