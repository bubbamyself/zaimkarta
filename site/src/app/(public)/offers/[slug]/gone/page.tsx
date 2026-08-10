import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ARCHIVED_OFFER_REWRITE_HEADER } from "@/lib/offer-archive-policy";
import { getActiveOffersForRegion } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import { getSelectedRegionCode } from "@/lib/region-cookie";

type GoneOfferPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Предложение закрыто — ZaimKarta",
  description:
    "Предложение окончательно закрыто. Посмотрите актуальные варианты на ZaimKarta.",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function GoneOfferPage({ params }: GoneOfferPageProps) {
  const requestHeaders = await headers();

  if (requestHeaders.get(ARCHIVED_OFFER_REWRITE_HEADER) !== "1") {
    notFound();
  }

  const { slug } = await params;
  const offer = await prisma.offer.findFirst({
    where: {
      slug,
      status: "ARCHIVED",
    },
    select: {
      brandName: true,
      shortDescription: true,
    },
  });

  if (!offer) {
    notFound();
  }

  const selectedRegionCode = await getSelectedRegionCode();
  const alternatives = (
    await getActiveOffersForRegion(selectedRegionCode, {
      requireActiveAffiliateOffer: true,
    })
  ).slice(0, 3);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Предложение закрыто
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            {offer.brandName} больше не принимает заявки
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Это предложение закрыто окончательно, поэтому мы убрали кнопку
            заявки и не будем отправлять вас по неработающей ссылке.
          </p>
          {offer.shortDescription ? (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">
              Ранее на этой странице было предложение: {offer.shortDescription}
            </p>
          ) : null}
          <Link
            href="/#offers"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-700 px-6 font-semibold text-white transition hover:bg-emerald-800"
          >
            Перейти к актуальным предложениям
          </Link>
        </div>
      </section>

      {alternatives.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-2xl font-bold">Актуальные альтернативы</h2>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">
            Эти предложения активны сейчас. Перед заявкой мы дополнительно
            проверим доступность для выбранного региона.
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {alternatives.map((alternative) => (
              <li key={alternative.slug}>
                <Link
                  href={`/offers/${alternative.slug}`}
                  className="block h-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400"
                >
                  <span className="text-lg font-bold">
                    {alternative.name}
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-slate-600">
                    {alternative.amount} · {alternative.term} · ставка {alternative.rate}
                  </span>
                  <span className="mt-4 block font-semibold text-emerald-700">
                    Посмотреть условия
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
