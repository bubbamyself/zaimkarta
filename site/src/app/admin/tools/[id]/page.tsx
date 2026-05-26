import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SeoToolEditor } from "../../seo-tool-editor";

type EditSeoToolProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    saved?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Редактирование инструмента — ZaimKarta",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function EditSeoTool({
  params,
  searchParams,
}: EditSeoToolProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const canManageSeo =
    session.role === "BOSS" || session.permissions.includes("offers_write");

  if (!canManageSeo) {
    redirect("/admin?section=tools");
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const seoTool = await prisma.seoTool.findUnique({
    where: {
      id,
    },
    include: {
      pageTools: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          page: {
            select: {
              h1: true,
              slug: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!seoTool) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <Link href="/admin?section=tools" className="text-xl font-bold">
              ZaimKarta
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              Редактирование интерактивного инструмента
            </p>
          </div>
          <Link
            href="/admin?section=tools"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
          >
            К инструментам
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                {seoTool.name}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                /{seoTool.slug} · {seoTool.status} · {seoTool.type}
              </p>
            </div>
            {resolvedSearchParams?.saved === "1" ? (
              <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Изменения сохранены
              </span>
            ) : null}
          </div>
        </section>

        <SeoToolEditor seoTool={seoTool} />
      </div>
    </main>
  );
}
