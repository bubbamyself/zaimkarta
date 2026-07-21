import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { getBreadcrumbListJsonLd } from "@/lib/seo-breadcrumbs";
import { getAbsoluteUrl } from "@/lib/site-url";
import { serializeJsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Сервисы и калькуляторы — ZaimKarta",
  description: "Все интерактивные сервисы ZaimKarta для подготовки к заявке и оценки условий займа.",
  alternates: {
    canonical: getAbsoluteUrl("/services"),
  },
};

export default async function ServicesPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Главная", href: "/" },
    { label: "Сервисы" },
  ];
  const breadcrumbJsonLd = getBreadcrumbListJsonLd(breadcrumbs, "/services");
  const services = await prisma.seoPage.findMany({
    where: {
      status: "PUBLISHED",
      pageType: "SERVICE",
    },
    orderBy: [{ displayPriority: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      slug: true,
      title: true,
      description: true,
      h1: true,
    },
  });

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd),
        }}
      />
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
          <Breadcrumbs items={breadcrumbs} />
          <p className="mb-4 text-sm font-semibold uppercase text-emerald-700">
            Сервисы
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Сервисы и калькуляторы
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Инструменты ZaimKarta для оценки переплаты, готовности к заявке и базовых условий.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Link
              key={service.slug}
              href={`/${service.slug}`}
              className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-700"
            >
              <p className="text-sm font-semibold uppercase text-emerald-700">
                Сервис
              </p>
              <h2 className="mt-2 text-lg font-bold leading-7 text-slate-950">
                {service.h1 || service.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {service.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
