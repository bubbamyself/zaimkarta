import type { Metadata } from "next";
import type { Offer, SeoPageType, SeoTool } from "@prisma/client";
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
import { OfferOrderTable, type OfferOrderRow } from "./offer-order-table";
import { SeoPageEditor } from "./seo-page-editor";
import {
  SeoPageOrderTable,
  type SeoPageOrderRow,
} from "./seo-page-order-table";
import { SeoToolEditor } from "./seo-tool-editor";
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

const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const REPORT_TIME_ZONE_OFFSET = "+07:00";
const ANALYTICS_TABLE_LIMIT = 100;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: REPORT_TIME_ZONE,
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
  if (status === "DRAFT") {
    return "Черновик";
  }

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
  if (status === "DRAFT") {
    return "bg-sky-50 text-sky-700";
  }

  if (status === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "PAUSED") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getSeoStatusLabel(status: string) {
  if (status === "PUBLISHED") {
    return "Опубликована";
  }

  if (status === "DRAFT") {
    return "Черновик";
  }

  if (status === "PAUSED") {
    return "На паузе";
  }

  return "Архив";
}

function getSeoStatusClass(status: string) {
  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "DRAFT") {
    return "bg-sky-50 text-sky-700";
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

type AdminSection =
  | "analytics"
  | "new-offer"
  | "offers"
  | "archive"
  | "access"
  | "create-seo"
  | "seo"
  | "seo-archive"
  | "tools";
type OfferFilter = "all" | "active" | "paused";
type SeoStatusFilter = "all" | "published" | "draft" | "paused";
type SeoTypeFilter = "all" | SeoPageType;
type SeoToolFilter = "all" | "with-tools" | "without-tools";
type AdminPageProps = {
  searchParams?: Promise<{
    section?: string;
    status?: string;
    seoStatus?: string;
    seoType?: string;
    seoTool?: string;
    type?: string;
    from?: string;
    to?: string;
  }>;
};

const ADMIN_SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "analytics", label: "Аналитика" },
  { id: "new-offer", label: "Создать оффер" },
  { id: "offers", label: "Управление офферами" },
  { id: "archive", label: "Архив" },
  { id: "create-seo", label: "Создать SEO" },
  { id: "seo", label: "Управление SEO" },
  { id: "seo-archive", label: "Архив SEO" },
  { id: "tools", label: "Интерактивные инструменты" },
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
    value === "create-seo" ||
    value === "seo" ||
    value === "seo-archive" ||
    value === "tools"
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

function readSeoStatusFilter(value: string | undefined): SeoStatusFilter {
  if (value === "published" || value === "draft" || value === "paused") {
    return value;
  }

  return "all";
}

function readSeoTypeFilter(value: string | undefined): SeoTypeFilter {
  if (value === "CATEGORY" || value === "ARTICLE" || value === "SERVICE") {
    return value;
  }

  return "all";
}

function readSeoToolFilter(value: string | undefined): SeoToolFilter {
  if (value === "with-tools" || value === "without-tools") {
    return value;
  }

  return "all";
}

function getSeoTypeLabel(type: string) {
  if (type === "CATEGORY") {
    return "Подборка";
  }

  if (type === "ARTICLE") {
    return "Статья";
  }

  if (type === "SERVICE") {
    return "Сервис";
  }

  return type;
}

function getSeoToolTypeLabel(type: string) {
  if (type === "OVERPAYMENT_CALCULATOR") {
    return "Калькулятор";
  }

  if (type === "APPLICATION_CHECKLIST") {
    return "Чек-лист";
  }

  if (type === "MINI_OFFER_PICKER") {
    return "Мини-подборщик";
  }

  if (type === "LOAN_TYPE_QUIZ") {
    return "Квиз";
  }

  if (type === "COMPARISON") {
    return "Сравнение";
  }

  return type;
}

function getSeoToolStatusLabel(status: SeoTool["status"]) {
  if (status === "ACTIVE") {
    return "Активен";
  }

  return getSeoStatusLabel(status);
}

