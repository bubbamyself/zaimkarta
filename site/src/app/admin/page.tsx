import type { Metadata } from "next";
import type { Offer } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createAdminUser,
  deleteAdminUser,
  updateAdminPassword,
  updateAdminUser,
} from "./admin-users-actions";
import { logoutAdmin } from "./logout-action";
import { OfferEditor } from "./offer-editor";
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

function getOfferStatusLabel(status: Offer["status"]) {
  if (status === "ACTIVE") {
    return "Активен";
  }

  if (status === "PAUSED") {
    return "На паузе";
  }

  if (status === "ARCHIVED") {
    return "Архив";
  }

  return "На паузе";
}

function getOfferStatusClass(status: Offer["status"]) {
  if (status === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "PAUSED") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
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

type AdminSection = "analytics" | "new-offer" | "offers" | "archive" | "access" | "seo";
type OfferFilter = "all" | "active" | "paused";
type AdminPageProps = {
  searchParams?: Promise<{
    section?: string;
    status?: string;
  }>;
};

const ADMIN_SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "analytics", label: "Аналитика" },
  { id: "new-offer", label: "Создать оффер" },
  { id: "offers", label: "Управление офферами" },
  { id: "archive", label: "Архив" },
  { id: "seo", label: "SEO-контент" },
];

function readSection(value: string | undefined, canManageAdmins: boolean): AdminSection {
  if (value === "access" && canManageAdmins) {
    return "access";
  }

  if (
    value === "analytics" ||
    value === "new-offer" ||
    value === "offers" ||
    value === "archive" ||
    value === "seo"
  ) {
    return value;
  }

  return "analytics";
}

function readOfferFilter(value: string | undefined): OfferFilter {
  if (value === "active" || value === "paused") {
    return value;
  }

  return "all";
}

