import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Админка — ZaimKarta",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }

  const [offers, clicksCount, leadsCount, latestClicks] = await Promise.all([
    prisma.offer.findMany({
      orderBy: [{ status: "asc" }, { brandName: "asc" }],
      include: {
        affiliateOffers: {
          where: {
            isActive: true,
          },
          take: 1,
        },
      },
    }),
    prisma.offerClick.count(),
    prisma.lead.count(),
    prisma.offerClick.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      include: {
        offer: true,
        affiliateOffer: true,
        lead: true,
      },
    }),
  ]);

  const activeOffersCount = offers.filter((offer) => offer.status === "ACTIVE").length;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <Link href="/" className="text-xl font-bold">
              ZaimKarta
            </Link>
            <p className="mt-1 text-sm text-slate-500">Внутренняя панель</p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
          >
            На сайт
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8">
        <section>
          <h1 className="text-3xl font-bold text-slate-950">Статистика</h1>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Активные офферы" value={activeOffersCount} />
            <StatCard label="Всего офферов" value={offers.length} />
            <StatCard label="Лиды" value={leadsCount} />
            <StatCard label="Клики" value={clicksCount} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold text-slate-950">Офферы</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Бренд</th>
                  <th className="px-5 py-3 font-semibold">Статус</th>
                  <th className="px-5 py-3 font-semibold">Сумма</th>
                  <th className="px-5 py-3 font-semibold">CPA-ссылка</th>
                  <th className="px-5 py-3 font-semibold">Страница</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offers.map((offer) => {
                  const affiliateOffer = offer.affiliateOffers.at(0);

                  return (
                    <tr key={offer.id}>
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {offer.brandName}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{offer.status}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {offer.minAmount?.toLocaleString("ru-RU") ?? "—"}-
                        {offer.maxAmount?.toLocaleString("ru-RU") ?? "—"} ₽
                      </td>
                      <td className="max-w-xs truncate px-5 py-4 text-slate-700">
                        {affiliateOffer?.trackingBaseUrl ?? "не подключена"}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/offers/${offer.slug}`}
                          className="font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          открыть
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold text-slate-950">Последние клики</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Время</th>
                  <th className="px-5 py-3 font-semibold">Оффер</th>
                  <th className="px-5 py-3 font-semibold">Источник</th>
                  <th className="px-5 py-3 font-semibold">Позиция</th>
                  <th className="px-5 py-3 font-semibold">Lead ID</th>
                  <th className="px-5 py-3 font-semibold">Редирект</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestClicks.length > 0 ? (
                  latestClicks.map((click) => (
                    <tr key={click.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {formatDate(click.createdAt)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {click.offer.brandName}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {click.pageType ?? "—"}
                        {click.categorySlug ? ` / ${click.categorySlug}` : ""}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {click.cardPosition ?? "—"}
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-4 font-mono text-xs text-slate-700">
                        {click.lead.leadId}
                      </td>
                      <td className="max-w-sm truncate px-5 py-4 text-slate-700">
                        {click.redirectUrl}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                      Кликов пока нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
