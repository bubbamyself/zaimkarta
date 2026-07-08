import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SeoPageEditor } from "../../seo-page-editor";

type EditSeoPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    saved?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Редактирование SEO-страницы — ZaimKarta",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function EditSeoPage({
  params,
  searchParams,
}: EditSeoPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const [seoPage, offers, seoTools] = await Promise.all([
    prisma.seoPage.findUnique({
      where: {
        id,
      },
      include: {
        offers: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
        faqItems: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
        tools: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: {
            tool: true,
          },
        },
      },
    }),
    prisma.offer.findMany({
      orderBy: [{ displayPriority: "asc" }, { status: "asc" }, { brandName: "asc" }],
      include: {
        affiliateOffers: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    }),
    prisma.seoTool.findMany({
      orderBy: [{ status: "asc" }, { type: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!seoPage) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <Link href="/admin?section=seo" className="text-xl font-bold">
              ZaimKarta
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              Редактирование SEO-страницы
            </p>
          </div>
          <Link
            href="/admin?section=seo"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
          >
            К SEO-страницам
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                {seoPage.h1}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                /{seoPage.slug} · {seoPage.status} · {seoPage.pageType}
              </p>
            </div>
            {resolvedSearchParams?.saved === "1" ? (
              <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Изменения сохранены
              </span>
            ) : null}
          </div>
        </section>

        <SeoPageEditor seoPage={seoPage} offers={offers} seoTools={seoTools} />
      </div>
    </main>
  );
}