function SectionLink({
  section,
  label,
  activeSection,
}: {
  section: AdminSection;
  label: string;
  activeSection: AdminSection;
}) {
  const isActive = section === activeSection;

  return (
    <Link
      href={`/admin?section=${section}`}
      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
        isActive
          ? "bg-slate-950 text-white"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const resolvedSearchParams = await searchParams;
  const canManageAdmins = session.role === "BOSS";
  const canManageOffers =
    session.role === "BOSS" || session.permissions.includes("offers_write");
  const canViewAnalytics =
    session.role === "BOSS" || session.permissions.includes("analytics");
  const activeSection = readSection(resolvedSearchParams?.section, canManageAdmins);
  const offerFilter = readOfferFilter(resolvedSearchParams?.status);

  const [offers, clicksCount, leadsCount, latestClicks, adminUsers, offerClickCounts] = await Promise.all([
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
    prisma.offerClick.groupBy({
      by: ["offerId"],
      _count: {
        id: true,
      },
    }),
  ]);

  const activeOffersCount = offers.filter((offer) => offer.status === "ACTIVE").length;
  const pausedOffersCount = offers.filter(
    (offer) => offer.status === "PAUSED" || offer.status === "DRAFT",
  ).length;
  const archivedOffersCount = offers.filter(
    (offer) => offer.status === "ARCHIVED",
  ).length;
  const workingOffers = offers.filter((offer) => {
    if (offer.status === "ARCHIVED") {
      return false;
    }

    if (offerFilter === "active") {
      return offer.status === "ACTIVE";
    }

    if (offerFilter === "paused") {
      return offer.status === "PAUSED" || offer.status === "DRAFT";
    }

    return true;
  });
  const archivedOffers = offers.filter((offer) => offer.status === "ARCHIVED");
  const offerClicksById = new Map(
    offerClickCounts.map((item) => [item.offerId, item._count.id]),
  );
  const navSections = canManageAdmins
    ? [...ADMIN_SECTIONS, { id: "access" as const, label: "Доступы" }]
    : ADMIN_SECTIONS;

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

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3">
          {navSections.map((item) => (
            <SectionLink
              key={item.id}
              section={item.id}
              label={item.label}
              activeSection={activeSection}
            />
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8">
        {activeSection === "analytics" && canViewAnalytics ? (
          <>
            <section>
              <h1 className="text-3xl font-bold text-slate-950">Статистика</h1>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="Активные офферы" value={activeOffersCount} />
                <StatCard label="На паузе" value={pausedOffersCount} />
                <StatCard label="В архиве" value={archivedOffersCount} />
                <StatCard label="Лиды" value={leadsCount} />
                <StatCard label="Клики" value={clicksCount} />
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
        ) : null}

        {activeSection === "analytics" && !canViewAnalytics ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-bold text-slate-950">Доступ ограничен</h1>
            <p className="mt-3 text-slate-600">
              Для этого профиля пока не назначены права на просмотр аналитики.
            </p>
          </section>
        ) : null}

        {activeSection === "new-offer" && canManageOffers ? (
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h1 className="text-2xl font-bold text-slate-950">
                Создать новый оффер
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Для оффера, который ты сам выбрал в CPA-сети.
              </p>
            </div>
            <div className="p-5">
              <OfferEditor />
            </div>
          </section>
        ) : null}

        {activeSection === "new-offer" && !canManageOffers ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-bold text-slate-950">Доступ ограничен</h1>
            <p className="mt-3 text-slate-600">
              Для этого профиля пока не назначены права на управление офферами.
            </p>
          </section>
        ) : null}

        {activeSection === "offers" ? (
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-end">
              <div>
                <h1 className="text-2xl font-bold text-slate-950">
                  Управление офферами
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Активные показываются на витрине и имеют публичную страницу.
                  Офферы на паузе остаются в работе, но не показываются трафику.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin?section=offers"
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    offerFilter === "all"
                      ? "bg-slate-950 text-white"
                      : "border border-slate-300 text-slate-700"
                  }`}
                >
                  Все в работе
                </Link>
                <Link
                  href="/admin?section=offers&status=active"
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    offerFilter === "active"
                      ? "bg-emerald-700 text-white"
                      : "border border-slate-300 text-slate-700"
                  }`}
                >
                  Активные
                </Link>
                <Link
                  href="/admin?section=offers&status=paused"
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    offerFilter === "paused"
                      ? "bg-amber-600 text-white"
                      : "border border-slate-300 text-slate-700"
                  }`}
                >
                  На паузе
                </Link>
                <Link
                  href="/admin?section=archive"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Архив офферов
                </Link>
              </div>
            </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Бренд</th>
                      <th className="px-5 py-3 font-semibold">Идентификаторы</th>
                      <th className="px-5 py-3 font-semibold">Статус</th>
                      <th className="px-5 py-3 font-semibold">Приоритет</th>
                      <th className="px-5 py-3 font-semibold">Сумма</th>
                      <th className="px-5 py-3 font-semibold">Проверено</th>
                      <th className="px-5 py-3 font-semibold">Клики</th>
                      <th className="px-5 py-3 font-semibold">Страница</th>
                      {canManageOffers ? (
                        <th className="px-5 py-3 font-semibold">Правка</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workingOffers.map((offer) => {
                      const affiliateOffer = offer.affiliateOffers.at(0);

                      return (
                        <tr key={offer.id}>
                          <td className="px-5 py-4 font-semibold text-slate-950">
                            {offer.brandName}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            <div className="grid gap-1">
                              <span>slug: {offer.slug}</span>
                              <span>
                                сеть:{" "}
                                {affiliateOffer?.networkName ??
                                  affiliateOffer?.network ??
                                  "—"}
                              </span>
                              <span>
                                offer ID: {affiliateOffer?.networkOfferId ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${getOfferStatusClass(offer.status)}`}
                            >
                              {getOfferStatusLabel(offer.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {offer.displayPriority}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {offer.minAmount?.toLocaleString("ru-RU") ?? "—"}-
                            {offer.maxAmount?.toLocaleString("ru-RU") ?? "—"} ₽
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {offer.conditionsCheckedAt
                              ? formatDate(offer.conditionsCheckedAt)
                              : "—"}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-950">
                            {offerClicksById.get(offer.id) ?? 0}
                          </td>
                          <td className="px-5 py-4">
                            <Link
                              href={`/offers/${offer.slug}`}
                              className={`font-semibold ${
                                offer.status === "ACTIVE"
                                  ? "text-emerald-700 hover:text-emerald-800"
                                  : "pointer-events-none text-slate-400"
                              }`}
                            >
                              {offer.status === "ACTIVE" ? "открыть" : "скрыта"}
                            </Link>
                          </td>
                          {canManageOffers ? (
                            <td className="px-5 py-4">
                              <Link
                                href={`/admin/offers/${offer.id}`}
                                className="font-semibold text-emerald-700 hover:text-emerald-800"
                              >
                                редактировать
                              </Link>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
        ) : null}

        {activeSection === "archive" ? (
              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-950">
                      Архив офферов
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                      Здесь лежат офферы, которые не используются в работе и не
                      показываются входящему трафику.
                    </p>
                  </div>
                  <Link
                    href="/admin?section=offers"
                    className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    К офферам в работе
                  </Link>
                </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Бренд</th>
                          <th className="px-5 py-3 font-semibold">Статус</th>
                          <th className="px-5 py-3 font-semibold">CPA-ссылка</th>
                          {canManageOffers ? (
                            <th className="px-5 py-3 font-semibold">Правка</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {archivedOffers.map((offer) => {
                          const affiliateOffer = offer.affiliateOffers.at(0);

                          return (
                            <tr key={offer.id}>
                              <td className="px-5 py-4 font-semibold text-slate-950">
                                {offer.brandName}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`rounded-md px-2 py-1 text-xs font-semibold ${getOfferStatusClass(offer.status)}`}
                                >
                                  {getOfferStatusLabel(offer.status)}
                                </span>
                              </td>
                              <td className="max-w-xs truncate px-5 py-4 text-slate-700">
                                {affiliateOffer?.trackingBaseUrl ?? "не подключена"}
                              </td>
                              {canManageOffers ? (
                                <td className="px-5 py-4">
                                  <Link
                                    href={`/admin/offers/${offer.id}`}
                                    className="font-semibold text-emerald-700 hover:text-emerald-800"
                                  >
                                    редактировать
                                  </Link>
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
              </section>
        ) : null}

        {activeSection === "seo" ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-bold text-slate-950">
              SEO-контент
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Раздел заготовлен под будущую работу с подборками, статьями,
              FAQ, мета-тегами и внутренней перелинковкой. Функционал добавим
              после бизнесовых инструментов.
            </p>
          </section>
        ) : null}

        {activeSection === "access" && canManageAdmins ? (
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h1 className="text-2xl font-bold text-slate-950">Доступы</h1>
              <p className="mt-2 text-sm text-slate-500">
                Раздел доступен только boss-пользователю.
              </p>
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
                  <PermissionCheckbox
                    name="offers_write"
                    label="Управление офферами"
                  />
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
                                name="offers_write"
                                label="Управление офферами"
                                defaultChecked={admin.permissions.includes("offers_write")}
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
