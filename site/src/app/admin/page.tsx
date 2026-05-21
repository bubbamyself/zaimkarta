import type { Metadata } from "next";
import type { AffiliateOffer, Offer } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createAdminUser,
  deleteAdminUser,
  updateAdminPassword,
  updateAdminUser,
} from "./admin-users-actions";
import { logoutAdmin } from "./logout-action";
import { createOffer, updateOffer } from "./offer-actions";
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

type OfferWithAffiliate = Offer & {
  affiliateOffers: AffiliateOffer[];
};

function toInputDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function toFieldValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && "toString" in value) {
    return value.toString();
  }

  return String(value);
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={toFieldValue(defaultValue)}
        required={required}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      />
    </label>
  );
}

function FileField({
  label,
  name,
  currentUrl,
  hint,
}: {
  label: string;
  name: string;
  currentUrl?: string | null;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type="hidden" name="currentLogoUrl" value={currentUrl ?? ""} />
      <input
        name={name}
        type="file"
        accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      {hint ? <span className="text-xs leading-5 text-slate-500">{hint}</span> : null}
      {currentUrl ? (
        <span className="flex items-center gap-3 text-xs text-slate-500">
          <img
            src={currentUrl}
            alt=""
            className="h-10 w-10 rounded-md border border-slate-200 bg-white object-contain p-1"
          />
          Загружен: {currentUrl}
        </span>
      ) : null}
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string[] | string | null;
  rows?: number;
}) {
  const value = Array.isArray(defaultValue)
    ? defaultValue.join("\n")
    : defaultValue ?? "";

  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={value}
        rows={rows}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function OfferEditor({ offer }: { offer?: OfferWithAffiliate }) {
  const affiliateOffer = offer?.affiliateOffers.at(0);
  const isEdit = Boolean(offer);

  return (
    <form
      action={isEdit ? updateOffer : createOffer}
      className="grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      {offer ? <input type="hidden" name="offerId" value={offer.id} /> : null}
      {affiliateOffer ? (
        <input type="hidden" name="affiliateOfferId" value={affiliateOffer.id} />
      ) : null}

      <div>
        <h3 className="text-lg font-bold text-slate-950">
          {isEdit ? "Редактирование оффера" : "Новый оффер"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Это внутренняя форма для оффера, который ты сам выбрал в CPA-сети.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Название МФО" name="brandName" defaultValue={offer?.brandName} required />
        <Field label="Slug" name="slug" defaultValue={offer?.slug} required />
        <SelectField
          label="Статус"
          name="status"
          defaultValue={offer?.status === "DRAFT" ? "PAUSED" : offer?.status ?? "PAUSED"}
          options={[
            { value: "ACTIVE", label: "Активен" },
            { value: "PAUSED", label: "На паузе" },
            { value: "ARCHIVED", label: "Архив" },
          ]}
        />
        <Field label="Юр. название" name="legalName" defaultValue={offer?.legalName} />
        <Field label="Официальный сайт" name="officialSite" defaultValue={offer?.officialSite} />
        <Field label="Лого-текст" name="logoText" defaultValue={offer?.logoText} />
        <FileField
          label="Логотип МФО"
          name="logoFile"
          currentUrl={offer?.logoUrl}
          hint="SVG, PNG или JPEG до 256x256 px. Лучше белый или прозрачный фон."
        />
        <Field label="Бейдж" name="badge" defaultValue={offer?.badge} />
        <Field label="Приоритет показа" name="displayPriority" type="number" defaultValue={offer?.displayPriority ?? 100} />
        <Field label="Дата проверки условий" name="conditionsCheckedAt" type="date" defaultValue={toInputDate(offer?.conditionsCheckedAt ?? null)} />
      </div>

      <TextArea
        label="Короткое описание"
        name="shortDescription"
        defaultValue={offer?.shortDescription}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Мин. сумма" name="minAmount" type="number" defaultValue={offer?.minAmount} />
        <Field label="Макс. сумма" name="maxAmount" type="number" defaultValue={offer?.maxAmount} />
        <Field label="Мин. срок, дней" name="minTermDays" type="number" defaultValue={offer?.minTermDays} />
        <Field label="Макс. срок, дней" name="maxTermDays" type="number" defaultValue={offer?.maxTermDays} />
        <Field label="Ставка от, %/день" name="dailyRateFrom" defaultValue={offer?.dailyRateFrom} />
        <Field label="Ставка до, %/день" name="dailyRateTo" defaultValue={offer?.dailyRateTo} />
        <Field label="ПСК от, %" name="pskFrom" defaultValue={offer?.pskFrom} />
        <Field label="ПСК до, %" name="pskTo" defaultValue={offer?.pskTo} />
        <Field label="Рейтинг" name="rating" defaultValue={offer?.rating} />
        <Field label="Отзывы" name="reviewsCount" type="number" defaultValue={offer?.reviewsCount ?? 0} />
        <Field label="Одобрение" name="approvalLabel" defaultValue={offer?.approvalLabel} />
        <SelectField
          label="Тон одобрения"
          name="approvalTone"
          defaultValue={offer?.approvalTone ?? "MEDIUM"}
          options={[
            { value: "LOW", label: "Низкий" },
            { value: "MEDIUM", label: "Средний" },
            { value: "HIGH", label: "Высокий" },
          ]}
        />
        <Field label="Время решения" name="decisionTime" defaultValue={offer?.decisionTime} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextArea label="Способы получения" name="payoutMethods" defaultValue={offer?.payoutMethods} />
        <TextArea label="Способы погашения" name="repaymentMethods" defaultValue={offer?.repaymentMethods} />
        <TextArea label="Требования" name="requirements" defaultValue={offer?.requirements} />
        <TextArea label="Документы" name="documents" defaultValue={offer?.documents} />
        <TextArea label="Плюсы/теги" name="advantages" defaultValue={offer?.advantages} />
        <TextArea label="Предупреждения" name="warnings" defaultValue={offer?.warnings} />
      </div>

      <TextArea
        label="Юридическая/рекламная сноска"
        name="legalDisclosure"
        defaultValue={offer?.legalDisclosure}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="font-bold text-slate-950">Партнерская ссылка</h4>
        <p className="mt-1 text-sm text-slate-500">
          Сюда вставляется ссылка, которую ты сам получил в CPA-сети.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <SelectField
            label="CPA-сеть"
            name="network"
            defaultValue={affiliateOffer?.network ?? "OTHER"}
            options={[
              { value: "LEADS_SU", label: "Leads.su" },
              { value: "LEADGID", label: "Leadgid" },
              { value: "DIRECT", label: "Прямая" },
              { value: "OTHER", label: "Другая" },
            ]}
          />
          <Field label="Offer ID в сети" name="networkOfferId" defaultValue={affiliateOffer?.networkOfferId} />
          <SelectField
            label="Ссылка активна"
            name="affiliateIsActive"
            defaultValue={affiliateOffer?.isActive === false ? "off" : "on"}
            options={[
              { value: "on", label: "Да" },
              { value: "off", label: "Нет" },
            ]}
          />
          <Field label="Партнерская ссылка" name="trackingBaseUrl" defaultValue={affiliateOffer?.trackingBaseUrl} />
          <Field label="Целевое действие" name="targetAction" defaultValue={affiliateOffer?.targetAction} />
          <Field label="Выплата" name="payoutAmount" defaultValue={affiliateOffer?.payoutAmount} />
          <Field label="Валюта" name="currency" defaultValue={affiliateOffer?.currency ?? "RUB"} />
          <Field label="Холд, дней" name="holdDays" type="number" defaultValue={affiliateOffer?.holdDays} />
          <Field label="Период сверки" name="reconciliationPeriod" defaultValue={affiliateOffer?.reconciliationPeriod} />
          <Field label="Дневной лимит" name="dailyCap" type="number" defaultValue={affiliateOffer?.dailyCap} />
          <Field label="Месячный лимит" name="monthlyCap" type="number" defaultValue={affiliateOffer?.monthlyCap} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextArea label="GEO включено" name="geoIncluded" defaultValue={affiliateOffer?.geoIncluded} />
          <TextArea label="GEO исключено" name="geoExcluded" defaultValue={affiliateOffer?.geoExcluded} />
          <TextArea label="Разрешенный трафик" name="allowedTrafficTypes" defaultValue={affiliateOffer?.allowedTrafficTypes} />
          <TextArea label="Запрещенный трафик" name="forbiddenTrafficTypes" defaultValue={affiliateOffer?.forbiddenTrafficTypes} />
        </div>
      </div>

      <button className="w-fit rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
        {isEdit ? "Сохранить оффер" : "Создать оффер"}
      </button>
    </form>
  );
}

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const canManageAdmins = session.role === "BOSS";
  const canManageOffers =
    session.role === "BOSS" || session.permissions.includes("offers_write");
  const canViewAnalytics =
    session.role === "BOSS" || session.permissions.includes("analytics");

  const [offers, clicksCount, leadsCount, latestClicks, adminUsers] = await Promise.all([
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
  ]);

  const activeOffersCount = offers.filter((offer) => offer.status === "ACTIVE").length;
  const pausedOffersCount = offers.filter(
    (offer) => offer.status === "PAUSED" || offer.status === "DRAFT",
  ).length;
  const archivedOffersCount = offers.filter(
    (offer) => offer.status === "ARCHIVED",
  ).length;
  const workingOffers = offers.filter((offer) => offer.status !== "ARCHIVED");
  const archivedOffers = offers.filter((offer) => offer.status === "ARCHIVED");

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
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="Активные офферы" value={activeOffersCount} />
                <StatCard label="На паузе" value={pausedOffersCount} />
                <StatCard label="В архиве" value={archivedOffersCount} />
                <StatCard label="Лиды" value={leadsCount} />
                <StatCard label="Клики" value={clicksCount} />
              </div>
            </section>

            {canManageOffers ? (
              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-bold text-slate-950">
                    Добавить оффер
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Для оффера, который ты сам выбрал в CPA-сети.
                  </p>
                </div>
                <div className="p-5">
                  <OfferEditor />
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-bold text-slate-950">
                  Офферы в работе
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Активные показываются на витрине и имеют публичную страницу.
                  Офферы на паузе остаются в работе, но не показываются трафику.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Бренд</th>
                      <th className="px-5 py-3 font-semibold">Статус</th>
                      <th className="px-5 py-3 font-semibold">Приоритет</th>
                      <th className="px-5 py-3 font-semibold">Сумма</th>
                      <th className="px-5 py-3 font-semibold">Проверено</th>
                      <th className="px-5 py-3 font-semibold">CPA-ссылка</th>
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
                          <td className="max-w-xs truncate px-5 py-4 text-slate-700">
                            {affiliateOffer?.trackingBaseUrl ?? "не подключена"}
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
                              <details>
                                <summary className="cursor-pointer font-semibold text-emerald-700 hover:text-emerald-800">
                                  редактировать
                                </summary>
                                <div className="mt-4 min-w-[900px]">
                                  <OfferEditor offer={offer} />
                                </div>
                              </details>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {archivedOffers.length > 0 ? (
              <section className="rounded-lg border border-slate-200 bg-white">
                <details>
                  <summary className="cursor-pointer border-b border-slate-200 p-5 text-xl font-bold text-slate-950">
                    Архив офферов ({archivedOffers.length})
                  </summary>
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
                                  <details>
                                    <summary className="cursor-pointer font-semibold text-emerald-700 hover:text-emerald-800">
                                      редактировать
                                    </summary>
                                    <div className="mt-4 min-w-[900px]">
                                      <OfferEditor offer={offer} />
                                    </div>
                                  </details>
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            ) : null}

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
