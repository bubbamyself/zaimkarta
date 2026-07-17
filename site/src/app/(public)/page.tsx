import type { Metadata } from "next";
import Link from "next/link";
import { HomeOfferPicker } from "@/components/home-offer-picker";
import { HomepageFeaturedOfferCard } from "@/components/homepage-featured-offer-card";
import { FilterableOffers } from "@/components/seo-tools/filterable-offers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveOffersForRegion } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import { getSelectedRegionCode } from "@/lib/region-cookie";
import { getHomepageFeaturedOffer } from "@/lib/homepage-featured-offer";
import { getAbsoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ZaimKarta — подбор микрозаймов на карту онлайн",
  description:
    "Сравнение кредитных предложений: займы на карту, срочные займы, первый заем под 0%, условия, сроки и ставки.",
  alternates: {
    canonical: getAbsoluteUrl("/"),
  },
};

export default async function Home() {
  const selectedRegionCode = await getSelectedRegionCode();
  const [featuredOffer, offers, categories, services, articles] =
    await Promise.all([
      getHomepageFeaturedOffer(selectedRegionCode),
      getActiveOffersForRegion(selectedRegionCode),
      prisma.seoPage.findMany({
        where: {
          status: "PUBLISHED",
          pageType: "CATEGORY",
        },
        orderBy: [{ displayPriority: "asc" }, { createdAt: "asc" }],
        select: {
          slug: true,
          title: true,
          h1: true,
        },
      }),
      prisma.seoPage.findMany({
        where: {
          status: "PUBLISHED",
          pageType: "SERVICE",
        },
        orderBy: [
          { displayPriority: "asc" },
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        take: 4,
        select: {
          slug: true,
          title: true,
          description: true,
          h1: true,
        },
      }),
      prisma.seoPage.findMany({
        where: {
          status: "PUBLISHED",
          pageType: "ARTICLE",
        },
        orderBy: [
          { displayPriority: "asc" },
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        take: 4,
        select: {
          slug: true,
          title: true,
          description: true,
          h1: true,
        },
      }),
    ]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-14">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              Подбор микрозаймов на карту онлайн
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Сравнивайте предложения кредиторов по сумме, сроку, ставке и условиям
              получения. Мы показываем параметры открыто и помогаем выбрать
              вариант без лишней спешки.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#offers"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-700 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                Смотреть предложения
              </a>
              <a
                href="#articles"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-base font-semibold text-slate-800 transition hover:border-slate-500"
              >
                Читать советы
              </a>
            </div>
          </div>

          {featuredOffer ? (
            <HomepageFeaturedOfferCard offer={featuredOffer} />
          ) : (
            <HomeOfferPicker />
          )}
        </div>
      </section>

      <section
        id="categories"
        className="border-b border-slate-200 bg-white px-5 py-12"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-slate-950">
            Категории займов
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/${category.slug}`}
                className="flex min-h-20 items-center rounded-lg border border-slate-200 bg-white p-4 font-semibold leading-6 text-slate-800 transition hover:border-emerald-700 hover:text-emerald-800"
              >
                {category.h1 || category.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <FilterableOffers
          title="Популярные предложения"
          offers={offers}
          pageType="home"
          categorySlug="home"
        />
      </section>

      <section id="services" className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Сервисы и калькуляторы
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Интерактивные инструменты помогают прикинуть переплату, проверить
              базовые условия и перейти к более подходящим предложениям.
            </p>
          </div>
          <Link
            href="/services"
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-800 transition hover:border-slate-500"
          >
            Все сервисы
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {services.length > 0 ? (
            services.map((service) => (
              <Link
                key={service.slug}
                href={`/${service.slug}`}
                className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-700"
              >
                <p className="text-sm font-semibold uppercase text-emerald-700">
                  Сервис
                </p>
                <h3 className="mt-2 text-lg font-bold leading-7 text-slate-950">
                  {service.h1 || service.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {service.description}
                </p>
              </Link>
            ))
          ) : (
            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold leading-7 text-slate-950">
                Сервисы появятся после публикации
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Создай SEO-страницу с типом “Сервис” и статусом
                “Опубликована”.
              </p>
            </article>
          )}
        </div>
      </section>

      <section id="articles" className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <h2 className="text-2xl font-bold text-slate-950">Полезные статьи</h2>
          <Link
            href="/blog"
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-800 transition hover:border-slate-500"
          >
            Все статьи
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {articles.length > 0 ? (
            articles.map((article) => (
              <Link
                key={article.slug}
                href={`/${article.slug}`}
                className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-700"
              >
                <h3 className="text-lg font-bold leading-7 text-slate-950">
                  {article.h1 || article.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {article.description}
                </p>
              </Link>
            ))
          ) : (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <h3 className="text-lg font-bold leading-7 text-slate-950">
                Статьи появятся после публикации
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Создай SEO-страницу с типом “Статья” и статусом
                “Опубликована”.
              </p>
            </article>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
