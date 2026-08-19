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
import { CategoryContentBlocksEditor } from "./category-content-blocks-editor";
import { createSeoPage, updateSeoPage } from "./seo-actions";
import { SeoPageEditorForm } from "./seo-page-editor-form";
import { getPromoFieldErrors, isPromoReady } from "@/lib/offer-promo";

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

type SeoPageLinkOption = Pick<
  SeoPage,
  "id" | "slug" | "status" | "pageType" | "title" | "h1"
>;

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
    linkedSeoPageId: null,
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

function findManagedHrefBlock(blocks: unknown, id: string) {
  if (!Array.isArray(blocks)) {
    return "";
  }

  const block = blocks.find((item) => isRecord(item) && item.id === id);

  if (!isRecord(block)) {
    return "";
  }

  const href = String(block.href ?? "");

  return href === "#offers" ? "" : href;
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

function getAdvancedContentBlockValues(blocks: unknown) {
  const serializedBlocks = getAdvancedContentBlocks(blocks);

  return serializedBlocks ? JSON.parse(serializedBlocks) : [];
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

function hasValidActiveCpa(affiliateOffers: AffiliateOffer[] | undefined) {
  return Boolean(
    affiliateOffers?.some((affiliateOffer) => {
      if (!affiliateOffer.isActive) {
        return false;
      }

      try {
        return new URL(affiliateOffer.trackingBaseUrl).protocol === "https:";
      } catch {
        return false;
      }
    }),
  );
}

export function SeoPageEditor({
  offers,
  seoTools = [],
  seoPages = [],
  seoPage,
  initialPageType = "CATEGORY",
}: {
  offers: OfferForSeoEditor[];
  seoTools?: SeoTool[];
  seoPages?: SeoPageLinkOption[];
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
  const categoryCtaUrl = findManagedHrefBlock(
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
  const faqLinkOptions = seoPages
    .filter(
      (page) =>
        page.status === "PUBLISHED" &&
        page.pageType === "ARTICLE" &&
        page.id !== seoPage?.id,
    )
    .sort((first, second) => {
      const firstLabel = first.h1 || first.title;
      const secondLabel = second.h1 || second.title;

      return firstLabel.localeCompare(secondLabel, "ru");
    });
  const relatedPageOptions = seoPages
    .filter(
      (page) => page.status === "PUBLISHED" && page.id !== seoPage?.id,
    )
    .map((page) => ({
      slug: page.slug,
      pageType: page.pageType,
      label: page.h1 || page.title,
    }))
    .sort((first, second) => first.label.localeCompare(second.label, "ru"));
  const toolRows = [
    ...(seoPage?.tools ?? []),
    ...Array.from({ length: Math.max(0, 2 - (seoPage?.tools?.length ?? 0)) }, (_, index) => ({
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

      <Field
        label="Приоритет на главной"
        name="displayPriority"
        defaultValue={seoPage?.displayPriority ?? 100}
        placeholder="100"
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
            defaultValue={categoryCtaText || "Проверить кредитную историю"}
            placeholder="Проверить кредитную историю"
          />
          <Field
            label="Ссылка главного CTA"
            name="categoryCtaUrl"
            defaultValue={categoryCtaUrl}
            placeholder="https://partner.example/credit-history"
          />
          <p className="-mt-3 text-xs leading-5 text-slate-500">
            Откроется в новой вкладке. Можно оставить пустым, пока реферальной
            ссылки нет.
          </p>
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
      {isCategory ? (
        <CategoryContentBlocksEditor
          initialBlocks={getAdvancedContentBlockValues(seoPage?.contentBlocks)}
          relatedPages={relatedPageOptions}
        />
      ) : (
        <details className="rounded-lg border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold text-slate-950">
            Расширенные contentBlocks JSON
          </summary>
          <p className="mt-2 text-sm text-slate-500">
            {isArticle
              ? "Для статьи это технический режим: основной текст редактируется выше без JSON."
              : "Технический режим для служебных блоков страницы."}
          </p>
          <div className="mt-4">
            <TextArea
              label="Content blocks JSON"
              name="contentBlocks"
              defaultValue={
                isArticle
                  ? getArticleAdvancedContentBlocks(seoPage?.contentBlocks)
                  : seoPage?.contentBlocks
                    ? JSON.stringify(seoPage.contentBlocks, null, 2)
                    : ""
              }
              rows={10}
            />
          </div>
        </details>
      )}
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
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {offers.map((offer, index) => {
            const selectedOffer = selectedOffers.get(offer.id);
            const hasActiveCpa = hasValidActiveCpa(offer.affiliateOffers);
            const promoReady = isPromoReady(offer);
            const promoUnavailableReason = promoReady
              ? null
              : offer.promoEnabled
                ? Object.values(getPromoFieldErrors(offer)).join(" ")
                : "У оффера не включена акция 0%.";
            const publicationUnavailableReason =
              offer.status !== "ACTIVE"
                ? `Оффер ${offer.brandName} нельзя добавить в опубликованную подборку: статус ${offer.status}, а для публикации нужен ACTIVE.`
                : !hasActiveCpa
                  ? `Оффер ${offer.brandName} нельзя добавить в опубликованную подборку: нет активной корректной HTTPS CPA-ссылки.`
                  : null;

            return (
              <div
                key={offer.id}
                className={`min-w-0 rounded-lg border p-4 ${
                  publicationUnavailableReason
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200"
                }`}
              >
                <span className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    name="offerId"
                    value={offer.id}
                    defaultChecked={selectedOffer !== undefined}
                    data-publication-unavailable={
                      publicationUnavailableReason ?? undefined
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-950">
                      {offer.brandName}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {offer.slug} · {offer.status} · CPA{" "}
                      {hasActiveCpa ? "активна и HTTPS" : "не готова"}
                    </span>
                    {publicationUnavailableReason ? (
                      <span className="mt-2 block text-sm font-semibold text-amber-800">
                        Нельзя публиковать:{" "}
                        {offer.status !== "ACTIVE"
                          ? `статус ${offer.status}, нужен ACTIVE`
                          : "нет активной корректной HTTPS CPA-ссылки"}
                      </span>
                    ) : (
                      <span className="mt-2 block text-sm font-semibold text-emerald-700">
                        Готов к публикации
                      </span>
                    )}
                  </span>
                </span>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[90px_minmax(0,1fr)] xl:grid-cols-2">
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
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Бейдж
                    </span>
                    <input
                      name={`offerBadge:${offer.id}`}
                      defaultValue={selectedOffer?.badge ?? ""}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                    />
                  </label>
                  <label className="grid gap-2 sm:col-span-2 xl:col-span-1">
                    <span className="text-xs font-medium text-slate-500">
                      CTA
                    </span>
                    <input
                      name={`offerCtaText:${offer.id}`}
                      defaultValue={selectedOffer?.ctaText ?? ""}
                      placeholder="Перейти к условиям"
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900"
                    />
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-md border p-3 sm:col-span-2 ${
                      promoReady
                        ? "border-violet-200 bg-violet-50"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {selectedOffer?.usePromo && !promoReady ? (
                      <input
                        type="hidden"
                        name={`offerUsePromo:${offer.id}`}
                        value="on"
                      />
                    ) : null}
                    <input
                      type="checkbox"
                      name={`offerUsePromo:${offer.id}`}
                      defaultChecked={selectedOffer?.usePromo ?? false}
                      disabled={!promoReady}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-700 disabled:opacity-50"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        Показывать условия акции 0%
                      </span>
                      <span className="mt-1 block text-xs leading-5">
                        {promoReady
                          ? "В этой подборке карточка покажет подтверждённые акционные сумму, срок, ставку и ПСК."
                          : `Недоступно: ${promoUnavailableReason}`}
                      </span>
                    </span>
                  </label>
                  <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                    <input
                      name={`offerHighlight:${offer.id}`}
                      type="checkbox"
                      defaultChecked={selectedOffer?.highlight ?? false}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                    />
                    Highlight
                  </label>
                </div>
                <label className="mt-3 grid gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Заметка к офферу в этой подборке
                  </span>
                  <textarea
                    name={`offerNote:${offer.id}`}
                    defaultValue={selectedOffer?.note ?? ""}
                    rows={2}
                    className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm"
        data-publication-field={isService ? "pageToolToolId" : undefined}
      >
        <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white px-5 py-5">
          <h4 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            Инструменты на странице
            {isService ? <PublicationRequiredMark /> : null}
          </h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {isArticle
              ? "Подключите калькулятор, чек-лист или другой инструмент как дополнение к статье. Для публикации статьи инструмент не обязателен."
              : "Выберите готовый калькулятор или сервис — он появится между карточками и SEO-текстом. Технические настройки скрыты внутри карточки."}
          </p>
        </div>
        <div className="grid gap-4 p-4 sm:p-5">
          {toolRows.map((item, index) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    {item.tool?.name ?? "Свободное место для инструмента"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Оставьте «Не добавлять», если второй инструмент не нужен
                  </p>
                </div>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_110px_190px]">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Какой инструмент добавить
                  </span>
                  <select
                    name="pageToolToolId"
                    defaultValue={item.toolId}
                    className="h-11 rounded-lg border border-slate-300 bg-white px-3 shadow-sm"
                  >
                    <option value="">Не добавлять</option>
                    {seoTools.map((tool) => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name} · {tool.status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Порядок</span>
                  <input
                    name="pageToolPosition"
                    type="number"
                    min="1"
                    defaultValue={item.position || index + 1}
                    className="h-11 rounded-lg border border-slate-300 bg-white px-3 shadow-sm"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Размер блока</span>
                  <select
                    name="pageToolVariant"
                    defaultValue={item.variant}
                    className="h-11 rounded-lg border border-slate-300 bg-white px-3 shadow-sm"
                  >
                    <option value="FULL">Полный</option>
                    <option value="COMPACT">Компактный</option>
                    <option value="INLINE">В строке</option>
                  </select>
                </label>
                <input
                  type="hidden"
                  name="pageToolBlockId"
                  value={item.blockId ?? ""}
                />
                <label className="grid gap-2 lg:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">
                    Заголовок на этой странице
                  </span>
                  <input
                    name="pageToolTitle"
                    defaultValue={item.title ?? ""}
                    placeholder="Можно оставить пустым"
                    className="h-11 rounded-lg border border-slate-300 bg-white px-3 shadow-sm"
                  />
                </label>
                <label className="grid gap-2 lg:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Короткое пояснение
                  </span>
                  <input
                    name="pageToolIntro"
                    defaultValue={item.intro ?? ""}
                    placeholder="Зачем посетителю использовать этот инструмент"
                    className="h-11 rounded-lg border border-slate-300 bg-white px-3 shadow-sm"
                  />
                </label>
              </div>
              <details className="border-t border-slate-200 bg-white px-4 py-3">
                <summary className="cursor-pointer text-sm font-bold text-sky-800">
                  Дополнительные настройки
                </summary>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 lg:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Текст кнопки</span>
                    <input
                      name="pageToolCtaText"
                      defaultValue={getConfigText(item.config, "cta", "text")}
                      placeholder="Посмотреть предложения"
                      className="h-11 rounded-lg border border-slate-300 bg-white px-3"
                    />
                  </label>
                  <div className="grid gap-3 lg:col-span-2 lg:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-slate-600">
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
                  <span className="text-xs font-semibold text-slate-600">
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
                  <span className="text-xs font-semibold text-slate-600">
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
                  <label className="grid gap-2 lg:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Предупреждение внутри инструмента
                    </span>
                    <textarea
                      name="pageToolRiskNotice"
                      defaultValue={getConfigText(item.config, "riskNotice", "text")}
                      rows={2}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                    />
                  </label>
                  <details className="lg:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                      Технические параметры
                    </summary>
                    <textarea
                      name="pageToolConfig"
                      defaultValue={getAdvancedToolConfig(item.config)}
                      rows={3}
                      className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                    />
                  </details>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="font-bold text-slate-950">FAQ</h4>
        <div className="mt-4 grid gap-3">
          {faqRows.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[80px_1fr]"
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
              <label className="grid gap-2 lg:col-span-1">
                <span className="text-xs font-medium text-slate-500">Вопрос</span>
                <input
                  name="faqQuestion"
                  defaultValue={item.question}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-medium text-slate-500">Ответ</span>
                <textarea
                  name="faqAnswer"
                  defaultValue={item.answer}
                  rows={3}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-medium text-slate-500">
                  Подробная статья
                </span>
                <select
                  name="faqLinkedSeoPageId"
                  defaultValue={item.linkedSeoPageId ?? ""}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3"
                >
                  <option value="">Без дополнительной ссылки</option>
                  {faqLinkOptions.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.pageType} · {page.h1 || page.title} · /{page.slug}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>

    </SeoPageEditorForm>
  );
}
