import type { SeoPageTool, SeoTool, SeoToolType } from "@prisma/client";
import { FaqSection, type FaqItemWithLinkedPage } from "@/components/faq-section";
import { ApplicationChecklist } from "@/components/seo-tools/application-checklist";
import { FilterableOffers } from "@/components/seo-tools/filterable-offers";
import { OverpaymentCalculator } from "@/components/seo-tools/overpayment-calculator";
import type { OfferCardData } from "@/lib/offers";

type JsonRecord = Record<string, unknown>;

type ContentBlock = {
  id?: string;
  type?: string;
  blockId?: string;
  text?: string;
  title?: string;
  level?: number;
  items?: string[];
  tone?: "info" | "warning" | "success";
  ctaText?: string;
  href?: string;
};

type PageToolWithTool = SeoPageTool & {
  tool: SeoTool;
};

type SeoContentRendererProps = {
  blocks: unknown;
  pageTools: PageToolWithTool[];
  faqItems: FaqItemWithLinkedPage[];
  offers: OfferCardData[];
  pageType: string;
  categorySlug: string;
  riskNotice?: string | null;
  adminPreview?: boolean;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (!isRecord(base) || !isRecord(override)) {
    return override ?? base;
  }

  return Object.fromEntries(
    Array.from(new Set([...Object.keys(base), ...Object.keys(override)])).map(
      (key) => [key, deepMerge(base[key], override[key])],
    ),
  );
}

function parseBlocks(blocks: unknown): ContentBlock[] {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks.filter(isRecord).map((block) => block as ContentBlock);
}

function renderToolByType({
  toolType,
  title,
  intro,
  config,
  variant,
  offers,
  pageType,
  categorySlug,
}: {
  toolType: SeoToolType;
  title: string;
  intro?: string | null;
  config: JsonRecord;
  variant: "FULL" | "COMPACT" | "INLINE";
  offers: OfferCardData[];
  pageType: string;
  categorySlug: string;
}) {
  if (toolType === "OVERPAYMENT_CALCULATOR") {
    return (
      <OverpaymentCalculator
        title={title}
        intro={intro}
        config={config}
        variant={variant}
        offers={offers}
        pageType={pageType}
        categorySlug={categorySlug}
      />
    );
  }

  if (toolType === "APPLICATION_CHECKLIST") {
    return (
      <ApplicationChecklist
        title={title}
        intro={intro}
        config={config}
        variant={variant}
        offers={offers}
        pageType={pageType}
        categorySlug={categorySlug}
      />
    );
  }

  return null;
}

export function SeoContentRenderer({
  blocks,
  pageTools,
  faqItems,
  offers,
  pageType,
  categorySlug,
  riskNotice,
  adminPreview = false,
}: SeoContentRendererProps) {
  const parsedBlocks = parseBlocks(blocks);
  const pageToolsByBlockId = new Map(
    pageTools
      .filter((pageTool) => pageTool.blockId)
      .map((pageTool) => [pageTool.blockId, pageTool]),
  );

  if (parsedBlocks.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-10">
      {parsedBlocks.map((block, index) => {
        const key = block.id ?? `${block.type}-${index}`;

        if (block.type === "paragraph" && block.text) {
          return (
            <section key={key} className="mx-auto max-w-3xl px-5">
              <p className="text-base leading-8 text-slate-700">{block.text}</p>
            </section>
          );
        }

        if (block.type === "heading" && block.text) {
          const HeadingTag = block.level === 3 ? "h3" : "h2";

          return (
            <section key={key} className="mx-auto max-w-3xl px-5">
              <HeadingTag className="text-2xl font-bold text-slate-950">
                {block.text}
              </HeadingTag>
            </section>
          );
        }

        if (block.type === "list" && block.items?.length) {
          return (
            <section key={key} className="mx-auto max-w-3xl px-5">
              {block.title ? (
                <h2 className="text-2xl font-bold text-slate-950">
                  {block.title}
                </h2>
              ) : null}
              <ul className="mt-4 grid gap-2 text-base leading-7 text-slate-700">
                {block.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
          );
        }

        if (block.type === "callout" && (block.text || block.title)) {
          const toneClass =
            block.tone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : block.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-200 bg-white text-slate-700";

          return (
            <section key={key} className="mx-auto max-w-3xl px-5">
              <div className={`rounded-lg border p-5 ${toneClass}`}>
                {block.title ? (
                  <h2 className="font-bold text-slate-950">{block.title}</h2>
                ) : null}
                {block.text ? (
                  <p className="mt-2 leading-7">{block.text}</p>
                ) : null}
              </div>
            </section>
          );
        }

        if (block.type === "offers") {
          return (
            <FilterableOffers
              key={key}
              title={block.title ?? "Предложения по теме"}
              offers={offers}
              pageType={pageType}
              categorySlug={categorySlug}
            />
          );
        }

        if (block.type === "tool" && block.blockId) {
          const pageTool = pageToolsByBlockId.get(block.blockId);

          if (!pageTool) {
            return adminPreview ? (
              <section key={key} className="mx-auto max-w-3xl px-5">
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Инструмент для blockId «{block.blockId}» не подключен.
                </p>
              </section>
            ) : null;
          }

          if (pageTool.tool.status !== "ACTIVE") {
            return null;
          }

          const mergedConfig = deepMerge(pageTool.tool.config, pageTool.config);

          if (!isRecord(mergedConfig)) {
            return null;
          }

          const renderedTool = renderToolByType({
            toolType: pageTool.tool.type,
            title: pageTool.title ?? pageTool.tool.title,
            intro: pageTool.intro ?? pageTool.tool.description,
            config: mergedConfig,
            variant: pageTool.variant,
            offers,
            pageType,
            categorySlug,
          });

          return renderedTool ? (
            <section key={key} className="mx-auto max-w-6xl px-5">
              {renderedTool}
            </section>
          ) : null;
        }

        if (block.type === "faq") {
          if (faqItems.length === 0) {
            return null;
          }

          return (
            <FaqSection
              key={key}
              items={faqItems}
              title={block.title ?? "Вопросы и ответы"}
              className="mx-auto max-w-3xl px-5"
            />
          );
        }

        if (block.type === "riskNotice") {
          const text = block.text ?? riskNotice;

          return text ? (
            <section key={key} className="mx-auto max-w-6xl px-5">
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                {text}
              </p>
            </section>
          ) : null;
        }

        if (block.type === "cta" && (block.ctaText || block.text)) {
          return (
            <section key={key} className="mx-auto max-w-3xl px-5">
              <a
                href={block.href ?? "#offers"}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-5 font-semibold text-white transition hover:bg-emerald-800"
              >
                {block.ctaText ?? block.text}
              </a>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
