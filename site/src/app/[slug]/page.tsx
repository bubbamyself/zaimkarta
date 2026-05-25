import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferCard } from "@/components/offer-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveOffers, mapOfferToCardData } from "@/lib/offers";
import { prisma } from "@/lib/prisma";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

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
    },
  });

  if (!seoPage) {
    notFound();
  }

  const selectedOffers = seoPage.offers.map((item) =>
    mapOfferToCardData(item.offer),
  );
  const offers =
    selectedOffers.length > 0 ? selectedOffers : await getActiveOffers();
  const contentBlocks = seoPage.content
    ?.split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
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
      </section>

      {contentBlocks && contentBlocks.length > 0 ? (
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
