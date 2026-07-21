import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FaqSection } from "@/components/faq-section";
import { OfferCard } from "@/components/offer-card";
import { SeoContentRenderer } from "@/components/seo-content-renderer";
import { FilterableOffers } from "@/components/seo-tools/filterable-offers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveOffersForRegion, mapOfferToCardData } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import { getSelectedRegionCode } from "@/lib/region-cookie";
import {
  getBreadcrumbListJsonLd,
  getSeoPageBreadcrumbs,
} from "@/lib/seo-breadcrumbs";
import { getAbsoluteUrl } from "@/lib/site-url";
import {
  getArticleJsonLd,
  getFaqPageJsonLd,
  serializeJsonLd,
} from "@/lib/structured-data";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type JsonRecord = Record<string, unknown>;

export const dynamic = "force-dynamic";

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

function getAdvancedBlocks(blocks: unknown) {
  if (!Array.isArray(blocks)) {
    return [];
  }

  const managedBlockIds = new Set([
    "category-criterion",
    "category-main-cta",
    "category-pre-offers",
    "category-post-offers",
  ]);
  const categoryLayoutBlockTypes = new Set([
    "cta",
    "faq",
    "offers",
    "riskNotice",
    "tool",
  ]);

  return blocks.filter((block) => {
    if (!isRecord(block)) {
      return false;
    }

    return (
      !managedBlockIds.has(String(block.id ?? "")) &&
      !categoryLayoutBlockTypes.has(String(block.type ?? ""))
    );
  });
}

