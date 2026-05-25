import type {
  Offer,
  SeoPage,
  SeoPageFaqItem,
  SeoPageOffer,
} from "@prisma/client";
import { createSeoPage, updateSeoPage } from "./seo-actions";

export type SeoPageWithRelations = SeoPage & {
  faqItems: SeoPageFaqItem[];
  offers: SeoPageOffer[];
};

function toFieldValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
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
        defaultValue={toFieldValue(defaultValue)}
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
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
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

function createEmptyFaqRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `new-${index}`,
    question: "",
    answer: "",
    position: index + 1,
  }));
}

export function SeoPageEditor({
  offers,
  seoPage,
}: {
  offers: Offer[];
  seoPage?: SeoPageWithRelations;
}) {
  const isEdit = Boolean(seoPage);
  const selectedOffers = new Map(
    seoPage?.offers.map((item) => [item.offerId, item.position]) ?? [],
  );
  const faqRows = [
    ...(seoPage?.faqItems ?? []),
    ...createEmptyFaqRows(Math.max(3, 8 - (seoPage?.faqItems.length ?? 0))),
  ];

  return (
    <form
      action={isEdit ? updateSeoPage : createSeoPage}
      className="grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      {seoPage ? <input type="hidden" name="seoPageId" value={seoPage.id} /> : null}

      <div>
        <h3 className="text-lg font-bold text-slate-950">
          {isEdit ? "Редактирование SEO-страницы" : "Новая SEO-страница"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Черновик можно сохранить неполным. Для публикации нужны slug, title,
          description, H1, intro и предупреждение о рисках.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Slug"
          name="slug"
          defaultValue={seoPage?.slug}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Латиница, цифры и дефисы, например zaimy-na-kartu"
          placeholder="zaimy-na-kartu"
        />
        <SelectField
          label="Статус"
          name="status"
          defaultValue={seoPage?.status ?? "DRAFT"}
          options={[
            { value: "DRAFT", label: "Черновик" },
            { value: "PUBLISHED", label: "Опубликована" },
            { value: "PAUSED", label: "На паузе" },
            { value: "ARCHIVED", label: "Архив" },
          ]}
        />
        <SelectField
          label="Тип страницы"
          name="pageType"
          defaultValue={seoPage?.pageType ?? "CATEGORY"}
          options={[
            { value: "CATEGORY", label: "Подборка" },
            { value: "ARTICLE", label: "Статья" },
            { value: "SERVICE", label: "Сервис" },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" name="title" defaultValue={seoPage?.title} required />
        <Field label="H1" name="h1" defaultValue={seoPage?.h1} required />
      </div>

      <TextArea
        label="Description"
        name="description"
        defaultValue={seoPage?.description}
        rows={3}
        required
      />
      <TextArea label="Intro" name="intro" defaultValue={seoPage?.intro} rows={4} />
      <TextArea
        label="Content"
        name="content"
        defaultValue={seoPage?.content}
        rows={8}
      />
      <TextArea
        label="Предупреждение о рисках"
        name="riskNotice"
        defaultValue={seoPage?.riskNotice}
        rows={3}
      />
      <TextArea
        label="Внутренняя заметка редактора"
        name="editorNote"
        defaultValue={seoPage?.editorNote}
        rows={3}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="font-bold text-slate-950">Офферы на странице</h4>
        <p className="mt-1 text-sm text-slate-500">
          Отметь офферы и задай позицию. Если ничего не выбрать, публичная
          страница покажет активные офферы по общему приоритету.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {offers.map((offer, index) => {
            const position = selectedOffers.get(offer.id);

            return (
              <label
                key={offer.id}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_90px]"
              >
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="offerId"
                    value={offer.id}
                    defaultChecked={position !== undefined}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700"
                  />
                  <span>
                    <span className="block font-semibold text-slate-950">
                      {offer.brandName}
                    </span>
                    <span className="text-sm text-slate-500">
                      {offer.slug} · {offer.status}
                    </span>
                  </span>
                </span>
                <input
                  name={`offerPosition:${offer.id}`}
                  type="number"
                  min="1"
                  defaultValue={position ?? index + 1}
                  aria-label={`Позиция ${offer.brandName}`}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                />
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="font-bold text-slate-950">FAQ</h4>
        <div className="mt-4 grid gap-3">
          {faqRows.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[80px_1fr_1.3fr]"
            >
              <label className="grid gap-2">
                <span className="text-xs font-medium text-slate-500">Позиция</span>
                <input
                  name="faqPosition"
                  type="number"
                  min="1"
                  defaultValue={item.position || index + 1}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium text-slate-500">Вопрос</span>
                <input
                  name="faqQuestion"
                  defaultValue={item.question}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium text-slate-500">Ответ</span>
                <textarea
                  name="faqAnswer"
                  defaultValue={item.answer}
                  rows={2}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <button className="w-fit rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">
        {isEdit ? "Сохранить страницу" : "Создать страницу"}
      </button>
    </form>
  );
}
