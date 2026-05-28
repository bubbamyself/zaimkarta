import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OfferCard } from "@/components/offer-card";
import { SeoContentRenderer } from "@/components/seo-content-renderer";
import { FilterableOffers } from "@/components/seo-tools/filterable-offers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveOffers, mapOfferToCardData } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import {
  getBreadcrumbListJsonLd,
  getSeoPageBreadcrumbs,
} from "@/lib/seo-breadcrumbs";

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

function stringifyJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
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
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const seoPage = await prisma.seoPage.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: {
      faqItems: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
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

  const selectedOffers = seoPage.offers.map((item) =>
    ({
      ...mapOfferToCardData(item.offer),
      pageBadge: item.badge,
      pageNote: item.note,
      pageCtaText: item.ctaText,
      pageHighlight: item.highlight,
    }),
  );
  const offers =
    selectedOffers.length > 0 ? selectedOffers : await getActiveOffers();
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
  const categoryCtaText =
    findManagedTextBlock(seoPage.contentBlocks, "category-main-cta") ||
    "Сравнить предложения";
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
  const breadcrumbs = getSeoPageBreadcrumbs(seoPage);
  const breadcrumbJsonLd = getBreadcrumbListJsonLd(breadcrumbs, `/${slug}`);

  if (isCategoryPage) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
        <SiteHeader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd(breadcrumbJsonLd),
          }}
        />

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
                Решение принимает МФО после проверки заявки
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
            <a
              href="#offers"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-5 font-semibold text-white transition hover:bg-emerald-800"
            >
              {categoryCtaText}
            </a>
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
          <section className="mx-auto max-w-3xl px-5 py-12">
            <h2 className="text-2xl font-bold text-slate-950">Вопросы и ответы</h2>
            <div className="mt-6 grid gap-3">
              {seoPage.faqItems.map((item) => (
                <details
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white p-5"
                >
                  <summary className="cursor-pointer font-semibold text-slate-950">
                    {item.question}
                  </summary>
                  <p className="mt-3 leading-7 text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
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
          __html: stringifyJsonLd(breadcrumbJsonLd),
        }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
          <Breadcrumbs items={breadcrumbs} />
          <p className="mb-4 text-sm font-semibold uppercase text-emerald-700">
            {seoPage.pageType === "ARTICLE"
              ? "Статья"
              : seoPage.pageType === "SERVICE"
                ? "Сервис"
                : "Подборка"}
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
              <h3 className="font-bold text-slate-950">Требования МФО</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Решение о выдаче принимает МФО после проверки заявки.
              </p>
            </article>
          </div>
        </div>
      </section>
      ) : null}

      {!seoPage.contentBlocks && seoPage.faqItems.length > 0 ? (
        <section className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="text-2xl font-bold text-slate-950">Вопросы и ответы</h2>
          <div className="mt-6 grid gap-3">
            {seoPage.faqItems.map((item) => (
              <details
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <summary className="cursor-pointer font-semibold text-slate-950">
                  {item.question}
                </summary>
                <p className="mt-3 leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
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