function readCreateSeoType(value: string | undefined): SeoPageType | null {
  if (value === "CATEGORY" || value === "ARTICLE" || value === "SERVICE") {
    return value;
  }

  return null;
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-semibold ${
        active
          ? "bg-slate-950 text-white"
          : "border border-slate-300 text-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}

function toInputDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
  }).formatToParts(value);
  const dateParts = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function createPeriodBoundary(value: string, endOfDay = false) {
  return new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}${REPORT_TIME_ZONE_OFFSET}`,
  );
}

function readPeriod(valueFrom: string | undefined, valueTo: string | undefined) {
  const today = new Date();
  const defaultTo = toInputDate(today);
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);
  const defaultFrom = toInputDate(defaultFromDate);
  const from = valueFrom && /^\d{4}-\d{2}-\d{2}$/.test(valueFrom)
    ? valueFrom
    : defaultFrom;
  const to = valueTo && /^\d{4}-\d{2}-\d{2}$/.test(valueTo) ? valueTo : defaultTo;

  return {
    from,
    to,
    fromDate: createPeriodBoundary(from),
    toDate: createPeriodBoundary(to, true),
  };
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
  const canManageSeo = Boolean(session);
  const canViewAnalytics =
    session.role === "BOSS" || session.permissions.includes("analytics");
  const activeSection = readSection(resolvedSearchParams?.section, canManageAdmins);
  const offerFilter = readOfferFilter(resolvedSearchParams?.status);
  const seoStatusFilter = readSeoStatusFilter(resolvedSearchParams?.seoStatus);
  const seoTypeFilter = readSeoTypeFilter(resolvedSearchParams?.seoType);
  const seoToolFilter = readSeoToolFilter(resolvedSearchParams?.seoTool);
  const createSeoType = readCreateSeoType(resolvedSearchParams?.type);
  const analyticsPeriod = readPeriod(
    resolvedSearchParams?.from,
    resolvedSearchParams?.to,
  );

  const [
    offers,
    clicksCount,
    leadsCount,
    latestClicks,
    adminUsers,
    offerClickCounts,
    periodOfferClickCounts,
    seoPages,
    seoCategoryClickCounts,
    seoTools,
  ] = await Promise.all([
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
    prisma.offerClick.count({
      where: {
        createdAt: {
          gte: analyticsPeriod.fromDate,
          lte: analyticsPeriod.toDate,
        },
      },
    }),
    prisma.lead.count({
      where: {
        createdAt: {
          gte: analyticsPeriod.fromDate,
          lte: analyticsPeriod.toDate,
        },
      },
    }),
    prisma.offerClick.findMany({
      where: {
        createdAt: {
          gte: analyticsPeriod.fromDate,
          lte: analyticsPeriod.toDate,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: ANALYTICS_TABLE_LIMIT,
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
    prisma.offerClick.groupBy({
      by: ["offerId"],
      where: {
        createdAt: {
          gte: analyticsPeriod.fromDate,
          lte: analyticsPeriod.toDate,
        },
      },
      _count: {
        id: true,
      },
    }),
    prisma.seoPage.findMany({
      orderBy: [
        { pageType: "asc" },
        { displayPriority: "asc" },
        { publishedAt: "desc" },
        { updatedAt: "desc" },
      ],
      include: {
        offers: true,
        faqItems: true,
        tools: true,
      },
    }),
    prisma.offerClick.groupBy({
      by: ["categorySlug"],
      where: {
        categorySlug: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    }),
    prisma.seoTool.findMany({
      orderBy: [{ status: "asc" }, { type: "asc" }, { createdAt: "asc" }],
      include: {
        pageTools: {
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
  const offersById = new Map(offers.map((offer) => [offer.id, offer]));
  const periodOfferStats = periodOfferClickCounts
    .map((item) => ({
      clicks: item._count.id,
      offer: offersById.get(item.offerId),
      offerId: item.offerId,
    }))
    .sort((first, second) => second.clicks - first.clicks);
  const workingOfferRows: OfferOrderRow[] = workingOffers.map((offer) => {
    const affiliateOffer = offer.affiliateOffers.at(0);

    return {
      id: offer.id,
      brandName: offer.brandName,
      slug: offer.slug,
      networkLabel:
        affiliateOffer?.networkName ?? affiliateOffer?.network ?? "—",
      networkOfferId: affiliateOffer?.networkOfferId ?? "—",
      status: offer.status,
      statusLabel: getOfferStatusLabel(offer.status),
      statusClassName: getOfferStatusClass(offer.status),
      displayPriority: offer.displayPriority,
      amountLabel: `${offer.minAmount?.toLocaleString("ru-RU") ?? "—"}-${
        offer.maxAmount?.toLocaleString("ru-RU") ?? "—"
      } ₽`,
      restrictedRegionCodes: offer.restrictedRegionCodes,
      conditionsCheckedAtLabel: offer.conditionsCheckedAt
        ? formatDate(offer.conditionsCheckedAt)
        : "—",
      clicks: offerClicksById.get(offer.id) ?? 0,
    };
  });
  const navSections = canManageAdmins
    ? [...ADMIN_SECTIONS, { id: "access" as const, label: "Доступы" }]
    : ADMIN_SECTIONS;
  const seoClicksBySlug = new Map(
    seoCategoryClickCounts
      .filter((item) => item.categorySlug)
      .map((item) => [item.categorySlug as string, item._count.id]),
  );
  const workingSeoPages = seoPages.filter((page) => {
    if (page.status === "ARCHIVED") {
      return false;
    }

    if (seoStatusFilter === "published" && page.status !== "PUBLISHED") {
      return false;
    }

    if (seoStatusFilter === "draft" && page.status !== "DRAFT") {
      return false;
    }

    if (seoStatusFilter === "paused" && page.status !== "PAUSED") {
      return false;
    }

    if (seoTypeFilter !== "all" && page.pageType !== seoTypeFilter) {
      return false;
    }

    if (seoToolFilter === "with-tools" && page.tools.length === 0) {
      return false;
    }

    if (seoToolFilter === "without-tools" && page.tools.length > 0) {
      return false;
    }

    return true;
  });
  const workingSeoPageOrderRows: SeoPageOrderRow[] = workingSeoPages.map((page) => ({
    id: page.id,
    h1: page.h1,
    slug: page.slug,
    pageType: page.pageType,
    statusLabel: getSeoStatusLabel(page.status),
    statusClassName: getSeoStatusClass(page.status),
    displayPriority: page.displayPriority,
    offersCount: page.offers.length,
    toolsCount: page.tools.length,
    faqCount: page.faqItems.length,
    clicks:
      page.pageType === "CATEGORY"
        ? (seoClicksBySlug.get(page.slug) ?? 0)
        : null,
    updatedAtLabel: formatDate(page.updatedAt),
  }));
  const archivedSeoPages = seoPages.filter((page) => page.status === "ARCHIVED");
  const getSeoFilterHref = ({
    status = seoStatusFilter,
    type = seoTypeFilter,
    tool = seoToolFilter,
  }: {
    status?: SeoStatusFilter;
    type?: SeoTypeFilter;
    tool?: SeoToolFilter;
  }) => {
    const params = new URLSearchParams({ section: "seo" });

    if (status !== "all") params.set("seoStatus", status);
    if (type !== "all") params.set("seoType", type);
    if (tool !== "all") params.set("seoTool", tool);

    return `/admin?${params.toString()}`;
  };

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
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                  <h1 className="text-3xl font-bold text-slate-950">
                    Аналитика и клики
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Статистика ниже считается за выбранный период.
                  </p>
                </div>
                <form
                  action="/admin"
                  method="get"
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <input type="hidden" name="section" value="analytics" />
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">С</span>
                    <input
                      type="date"
                      name="from"
                      defaultValue={analyticsPeriod.from}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">По</span>
                    <input
                      type="date"
                      name="to"
                      defaultValue={analyticsPeriod.to}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3"
                    />
                  </label>
                  <button
                    type="submit"
                    className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
                  >
                    Показать
                  </button>
                  <Link
                    href={`/admin/analytics/export?from=${analyticsPeriod.from}&to=${analyticsPeriod.to}&format=csv`}
                    className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                  >
                    CSV
                  </Link>
                  <Link
                    href={`/admin/analytics/export?from=${analyticsPeriod.from}&to=${analyticsPeriod.to}&format=xlsx`}
                    className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                  >
                    XLSX
                  </Link>
                </form>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="Активные офферы" value={activeOffersCount} />
                <StatCard label="На паузе" value={pausedOffersCount} />
                <StatCard label="В архиве" value={archivedOffersCount} />
                <StatCard label="Лиды за период" value={leadsCount} />
                <StatCard label="Клики за период" value={clicksCount} />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Период: {analyticsPeriod.from} — {analyticsPeriod.to}. На экране
                показаны последние {Math.min(latestClicks.length, ANALYTICS_TABLE_LIMIT)} из{" "}
                {clicksCount} кликов за период.
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-bold text-slate-950">
                  Сводка по офферам за период
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Оффер</th>
                      <th className="px-5 py-3 font-semibold">Slug</th>
                      <th className="px-5 py-3 font-semibold">Статус</th>
                      <th className="px-5 py-3 font-semibold">Клики</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {periodOfferStats.length > 0 ? (
                      periodOfferStats.map((item) => (
                        <tr key={item.offerId}>
                          <td className="px-5 py-4 font-semibold text-slate-950">
                            {item.offer?.brandName ?? "Оффер удален"}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {item.offer?.slug ?? item.offerId}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {item.offer ? (
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-semibold ${getOfferStatusClass(item.offer.status)}`}
                              >
                                {getOfferStatusLabel(item.offer.status)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-950">
                            {item.clicks}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-5 py-8 text-center text-slate-500"
                          colSpan={4}
                        >
                          За выбранный период кликов нет
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-bold text-slate-950">
                  Клики за период
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
              <OfferOrderTable
                key={`${offerFilter}:${workingOfferRows.map((offer) => offer.id).join(",")}`}
                canManageOffers={canManageOffers}
                offers={workingOfferRows}
              />
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

        {activeSection === "create-seo" ? (
          <div className="grid gap-6">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-5">
                <h1 className="text-2xl font-bold text-slate-950">
                  Создать SEO
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Сначала выбери тип SEO-актива, потом заполни редактор под его
                  рабочий сценарий.
                </p>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-3">
                {[
                  {
                    type: "CATEGORY",
                    title: "Создать подборку",
                    text:
                      "Коммерческая страница: офферы, порядок, критерии, CTA, FAQ, risk notice и опциональный инструмент.",
                  },
                  {
                    type: "ARTICLE",
                    title: "Создать статью",
                    text:
                      "Информационный материал: lead, структура текста, FAQ и связи с другими страницами.",
                  },
                  {
                    type: "SERVICE",
                    title: "Создать сервисную страницу",
                    text:
                      "Страница вокруг интерактива: активный инструмент, польза, CTA, FAQ и предупреждения.",
                  },
                ].map((item) => (
                  <Link
                    key={item.type}
                    href={`/admin?section=create-seo&type=${item.type}`}
                    className={`rounded-lg border p-5 transition hover:border-emerald-500 hover:bg-emerald-50 ${
                      createSeoType === item.type
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <h2 className="text-lg font-bold text-slate-950">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.text}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {canManageSeo && createSeoType ? (
              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-bold text-slate-950">
                    {getSeoTypeLabel(createSeoType)}: новый SEO-актив
                  </h2>
                </div>
                <div className="p-5">
                  <SeoPageEditor
                    initialPageType={createSeoType}
                    offers={offers}
                    seoTools={seoTools}
                  />
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {activeSection === "seo" ? (
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-end">
              <div>
                <h1 className="text-2xl font-bold text-slate-950">
                  Управление SEO
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Рабочая зона для опубликованных страниц, черновиков и страниц
                  на паузе. Архив сюда не попадает.
                </p>
              </div>
              <Link
                href="/admin?section=create-seo"
                className="w-fit rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Создать SEO
              </Link>
            </div>
            <div className="grid gap-3 border-b border-slate-100 p-5">
              <div className="flex flex-wrap gap-2">
                <FilterLink
                  href={getSeoFilterHref({ status: "all" })}
                  active={seoStatusFilter === "all"}
                  label="Все в работе"
                />
                <FilterLink
                  href={getSeoFilterHref({ status: "published" })}
                  active={seoStatusFilter === "published"}
                  label="Опубликовано"
                />
                <FilterLink
                  href={getSeoFilterHref({ status: "draft" })}
                  active={seoStatusFilter === "draft"}
                  label="Черновики"
                />
                <FilterLink
                  href={getSeoFilterHref({ status: "paused" })}
                  active={seoStatusFilter === "paused"}
                  label="На паузе"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "Все типы"],
                  ["CATEGORY", "Подборки"],
                  ["ARTICLE", "Статьи"],
                  ["SERVICE", "Сервисы"],
                ].map(([value, label]) => (
                  <FilterLink
                    key={value}
                    href={getSeoFilterHref({
                      type: value as SeoTypeFilter,
                      tool: "all",
                    })}
                    active={seoTypeFilter === value}
                    label={label}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "Все"],
                  ["with-tools", "С инструментами"],
                  ["without-tools", "Без инструментов"],
                ].map(([value, label]) => (
                  <FilterLink
                    key={value}
                    href={getSeoFilterHref({ tool: value as SeoToolFilter })}
                    active={seoToolFilter === value}
                    label={label}
                  />
                ))}
                <Link
                  href="/admin?section=seo-archive"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Архив SEO
                </Link>
              </div>
            </div>
            {seoTypeFilter !== "all" ? (
              <SeoPageOrderTable
                key={`${seoTypeFilter}-${seoStatusFilter}-${seoToolFilter}`}
                canManageSeo={canManageSeo}
                pages={workingSeoPageOrderRows}
                pageType={seoTypeFilter}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Страница</th>
                      <th className="px-5 py-3 font-semibold">Тип</th>
                      <th className="px-5 py-3 font-semibold">Статус</th>
                      <th className="px-5 py-3 font-semibold">Офферы</th>
                      <th className="px-5 py-3 font-semibold">Инструменты</th>
                      <th className="px-5 py-3 font-semibold">FAQ</th>
                      <th className="px-5 py-3 font-semibold">Клики</th>
                      <th className="px-5 py-3 font-semibold">Обновлено</th>
                      <th className="px-5 py-3 font-semibold">Правка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workingSeoPages.map((page) => (
                      <tr key={page.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-950">{page.h1}</p>
                          <p className="mt-1 text-slate-500">/{page.slug}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {getSeoTypeLabel(page.pageType)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${getSeoStatusClass(page.status)}`}
                          >
                            {getSeoStatusLabel(page.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {page.offers.length}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {page.tools.length}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {page.faqItems.length}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {page.pageType === "CATEGORY"
                            ? (seoClicksBySlug.get(page.slug) ?? 0)
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {formatDate(page.updatedAt)}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/seo/${page.id}`}
                            className="font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            редактировать
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {workingSeoPages.length === 0 ? (
                      <tr>
                        <td className="px-5 py-8 text-center text-slate-500" colSpan={9}>
                          По выбранным фильтрам страниц нет
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "seo-archive" ? (
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Архив SEO</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Неактуальные SEO-страницы остаются в базе и могут быть
                  возвращены через смену статуса в редакторе.
                </p>
              </div>
              <Link
                href="/admin?section=seo"
                className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                К SEO в работе
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Страница</th>
                    <th className="px-5 py-3 font-semibold">Тип</th>
                    <th className="px-5 py-3 font-semibold">Статус</th>
                    <th className="px-5 py-3 font-semibold">Клики</th>
                    <th className="px-5 py-3 font-semibold">Обновлено</th>
                    <th className="px-5 py-3 font-semibold">Правка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {archivedSeoPages.map((page) => (
                    <tr key={page.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{page.h1}</p>
                        <p className="mt-1 text-slate-500">/{page.slug}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {getSeoTypeLabel(page.pageType)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${getSeoStatusClass(page.status)}`}
                        >
                          {getSeoStatusLabel(page.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {page.pageType === "CATEGORY"
                          ? (seoClicksBySlug.get(page.slug) ?? 0)
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(page.updatedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/seo/${page.id}`}
                          className="font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          открыть
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {archivedSeoPages.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                        В архиве SEO-страниц пока нет
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeSection === "tools" ? (
          <div className="grid gap-6">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-5">
                <h1 className="text-2xl font-bold text-slate-950">
                  Интерактивные инструменты
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Переиспользуемые сервисы для SEO-страниц: калькуляторы,
                  чек-листы и будущие интерактивные блоки.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Инструмент</th>
                      <th className="px-5 py-3 font-semibold">Тип</th>
                      <th className="px-5 py-3 font-semibold">Статус</th>
                      <th className="px-5 py-3 font-semibold">Где используется</th>
                      <th className="px-5 py-3 font-semibold">Правка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seoTools.map((tool) => (
                      <tr key={tool.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-950">
                            {tool.name}
                          </p>
                          <p className="mt-1 text-slate-500">/{tool.slug}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {getSeoToolTypeLabel(tool.type)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${getSeoStatusClass(
                              tool.status === "ACTIVE" ? "PUBLISHED" : tool.status,
                            )}`}
                          >
                            {getSeoToolStatusLabel(tool.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {tool.pageTools.length > 0
                            ? tool.pageTools
                                .slice(0, 3)
                                .map((usage) => `/${usage.page.slug}`)
                                .join(", ")
                            : "Не используется"}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/tools/${tool.id}`}
                            className="font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            редактировать
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {canManageSeo ? (
              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-bold text-slate-950">
                    Создать инструмент
                  </h2>
                </div>
                <div className="p-5">
                  <SeoToolEditor />
                </div>
              </section>
            ) : null}
          </div>
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
