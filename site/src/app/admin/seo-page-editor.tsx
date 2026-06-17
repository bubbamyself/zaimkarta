import type {
  AffiliateOffer,
  Offer,
  SeoPage,
  SeoPageFaqItem,
  SeoPageOffer,
  SeoPageTool,
  SeoTool,
} from "@prisma/client";
import { ArticleRichTextEditor } from "./article-rich-text-editor";
import { createSeoPage, updateSeoPage } from "./seo-actions";
import { SeoPageEditorForm } from "./seo-page-editor-form";

export type SeoPageWithRelations = SeoPage & {
  faqItems: SeoPageFaqItem[];
  offers: SeoPageOffer[];
  tools?: (SeoPageTool & {
    tool: SeoTool;
  })[];
};

type OfferForSeoEditor = Offer & {
  affiliateOffers?: AffiliateOffer[];
};

type JsonRecord = Record<string, unknown>;

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
  publicationRequired,
  pattern,
  title,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  required?: boolean;
  publicationRequired?: boolean;
  pattern?: string;
  title?: string;
  placeholder?: string;
}) {
  return (
    <label
      className="grid gap-2"
      data-publication-field={publicationRequired ? name : undefined}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {label}
        {publicationRequired ? <PublicationRequiredMark /> : null}
      </span>
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
  publicationRequired,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
  publicationRequired?: boolean;
}) {
  return (
    <label
      className="grid gap-2"
      data-publication-field={publicationRequired ? name : undefined}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {label}
        {publicationRequired ? <PublicationRequiredMark /> : null}
      </span>
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

function PublicationRequiredMark() {
  return (
    <span
      title="Обязательно для публикации"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800"
    >
      !
    </span>
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

function formatDateInput(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findManagedTextBlock(blocks: unknown, id: string) {
  if (!Array.isArray(blocks)) {
    return "";
  }

  const block = blocks.find((item) => isRecord(item) && item.id === id);

  if (!isRecord(block)) {
    return "";
  }

  return String(block.text ?? block.ctaText ?? "");
}

function getAdvancedContentBlocks(blocks: unknown) {
  if (!Array.isArray(blocks)) {
    return "";
  }

  const managedBlockIds = new Set([
    "category-criterion",
    "category-main-cta",
    "category-pre-offers",
    "category-post-offers",
  ]);
  const advancedBlocks = blocks.filter((block) => {
    if (!isRecord(block)) {
      return false;
    }

    return !managedBlockIds.has(String(block.id ?? ""));
  });

  return advancedBlocks.length > 0 ? JSON.stringify(advancedBlocks, null, 2) : "";
}

function getArticleAdvancedContentBlocks(blocks: unknown) {
  if (!Array.isArray(blocks)) {
    return "";
  }

  return blocks.length > 0 ? JSON.stringify(blocks, null, 2) : "";
}

function getRecordValue(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined;
  }

  return value[key];
}

function getConfigText(config: unknown, group: string, key: string) {
  const groupValue = getRecordValue(config, group);
  const value = getRecordValue(groupValue, key);

  return value === undefined || value === null ? "" : String(value);
}

function getAdvancedToolConfig(config: unknown) {
  if (!isRecord(config)) {
    return "";
  }

  const advancedEntries = Object.entries(config).filter(
    ([key]) => key !== "defaults" && key !== "cta" && key !== "riskNotice",
  );

  return advancedEntries.length > 0
    ? JSON.stringify(Object.fromEntries(advancedEntries), null, 2)
    : "";
}

export function SeoPageEditor({
  offers,
  seoTools = [],
  seoPage,
  initialPageType = "CATEGORY",
}: {
  offers: OfferForSeoEditor[];
  seoTools?: SeoTool[];
  seoPage?: SeoPageWithRelations;
  initialPageType?: "CATEGORY" | "ARTICLE" | "SERVICE";
}) {
  const isEdit = Boolean(seoPage);
  const currentPageType = seoPage?.pageType ?? initialPageType;
  const selectedOffers = new Map(
    seoPage?.offers.map((item) => [item.offerId, item]) ?? [],
  );
  const isCategory = currentPageType === "CATEGORY";
  const isArticle = currentPageType === "ARTICLE";
  const isService = currentPageType === "SERVICE";
  const categoryCriterion = findManagedTextBlock(
    seoPage?.contentBlocks,
    "category-criterion",
  );
  const categoryCtaText = findManagedTextBlock(
    seoPage?.contentBlocks,
    "category-main-cta",
  );
  const categoryPreOffersText = findManagedTextBlock(
    seoPage?.contentBlocks,
    "category-pre-offers",
  );
  const categoryPostOffersText = findManagedTextBlock(
    seoPage?.contentBlocks,
    "category-post-offers",
  );
  const faqRows = [
    ...(seoPage?.faqItems ?? []),
    ...createEmptyFaqRows(Math.max(3, 8 - (seoPage?.faqItems.length ?? 0))),
  ];
  const toolRows = [
    ...(seoPage?.tools ?? []),
    ...Array.from({ length: Math.max(2, 4 - (seoPage?.tools?.length ?? 0)) }, (_, index) => ({
      id: `new-tool-${index}`,
      toolId: "",
      position: (seoPage?.tools?.length ?? 0) + index + 1,
      blockId: "",
      variant: "FULL" as const,
      title: "",
      intro: "",
      config: null,
      tool: null,
    })),
  ];

  return (
    <SeoPageEditorForm
      action={isEdit ? updateSeoPage : createSeoPage}
      isEdit={isEdit}
    >
      {seoPage ? <input type="hidden" name="seoPageId" value={seoPage.id} /> : null}

      <div>
        <h3 className="text-lg font-bold text-slate-950">
          {isEdit ? "Редактирование SEO-страницы" : "Новая SEO-страница"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Черновик можно сохранить неполным. Для публикации нужны title,
          description, H1, статус, тип, предупреждение о рисках и проверки под
          выбранный сценарий.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Slug"
          name="slug"
          defaultValue={seoPage?.slug}
          required
          publicationRequired
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
        {isEdit ? (
          <SelectField
            label="Тип страницы"
            name="pageType"
            defaultValue={currentPageType}
            options={[
              { value: "CATEGORY", label: "Подборка" },
              { value: "ARTICLE", label: "Статья" },
              { value: "SERVICE", label: "Сервис" },
            ]}
          />
        ) : (
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Тип страницы</span>
            <input type="hidden" name="pageType" value={currentPageType} />
            <span className="inline-flex h-11 items-center rounded-md border border-slate-300 bg-white px-3 text-slate-900">
              {isCategory ? "Подборка" : isArticle ? "Статья" : "Сервис"}
            </span>
          </label>
        )}
      </div>

      <SelectField
        label="Intent"
        name="intent"
        defaultValue={seoPage?.intent ?? ""}
        options={[
          { value: "", label: "Не задан" },
          { value: "COMMERCIAL", label: "Commercial" },
          { value: "INFORMATIONAL", label: "Informational" },
          { value: "SERVICE", label: "Service" },
          { value: "MIXED", label: "Mixed" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Title"
          name="title"
          defaultValue={seoPage?.title}
          required
          publicationRequired
        />
        <Field
          label="H1"
          name="h1"
          defaultValue={seoPage?.h1}
          required
          publicationRequired
        />
      </div>

      <TextArea
        label="Description"
        name="description"
        defaultValue={seoPage?.description}
        rows={3}
        required
        publicationRequired
      />
      <TextArea
        label="Intro"
        name="intro"
        defaultValue={seoPage?.intro}
        rows={4}
        publicationRequired
      />

      {isCategory ? (
        <section className="grid gap-4 rounded-lg border border-emerald-100 bg-white p-4">
          <div>
            <h4 className="font-bold text-slate-950">Коммерческий блок подборки</h4>
            <p className="mt-1 text-sm text-slate-500">
              Эти поля формируют offer-first layout без ручной сборки JSON.
            </p>
          </div>
          <TextArea
            label="Критерий подборки"
            name="categoryCriterion"
            defaultValue={categoryCriterion}
            rows={3}
          />
          <TextArea
            label="Текст перед офферами"
            name="categoryPreOffersText"
            defaultValue={categoryPreOffersText}
            rows={3}
          />
          <Field
            label="Главный CTA страницы"
            name="categoryCtaText"
            defaultValue={categoryCtaText || "Сравнить предложения"}
            placeholder="Сравнить предложения"
          />
          <TextArea
            label="Текст после офферов"
            name="categoryPostOffersText"
            defaultValue={categoryPostOffersText}
            rows={4}
          />
          <Field
            label="Дата обновления условий"
            name="updatedByUserAt"
            defaultValue={formatDateInput(seoPage?.updatedByUserAt)}
            placeholder="2026-05-27"
          />
        </section>
      ) : null}

      {isArticle ? (
        <section className="grid gap-4 rounded-lg border border-sky-100 bg-white p-4">
          <div>
            <h4 className="font-bold text-slate-950">Редактор статьи</h4>
            <p className="mt-1 text-sm text-slate-500">
              Основной фокус — информационный материал: структура, ясный ответ
              на вопрос пользователя, FAQ и доверие. Офферы и инструменты ниже
              подключаются как вспомогательные элементы.
            </p>
          </div>
          <Field
            label="Дата обновления материала"
            name="updatedByUserAt"
            defaultValue={formatDateInput(seoPage?.updatedByUserAt)}
            placeholder="2026-05-27"
          />
        </section>
      ) : null}

      {isService ? (
        <section className="grid gap-4 rounded-lg border border-amber-100 bg-white p-4">
          <div>
            <h4 className="font-bold text-slate-950">Сервисная страница</h4>
            <p className="mt-1 text-sm text-slate-500">
              Для публикации нужен активный основной инструмент. Если не
              задавать contentBlocks вручную, страница соберет блок инструмента,
              предложения, FAQ и предупреждение автоматически.
            </p>
          </div>
          <Field
            label="Дата обновления сервиса"
            name="updatedByUserAt"
            defaultValue={formatDateInput(seoPage?.updatedByUserAt)}
            placeholder="2026-05-27"
          />
        </section>
      ) : null}

      {isArticle ? (
        <div data-publication-field="content">
          <ArticleRichTextEditor name="content" defaultValue={seoPage?.content} />
        </div>
      ) : (
        <TextArea
          label={
            isCategory
              ? "Пояснительный текст: как выбирать и что проверить"
              : "Content"
          }
          name="content"
          defaultValue={seoPage?.content}
          rows={8}
        />
      )}
      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-slate-950">
          Расширенные contentBlocks JSON
        </summary>
        <p className="mt-2 text-sm text-slate-500">
          {isArticle
            ? "Для статьи это технический режим: основной текст редактируется выше без JSON."
            : "Для подборок это fallback: коммерческие поля выше сохраняются отдельно в безопасные блоки."}
        </p>
        <div className="mt-4">
          <TextArea
            label="Content blocks JSON"
            name="contentBlocks"
            defaultValue={
              isCategory
                ? getAdvancedContentBlocks(seoPage?.contentBlocks)
                : isArticle
                  ? getArticleAdvancedContentBlocks(seoPage?.contentBlocks)
                : seoPage?.contentBlocks
                  ? JSON.stringify(seoPage.contentBlocks, null, 2)
                  : ""
            }
            rows={10}
          />
        </div>
      </details>
      <TextArea
        label="Предупреждение о рисках"
        name="riskNotice"
        defaultValue={seoPage?.riskNotice}
        rows={3}
        publicationRequired
      />
      <TextArea
        label="Внутренняя заметка редактора"
        name="editorNote"
        defaultValue={seoPage?.editorNote}
        rows={3}
      />

      <section
        className="rounded-lg border border-slate-200 bg-white p-4"
        data-publication-field={isCategory ? "offerId" : undefined}
      >
          <h4 className="flex items-center gap-2 font-bold text-slate-950">
            {isCategory ? "Офферы в подборке" : "Связанные офферы"}
            {isCategory ? <PublicationRequiredMark /> : null}
          </h4>
        <p className="mt-1 text-sm text-slate-500">
          {isCategory
            ? "Отметь офферы, задай позицию и контекст для этой подборки. Для публикации подборки нужен хотя бы один ACTIVE-оффер с активной CPA-ссылкой."
            : isArticle
              ? "Для статьи это вспомогательный блок после материала. Публикация статьи не требует офферов."
              : "Можно привязать офферы к сервису, но они не являются главным редакторским блоком."}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {offers.map((offer, index) => {
            const selectedOffer = selectedOffers.get(offer.id);
            const affiliateOffer = offer.affiliateOffers?.find((item) => item.isActive);
            const hasActiveCpa = Boolean(affiliateOffer?.trackingBaseUrl);

            return (
              <div
                key={offer.id}
                className="grid gap-3 rounded-lg border border-slate-200 p-3"
              >
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="offerId"
                    value={offer.id}
                    defaultChecked={selectedOffer !== undefined}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-950">
                      {offer.brandName}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {offer.slug} · {offer.status} · CPA{" "}
                      {hasActiveCpa ? "активна" : "не подключена"}
                    </span>
                  </span>
                </span>
                <div className="grid gap-3 sm:grid-cols-[90px_1fr_1fr_auto]">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Позиция
                    </span>
                    <input
                      name={`offerPosition:${offer.id}`}
                      type="number"
                      min="1"
                      defaultValue={selectedOffer?.position ?? index + 1}
                      aria-label={`Позиция ${offer.brandName}`}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Бейдж
                    </span>
                    <input
                      name={`offerBadge:${offer.id}`}
                      defaultValue={selectedOffer?.badge ?? ""}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      CTA
                    </span>
                    <input
                      name={`offerCtaText:${offer.id}`}
                      defaultValue={selectedOffer?.ctaText ?? ""}
                      placeholder="Перейти к условиям"
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                    />
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
                    <input
                      name={`offerHighlight:${offer.id}`}
                      type="checkbox"
                      defaultChecked={selectedOffer?.highlight ?? false}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                    />
                    Highlight
                  </label>
                </div>
                <label className="grid gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Заметка к офферу в этой подборке
                  </span>
                  <textarea
                    name={`offerNote:${offer.id}`}
                    defaultValue={selectedOffer?.note ?? ""}
                    rows={2}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="rounded-lg border border-slate-200 bg-white p-4"
        data-publication-field={isService ? "pageToolToolId" : undefined}
      >
        <h4 className="flex items-center gap-2 font-bold text-slate-950">
          Интерактивные инструменты
          {isService ? <PublicationRequiredMark /> : null}
        </h4>
        <p className="mt-1 text-sm text-slate-500">
          {isArticle
            ? "Подключи калькулятор, чек-лист или другой инструмент как дополнение к статье. Для публикации статьи инструмент не обязателен."
            : "Подключи существующий инструмент и настрой локальное отображение без ручной правки JSON. Для сервисной страницы первый активный инструмент считается основным."}
        </p>
        <div className="mt-4 grid gap-3">
          {toolRows.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1.1fr_90px_140px_1fr]"
            >
              <label className="grid gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Инструмент
                </span>
                <select
                  name="pageToolToolId"
                  defaultValue={item.toolId}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                >
                  <option value="">Не выбран</option>
                  {seoTools.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name} · {tool.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium text-slate-500">Позиция</span>
                <input
                  name="pageToolPosition"
                  type="number"
                  min="1"
                  defaultValue={item.position || index + 1}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium text-slate-500">Variant</span>
                <select
                  name="pageToolVariant"
                  defaultValue={item.variant}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                >
                  <option value="FULL">FULL</option>
                  <option value="COMPACT">COMPACT</option>
                  <option value="INLINE">INLINE</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium text-slate-500">Block ID</span>
                <input
                  name="pageToolBlockId"
                  defaultValue={item.blockId ?? ""}
                  placeholder="overpayment-main"
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-medium text-slate-500">
                  Локальный заголовок
                </span>
                <input
                  name="pageToolTitle"
                  defaultValue={item.title ?? ""}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-medium text-slate-500">
                  Локальный intro
                </span>
                <input
                  name="pageToolIntro"
                  defaultValue={item.intro ?? ""}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-medium text-slate-500">CTA text</span>
                <input
                  name="pageToolCtaText"
                  defaultValue={getConfigText(item.config, "cta", "text")}
                  placeholder="Посмотреть предложения"
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <div className="grid gap-3 lg:col-span-2 lg:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Сумма по умолчанию
                  </span>
                  <input
                    name="pageToolDefaultAmount"
                    type="number"
                    min="0"
                    defaultValue={getConfigText(item.config, "defaults", "amount")}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Срок, дней
                  </span>
                  <input
                    name="pageToolDefaultTermDays"
                    type="number"
                    min="0"
                    defaultValue={getConfigText(item.config, "defaults", "termDays")}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Ставка в день
                  </span>
                  <input
                    name="pageToolDefaultDailyRate"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={getConfigText(item.config, "defaults", "dailyRate")}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3"
                  />
                </label>
              </div>
              <label className="grid gap-2 lg:col-span-4">
                <span className="text-xs font-medium text-slate-500">
                  Локальное предупреждение
                </span>
                <textarea
                  name="pageToolRiskNotice"
                  defaultValue={getConfigText(item.config, "riskNotice", "text")}
                  rows={2}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>
              <details className="lg:col-span-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Технический config override JSON
                </summary>
                <textarea
                  name="pageToolConfig"
                  defaultValue={getAdvancedToolConfig(item.config)}
                  rows={3}
                  className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                />
              </details>
            </div>
          ))}
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

    </SeoPageEditorForm>
  );
}
