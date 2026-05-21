import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createAdminUser,
  deleteAdminUser,
  updateAdminPassword,
  updateAdminUser,
} from "./admin-users-actions";
import { logoutAdmin } from "./logout-action";
import { getAdminSession } from "@/lib/admin-auth";
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

function PermissionCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name="permissions"
        value={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-emerald-700"
      />
      {label}
    </label>
  );
}

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const canManageAdmins = session.role === "BOSS";
  const canViewAnalytics =
    session.role === "BOSS" || session.permissions.includes("analytics");

  const [offers, clicksCount, leadsCount, latestClicks, adminUsers] = await Promise.all([
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
    canManageAdmins
      ? prisma.adminUser.findMany({
          orderBy: [{ role: "asc" }, { username: "asc" }],
        })
      : Promise.resolve([]),
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
            <p className="mt-1 text-xs text-slate-500">
              {session.username} · {session.role}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
            >
              На сайт
            </Link>
            <form action={logoutAdmin}>
              <button className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                Выйти
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8">
        {canViewAnalytics ? (
          <>
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
                          <td className="px-5 py-4 text-slate-700">
                            {offer.status}
                          </td>
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
                <h2 className="text-xl font-bold text-slate-950">
                  Последние клики
                </h2>
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
                        <td
                          className="px-5 py-8 text-center text-slate-500"
                          colSpan={6}
                        >
                          Кликов пока нет
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-bold text-slate-950">Доступ ограничен</h1>
            <p className="mt-3 text-slate-600">
              Для этого профиля пока не назначены права на просмотр аналитики.
            </p>
          </section>
        )}

        {canManageAdmins ? (
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-bold text-slate-950">Администраторы</h2>
            </div>

            <div className="grid gap-6 p-5">
              <form
                action={createAdminUser}
                className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_1fr_160px_1.4fr_auto]"
              >
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Логин</span>
                  <input
                    name="username"
                    className="h-11 rounded-md border border-slate-300 bg-white px-3"
                    required
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Пароль</span>
                  <input
                    name="password"
                    type="password"
                    className="h-11 rounded-md border border-slate-300 bg-white px-3"
                    required
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Роль</span>
                  <select
                    name="role"
                    defaultValue="ADMIN"
                    className="h-11 rounded-md border border-slate-300 bg-white px-3"
                  >
                    <option value="ADMIN">admin</option>
                    <option value="BOSS">boss</option>
                  </select>
                </label>
                <fieldset className="grid content-start gap-2">
                  <legend className="mb-1 text-sm font-medium text-slate-700">
                    Права
                  </legend>
                  <PermissionCheckbox
                    name="analytics"
                    label="Аналитика"
                    defaultChecked
                  />
                  <PermissionCheckbox name="offers_read" label="Офферы" />
                  <PermissionCheckbox name="clicks_read" label="Клики" />
                </fieldset>
                <button className="self-end rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
                  Создать
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Логин</th>
                      <th className="px-4 py-3 font-semibold">Роль и статус</th>
                      <th className="px-4 py-3 font-semibold">Права</th>
                      <th className="px-4 py-3 font-semibold">Новый пароль</th>
                      <th className="px-4 py-3 font-semibold">Удаление</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminUsers.map((admin) => (
                      <tr key={admin.id} className="align-top">
                        <td className="px-4 py-4 font-semibold text-slate-950">
                          {admin.username}
                          {admin.id === session.id ? (
                            <span className="ml-2 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                              вы
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <form action={updateAdminUser} className="grid gap-3">
                            <input type="hidden" name="adminId" value={admin.id} />
                            <select
                              name="role"
                              defaultValue={admin.role}
                              className="h-10 rounded-md border border-slate-300 bg-white px-3"
                            >
                              <option value="ADMIN">admin</option>
                              <option value="BOSS">boss</option>
                            </select>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                name="isActive"
                                defaultChecked={admin.isActive}
                              />
                              Активен
                            </label>
                            <fieldset className="grid gap-2">
                              <PermissionCheckbox
                                name="analytics"
                                label="Аналитика"
                                defaultChecked={admin.permissions.includes("analytics")}
                              />
                              <PermissionCheckbox
                                name="offers_read"
                                label="Офферы"
                                defaultChecked={admin.permissions.includes("offers_read")}
                              />
                              <PermissionCheckbox
                                name="clicks_read"
                                label="Клики"
                                defaultChecked={admin.permissions.includes("clicks_read")}
                              />
                            </fieldset>
                            <button className="w-fit rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-800 hover:border-slate-500">
                              Сохранить
                            </button>
                          </form>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {admin.permissions.length > 0
                            ? admin.permissions.join(", ")
                            : "нет"}
                        </td>
                        <td className="px-4 py-4">
                          <form action={updateAdminPassword} className="flex gap-2">
                            <input type="hidden" name="adminId" value={admin.id} />
                            <input
                              name="password"
                              type="password"
                              placeholder="новый пароль"
                              className="h-10 rounded-md border border-slate-300 bg-white px-3"
                              required
                            />
                            <button className="rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-800 hover:border-slate-500">
                              Сменить
                            </button>
                          </form>
                        </td>
                        <td className="px-4 py-4">
                          <form action={deleteAdminUser}>
                            <input type="hidden" name="adminId" value={admin.id} />
                            <button
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 hover:border-red-300"
                              disabled={admin.id === session.id}
                            >
                              Удалить
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