function formatUpdatedAt(value?: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function plainTextToArticleHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function sanitizeArticleHtml(value?: string | null) {
  if (!value) {
    return "";
  }

  const html = looksLikeHtml(value) ? value : plainTextToArticleHtml(value);
  const allowedTags = new Set([
    "p",
    "br",
    "h2",
    "h3",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "a",
    "ul",
    "ol",
    "li",
    "div",
  ]);

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, rawTag, rawAttrs) => {
      const tag = String(rawTag).toLowerCase();

      if (!allowedTags.has(tag)) {
        return "";
      }

      const normalizedTag = tag === "div" ? "p" : tag;

      if (match.startsWith("</")) {
        return normalizedTag === "br" ? "" : `</${normalizedTag}>`;
      }

      if (normalizedTag === "br") {
        return "<br>";
      }

      if (normalizedTag !== "a") {
        return `<${normalizedTag}>`;
      }

      const hrefMatch = String(rawAttrs).match(/\shref=(["'])(.*?)\1/i);
      const href = hrefMatch?.[2]?.trim() ?? "";
      const isSafeHref =
        href.startsWith("/") ||
        href.startsWith("#") ||
        href.startsWith("https://") ||
        href.startsWith("http://") ||
        href.startsWith("mailto:");

      return isSafeHref
        ? `<a href="${escapeHtml(href)}" rel="nofollow noopener">`
        : "<a>";
    });
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function transliterateRussian(value: string) {
  const dictionary: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((letter) => dictionary[letter] ?? letter)
    .join("");
}

function createHeadingAnchor(text: string, index: number, usedIds: Set<string>) {
  const base =
    transliterateRussian(text)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || `section-${index + 1}`;
  let id = base;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);

  return id;
}

function buildArticleBodyWithTableOfContents(html: string) {
  const tableOfContents: { id: string; title: string }[] = [];
  const usedIds = new Set<string>();
  const htmlWithAnchors = html.replace(
    /<h2>([\s\S]*?)<\/h2>/gi,
    (match, headingContent) => {
      const title = stripHtml(String(headingContent));

      if (!title) {
        return match;
      }

      const id = createHeadingAnchor(title, tableOfContents.length, usedIds);
      tableOfContents.push({ id, title });

      return `<h2 id="${escapeHtml(id)}">${headingContent}</h2>`;
    },
  );

  return {
    html: htmlWithAnchors,
    tableOfContents,
  };
}

function getArticleToolBlocks(
  pageTools: {
    blockId: string | null;
  }[],
) {
  return pageTools
    .filter((pageTool) => pageTool.blockId)
    .map((pageTool) => ({
      id: `article-${pageTool.blockId}`,
      type: "tool",
      blockId: pageTool.blockId,
    }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const seoPage = await prisma.seoPage.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
    select: {
      title: true,
      description: true,
    },
  });

  if (!seoPage) {
    return {};
  }

  return {
    title: seoPage.title,
    description: seoPage.description,
    alternates: {
      canonical: getAbsoluteUrl(`/${slug}`),
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const selectedRegionCode = await getSelectedRegionCode();
  const seoPage = await prisma.seoPage.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: {
      faqItems: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          linkedSeoPage: {
            select: {
              slug: true,
              status: true,
              pageType: true,
              h1: true,
              title: true,
            },
          },
        },
      },
      offers: {
        where: {
          offer: {
            status: "ACTIVE",
          },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          offer: true,
        },
      },
      tools: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          tool: true,
        },
      },
    },
  });

  if (!seoPage) {
    notFound();
  }

  const availableSeoPageOffers = selectedRegionCode
    ? seoPage.offers.filter(
        (item) => !item.offer.restrictedRegionCodes.includes(selectedRegionCode),
      )
    : seoPage.offers;
  const selectedOffers = availableSeoPageOffers.map((item) =>
    ({
      ...mapOfferToCardData(item.offer),
      pageBadge: item.badge,
      pageNote: item.note,
      pageCtaText: item.ctaText,
      pageHighlight: item.highlight,
    }),
  );
  const offers =
    seoPage.offers.length > 0
      ? selectedOffers
      : await getActiveOffersForRegion(selectedRegionCode);
  const contentBlocks = seoPage.content
    ?.split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const updatedAtLabel = formatUpdatedAt(
    seoPage.updatedByUserAt ?? seoPage.publishedAt ?? seoPage.updatedAt,
  );
  const isCategoryPage = seoPage.pageType === "CATEGORY";
  const categoryCriterion = findManagedTextBlock(
    seoPage.contentBlocks,
    "category-criterion",
  );
  const rawCategoryCtaText = findManagedTextBlock(
    seoPage.contentBlocks,
    "category-main-cta",
  );
  const categoryCtaText =
    rawCategoryCtaText && rawCategoryCtaText !== "Сравнить предложения"
      ? rawCategoryCtaText
      : "Проверить кредитную историю";
  const categoryCtaUrl = findManagedHrefBlock(
    seoPage.contentBlocks,
    "category-main-cta",
  );
  const categoryPreOffersText = findManagedTextBlock(
    seoPage.contentBlocks,
    "category-pre-offers",
  );
  const categoryPostOffersText = findManagedTextBlock(
    seoPage.contentBlocks,
    "category-post-offers",
  );
  const advancedBlocks = getAdvancedBlocks(seoPage.contentBlocks);
  const toolBlocks = seoPage.tools
    .filter((pageTool) => pageTool.blockId)
    .map((pageTool) => ({
      id: `category-${pageTool.blockId}`,
      type: "tool",
      blockId: pageTool.blockId,
    }));
  const articleBody = buildArticleBodyWithTableOfContents(
    sanitizeArticleHtml(seoPage.content),
  );
  const articleContentBlocks = Array.isArray(seoPage.contentBlocks)
    ? seoPage.contentBlocks
    : [];
  const articleContentBlockToolIds = new Set(
    articleContentBlocks.flatMap((block) => {
      if (!isRecord(block) || block.type !== "tool" || !block.blockId) {
        return [];
      }

      return [String(block.blockId)];
    }),
  );
  const standaloneArticleToolBlocks = getArticleToolBlocks(seoPage.tools).filter(
    (block) => !articleContentBlockToolIds.has(String(block.blockId ?? "")),
  );
  const hasFaqContentBlock = articleContentBlocks.some(
    (block) => isRecord(block) && block.type === "faq",
  );
  const faqIsVisible =
    seoPage.pageType !== "SERVICE" ||
    !seoPage.contentBlocks ||
    hasFaqContentBlock;
  const breadcrumbs = getSeoPageBreadcrumbs(seoPage);
  const breadcrumbJsonLd = getBreadcrumbListJsonLd(breadcrumbs, `/${slug}`);
  const faqPageJsonLd = getFaqPageJsonLd(
    faqIsVisible ? seoPage.faqItems : [],
  );
  const articleJsonLd =
    seoPage.pageType === "ARTICLE"
      ? getArticleJsonLd({
          path: `/${slug}`,
          headline: seoPage.h1,
          description: seoPage.description,
          datePublished: seoPage.publishedAt ?? seoPage.createdAt,
          dateModified:
            seoPage.updatedByUserAt ?? seoPage.publishedAt ?? seoPage.updatedAt,
        })
      : null;

  if (isCategoryPage) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
        <SiteHeader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(breadcrumbJsonLd),
          }}
        />
        {faqPageJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(faqPageJsonLd),
            }}
          />
        ) : null}

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
            <Breadcrumbs items={breadcrumbs} />
            <p className="mb-4 text-sm font-semibold uppercase text-emerald-700">
              Подборка займов
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
              {seoPage.h1}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              {seoPage.intro ?? seoPage.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              {updatedAtLabel ? (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  Условия обновлены: {updatedAtLabel}
                </span>
              ) : null}
              <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Решение принимает кредитор после проверки заявки
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8">
          {categoryCriterion ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-bold text-slate-950">
                Почему эти офферы здесь
              </h2>
              <p className="mt-3 leading-7 text-slate-700">{categoryCriterion}</p>
            </div>
          ) : null}

          <div className="scroll-mt-24">
            {categoryPreOffersText ? (
              <p className="mb-5 max-w-3xl text-base leading-7 text-slate-700">
                {categoryPreOffersText}
              </p>
            ) : null}
            <FilterableOffers
              title="Предложения в подборке"
              offers={offers}
              pageType="category"
              categorySlug={slug}
            />
            {categoryPostOffersText ? (
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700">
                {categoryPostOffersText}
              </p>
            ) : null}
            {categoryCtaUrl ? (
              <a
                href={categoryCtaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-5 font-semibold text-white transition hover:bg-emerald-800"
              >
                {categoryCtaText}
              </a>
            ) : null}
          </div>
        </section>

        {toolBlocks.length > 0 ? (
          <section className="border-y border-slate-200 bg-white py-10">
            <SeoContentRenderer
              blocks={toolBlocks}
              pageTools={seoPage.tools}
              faqItems={seoPage.faqItems}
              offers={offers}
              pageType="category"
              categorySlug={slug}
              riskNotice={seoPage.riskNotice}
            />
          </section>
        ) : null}

        {contentBlocks && contentBlocks.length > 0 ? (
          <section className="mx-auto max-w-3xl px-5 py-12">
            <h2 className="text-2xl font-bold text-slate-950">
              Как выбирать предложение
            </h2>
            <div className="mt-5 grid gap-4 text-base leading-8 text-slate-700">
              {contentBlocks.map((block) => (
                <p key={block}>{block}</p>
              ))}
            </div>
          </section>
        ) : null}

        {advancedBlocks.length > 0 ? (
          <section className="py-4">
            <SeoContentRenderer
              blocks={advancedBlocks}
              pageTools={seoPage.tools}
              faqItems={seoPage.faqItems}
              offers={offers}
              pageType="category"
              categorySlug={slug}
              riskNotice={seoPage.riskNotice}
            />
          </section>
        ) : null}

        {seoPage.faqItems.length > 0 ? (
          <FaqSection items={seoPage.faqItems} />
        ) : null}

        {seoPage.riskNotice ? (
          <section className="mx-auto max-w-6xl px-5 pb-12">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {seoPage.riskNotice}
            </p>
          </section>
        ) : null}

        <SiteFooter />
      </main>
    );
  }

  if (seoPage.pageType === "ARTICLE") {
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
        <SiteHeader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(breadcrumbJsonLd),
          }}
        />
        {articleJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(articleJsonLd),
            }}
          />
        ) : null}
        {faqPageJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(faqPageJsonLd),
            }}
          />
        ) : null}

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
            <Breadcrumbs items={breadcrumbs} />
            <p className="mb-4 text-sm font-semibold uppercase text-emerald-700">
              Статья
            </p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
              {seoPage.h1}
            </h1>
            {articleBody.tableOfContents.length > 0 ? (
              <nav
                aria-label="Оглавление статьи"
                className="mt-6 max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold uppercase text-slate-500">
                  Оглавление
                </p>
                <ol className="mt-3 grid gap-2 text-base leading-7 text-slate-700">
                  {articleBody.tableOfContents.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="font-semibold text-emerald-700 underline-offset-4 hover:underline"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              {seoPage.intro ?? seoPage.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                Автор: Редакция ZaimKarta
              </span>
              {updatedAtLabel ? (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  Материал обновлен: {updatedAtLabel}
                </span>
              ) : null}
              {seoPage.editorNote ? (
                <span className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-800">
                  {seoPage.editorNote}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {articleBody.html ? (
          <section className="mx-auto max-w-3xl px-5 py-12">
            <article
              className="article-content"
              dangerouslySetInnerHTML={{
                __html: articleBody.html,
              }}
            />
          </section>
        ) : null}

        {articleContentBlocks.length > 0 ? (
          <section className="py-4">
            <SeoContentRenderer
              blocks={articleContentBlocks}
              pageTools={seoPage.tools}
              faqItems={seoPage.faqItems}
              offers={selectedOffers}
              pageType="article"
              categorySlug={slug}
              riskNotice={seoPage.riskNotice}
            />
          </section>
        ) : null}

        {standaloneArticleToolBlocks.length > 0 ? (
          <section className="border-y border-slate-200 bg-white py-10">
            <SeoContentRenderer
              blocks={standaloneArticleToolBlocks}
              pageTools={seoPage.tools}
              faqItems={seoPage.faqItems}
              offers={selectedOffers}
              pageType="article"
              categorySlug={slug}
              riskNotice={seoPage.riskNotice}
            />
          </section>
        ) : null}

        {selectedOffers.length > 0 ? (
          <section id="offers" className="mx-auto max-w-6xl px-5 py-12">
            <div className="mb-6 max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-950">
                Связанные предложения
              </h2>
              <p className="mt-2 leading-7 text-slate-600">
                Эти офферы могут быть полезны по теме статьи, но перед заявкой
                проверьте условия на стороне кредитора.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {selectedOffers.map((offer, index) => (
                <OfferCard
                  key={offer.name}
                  offer={offer}
                  pageType="article"
                  categorySlug={slug}
                  position={index + 1}
                />
              ))}
            </div>
          </section>
        ) : null}

        {seoPage.faqItems.length > 0 && !hasFaqContentBlock ? (
          <FaqSection items={seoPage.faqItems} />
        ) : null}

        {seoPage.riskNotice ? (
          <section className="mx-auto max-w-6xl px-5 pb-12">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {seoPage.riskNotice}
            </p>
          </section>
        ) : null}

        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd),
        }}
      />
      {faqPageJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(faqPageJsonLd),
          }}
        />
      ) : null}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
          <Breadcrumbs items={breadcrumbs} />
          <p className="mb-4 text-sm font-semibold uppercase text-emerald-700">
            {seoPage.pageType === "SERVICE" ? "Сервис" : "Подборка"}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            {seoPage.h1}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            {seoPage.intro ?? seoPage.description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        {seoPage.contentBlocks ? (
          <SeoContentRenderer
            blocks={seoPage.contentBlocks}
            pageTools={seoPage.tools}
            faqItems={seoPage.faqItems}
            offers={offers}
            pageType={seoPage.pageType.toLowerCase()}
            categorySlug={slug}
            riskNotice={seoPage.riskNotice}
          />
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-950">
                Предложения по теме
              </h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Выбранные предложения для этой страницы. Позиции можно менять в
                админке отдельно от общей витрины.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {offers.map((offer, index) => (
                <OfferCard
                  key={offer.name}
                  offer={offer}
                  pageType={seoPage.pageType.toLowerCase()}
                  categorySlug={slug}
                  position={index + 1}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {!seoPage.contentBlocks && contentBlocks && contentBlocks.length > 0 ? (
        <section className="border-y border-slate-200 bg-white px-5 py-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-950">Подробнее</h2>
            <div className="mt-5 grid gap-4 text-base leading-8 text-slate-700">
              {contentBlocks.map((block) => (
                <p key={block}>{block}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!seoPage.contentBlocks ? (
      <section className="border-y border-slate-200 bg-white px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-slate-950">
            Что важно проверить
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-lg border border-slate-200 p-5">
              <h3 className="font-bold text-slate-950">Полная стоимость</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Смотрите не только ставку в день, но и итоговую сумму возврата.
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 p-5">
              <h3 className="font-bold text-slate-950">Срок и продление</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Уточняйте, что будет при просрочке и можно ли продлить договор.
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 p-5">
              <h3 className="font-bold text-slate-950">Требования кредитора</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Решение о выдаче принимает кредитор после проверки заявки.
              </p>
            </article>
          </div>
        </div>
      </section>
      ) : null}

      {!seoPage.contentBlocks && seoPage.faqItems.length > 0 ? (
        <FaqSection items={seoPage.faqItems} />
      ) : null}

      {!seoPage.contentBlocks && seoPage.riskNotice ? (
        <section className="mx-auto max-w-6xl px-5 pb-12">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {seoPage.riskNotice}
          </p>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
