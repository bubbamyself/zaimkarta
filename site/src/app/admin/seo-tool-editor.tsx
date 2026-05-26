import type { SeoPageTool, SeoTool } from "@prisma/client";
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
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        required={required}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SeoToolEditor({ seoTool }: { seoTool?: SeoToolWithUsages }) {
  const isEdit = Boolean(seoTool);
  const defaultType = seoTool?.type ?? "OVERPAYMENT_CALCULATOR";
  const defaultConfig = seoTool?.config ?? defaultConfigForToolType(defaultType);

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
          Config хранится как JSON. Для активного инструмента нужен валидный
          riskNotice и обязательные поля конкретного типа.
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
          defaultValue={defaultType}
          options={[
            { value: "OVERPAYMENT_CALCULATOR", label: "Калькулятор переплаты" },
            { value: "APPLICATION_CHECKLIST", label: "Чек-лист заявки" },
            { value: "MINI_OFFER_PICKER", label: "Mini offer picker" },
            { value: "LOAN_TYPE_QUIZ", label: "Loan type quiz" },
            { value: "COMPARISON", label: "Comparison" },
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
      <TextArea
        label="Config JSON"
        name="config"
        defaultValue={stringifyJson(defaultConfig)}
        rows={18}
        required
      />
      <TextArea
        label="Default block JSON"
        name="defaultBlock"
        defaultValue={seoTool?.defaultBlock ? stringifyJson(seoTool.defaultBlock) : ""}
        rows={5}
      />

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
