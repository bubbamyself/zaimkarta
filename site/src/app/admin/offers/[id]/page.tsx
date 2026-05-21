import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { OfferEditor } from "../../offer-editor";

type EditOfferPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    saved?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Редактирование оффера — ZaimKarta",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function EditOfferPage({
  params,
  searchParams,
}: EditOfferPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const canManageOffers =
    session.role === "BOSS" || session.permissions.includes("offers_write");

  if (!canManageOffers) {
    redirect("/admin?section=offers");
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const offer = await prisma.offer.findUnique({
    where: {
      id,
    },
    include: {
      affiliateOffers: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!offer) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <Link href="/admin?section=offers" className="text-xl font-bold">
              ZaimKarta
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              Редактирование оффера
            </p>
          </div>
          <Link
            href="/admin?section=offers"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
          >
            К управлению офферами
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                {offer.brandName}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                slug: {offer.slug} · статус: {offer.status}
              </p>
            </div>
            {resolvedSearchParams?.saved === "1" ? (
              <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Изменения сохранены
              </span>
            ) : null}
          </div>
        </section>

        <OfferEditor offer={offer} />
      </div>
    </main>
  );
}
