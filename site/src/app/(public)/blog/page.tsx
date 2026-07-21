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
  title: "Полезные статьи — ZaimKarta",
  description: "Все статьи ZaimKarta о займах, кредитной истории, переплате и подготовке к заявке.",
  alternates: {
    canonical: getAbsoluteUrl("/blog"),
  },
};

export default async function BlogPage() {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Главная", href: "/" },
    { label: "Статьи" },
  ];
  const breadcrumbJsonLd = getBreadcrumbListJsonLd(breadcrumbs, "/blog");
  const articles = await prisma.seoPage.findMany({
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
      publishedAt: true,
      createdAt: true,
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
            Блог
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Полезные статьи
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Материалы ZaimKarta о займах, переплате, кредитной истории и подготовке к заявке.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/${article.slug}`}
              className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-700"
            >
              <p className="text-xs font-semibold uppercase text-slate-500">
                {(article.publishedAt ?? article.createdAt).toLocaleDateString("ru-RU")}
              </p>
              <h2 className="mt-2 text-lg font-bold leading-7 text-slate-950">
                {article.h1 || article.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {article.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
