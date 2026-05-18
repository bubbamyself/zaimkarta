import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferCard } from "@/components/offer-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { categories } from "@/lib/mock-data";
import { getActiveOffers } from "@/lib/offers";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return categories.map((category) => ({
    slug: category.slug,
  }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    return {};
  }

  return {
    title: `${category.h1} — ZaimKarta`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  const offers = await getActiveOffers();

  if (!category) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
          <p className="mb-4 text-sm font-semibold uppercase text-emerald-700">
            Подборка
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            {category.h1}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            {category.description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-950">
            Предложения по теме
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Сейчас здесь демонстрационные карточки. На следующем этапе мы
            заменим их реальными МФО из CPA-сетей.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {offers.map((offer, index) => (
            <OfferCard
              key={offer.name}
              offer={offer}
              pageType="category"
              categorySlug={slug}
              position={index + 1}
            />
          ))}
        </div>
      </section>

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

      <SiteFooter />
    </main>
  );
}
