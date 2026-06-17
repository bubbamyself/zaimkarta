import type { Metadata } from "next";
import Link from "next/link";
import { OfferCard } from "@/components/offer-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveOffers } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import { getAbsoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ZaimKarta — подбор микрозаймов на карту онлайн",
  description:
    "Сравнение предложений МФО: займы на карту, срочные займы, первый заем под 0%, условия, сроки и ставки.",
  alternates: {
    canonical: getAbsoluteUrl("/"),
  },
};

export default async function Home() {
  const [offers, categories, services, articles] = await Promise.all([
    getActiveOffers(),
    prisma.seoPage.findMany({
      where: {
        status: "PUBLISHED",
        pageType: "CATEGORY",
      },
      orderBy: [{ createdAt: "asc" }],
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
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
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
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
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
            <p className="mb-4 text-sm font-semibold uppercase text-emerald-700">
              zaimkarta.ru
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              Подбор микрозаймов на карту онлайн
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Сравнивайте предложения МФО по сумме, сроку, ставке и условиям
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

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Сумма займа
                </span>
                <select className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900">
                  <option>До 10 000 ₽</option>
                  <option>До 30 000 ₽</option>
                  <option>До 50 000 ₽</option>
                  <option>Больше 50 000 ₽</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Срок</span>
                <select className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900">
                  <option>До 7 дней</option>
                  <option>До 30 дней</option>
                  <option>До 90 дней</option>
                  <option>Больше 90 дней</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Что важно
                </span>
                <select className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-900">
                  <option>Минимальная ставка</option>
                  <option>Быстрое решение</option>
                  <option>Первый заем под 0%</option>
                  <option>Высокая вероятность одобрения</option>
                </select>
              </label>
              <a
                href="#offers"
                className="mt-2 inline-flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-6 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                Подобрать
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="offers" className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Популярные предложения
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Пока это демонстрационные карточки. Позже здесь будут реальные
              офферы из CPA-сетей с актуальными условиями.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {offers.map((offer, index) => (
            <OfferCard
              key={offer.name}
              offer={offer}
              pageType="home"
              position={index + 1}
            />
          ))}
        </div>
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

      <section
        id="categories"
        className="border-y border-slate-200 bg-white px-5 py-12"
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
                className="rounded-lg border border-slate-200 bg-white p-4 font-semibold text-slate-800 transition hover:border-emerald-700 hover:text-emerald-800"
              >
                {category.h1 || category.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="articles" className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-2xl font-bold text-slate-950">Полезные статьи</h2>
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
