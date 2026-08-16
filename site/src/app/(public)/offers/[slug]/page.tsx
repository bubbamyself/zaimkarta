import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
import { OfferCtaLink } from "@/components/offer-cta-link";
import { PublicPageShareButton } from "@/components/public-page-share-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getOfferApplicationAvailability } from "@/lib/offer-publication";
import { getActiveOffersForRegion, getOfferDetails } from "@/lib/offers";
import { getSelectedRegionCode } from "@/lib/region-cookie";
import { getBreadcrumbListJsonLd } from "@/lib/seo-breadcrumbs";
import { getAbsoluteUrl } from "@/lib/site-url";
import { buildPublicShareImageUrl } from "@/lib/public-page-share";
import { serializeJsonLd } from "@/lib/structured-data";

type OfferPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: OfferPageProps): Promise<Metadata> {
  const { slug } = await params;
  const offer = await getOfferDetails(slug);

  if (!offer) {
    return {};
  }

  const canonical = getAbsoluteUrl(`/offers/${slug}`);
  const title = `${offer.name}: условия займа, сумма, срок и ставка — ZaimKarta`;
  const description = `Подробные условия ${offer.name}: ${offer.amount}, срок ${offer.term}, ставка ${offer.rate}, рассмотрение ${offer.decisionTime}.`;
  const imageUrl = buildPublicShareImageUrl({
    origin: getAbsoluteUrl("/"),
    pageType: "offer",
    pageSlug: slug,
  });

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${offer.name} — условия предложения на ZaimKarta`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-2 text-lg font-bold text-slate-950">{value}</dd>
    </div>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <ul className="mt-4 grid gap-2 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatMoney(value: number | null) {
  return value === null
    ? "не указано"
    : `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function formatCheckedDate(value: string | null) {
  if (!value) {
    return "не указана";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { slug } = await params;
  const selectedRegionCode = await getSelectedRegionCode();
  const offer = await getOfferDetails(slug);

  if (!offer) {
    notFound();
  }

  const availability = getOfferApplicationAvailability({
    status: offer.status,
    restrictedRegionCodes: offer.restrictedRegionCodes,
    selectedRegionCode,
    hasActiveAffiliateOffer: offer.hasActiveAffiliateOffer,
  });
  const alternatives = availability.isAvailable || !selectedRegionCode
    ? []
    : (
        await getActiveOffersForRegion(selectedRegionCode, {
          requireActiveAffiliateOffer: true,
        })
      )
        .filter((alternative) => alternative.slug !== offer.slug)
        .slice(0, 3);
  const unavailableTitle =
    availability.reason === "REGION_REQUIRED"
      ? "Сначала укажите регион регистрации"
      : availability.reason === "REGION_RESTRICTED"
      ? "Недоступно в выбранном регионе"
      : "Предложение временно недоступно";

  const approvalClass =
    offer.approvalTone === "high" ? "text-emerald-700" : "text-amber-600";
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Главная", href: "/" },
    { label: "Предложения", href: "/#offers" },
    { label: offer.name },
  ];
  const breadcrumbJsonLd = getBreadcrumbListJsonLd(
    breadcrumbs,
    `/offers/${slug}`,
  );

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <SiteHeader
        requireRegionSelection
        promptForRegionOnFirstVisit={false}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd),
        }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_360px]">
          <div>
            <Breadcrumbs items={breadcrumbs} />
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-emerald-50 text-3xl font-black text-emerald-700">
                {offer.logoUrl ? (
                  <img
                    src={offer.logoUrl}
                    alt={`Логотип ${offer.name}`}
                    className="h-full w-full rounded-lg bg-white object-contain p-2"
                  />
                ) : (
                  offer.logoText
                )}
              </div>
              <div>
                <p className="mb-2 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {offer.badge}
                </p>
                <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
                  {offer.name}
                </h1>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              {offer.shortDescription ??
                "Подробные условия займа, требования и способы получения. Перед оформлением проверьте полную стоимость займа и условия договора."}
            </p>
          </div>

          <aside
            className={`rounded-lg border p-5 ${
              availability.isAvailable
                ? "border-slate-200 bg-slate-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            {availability.isAvailable ? (
              <>
                <p className="text-sm font-semibold uppercase text-emerald-700">
                  Переход к заявке
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Кнопка ниже откроет страницу заявки на сайте партнера.
                </p>
                <a
                  href={`/go/${offer.slug}?page_type=offer&position=1&variant=standard`}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-700 px-5 text-base font-semibold text-white transition hover:bg-emerald-800"
                >
                  Оформить заем
                </a>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase text-amber-800">
                  {unavailableTitle}
                </p>
                <p className="mt-3 text-sm leading-6 text-amber-950">
                  {availability.reason === "REGION_RESTRICTED"
                    ? "Это предложение не работает в выбранном регионе. Ниже покажем доступные альтернативы без бесполезного перехода на сайт кредитора."
                    : availability.reason === "REGION_REQUIRED"
                      ? "Выберите регион регистрации — после этого мы сразу проверим доступность предложения."
                      : "Сейчас перейти к оформлению нельзя. Мы сохраняем условия для сравнения и покажем доступные альтернативы ниже."}
                </p>
                {availability.reason === "REGION_REQUIRED" ? (
                  <OfferCtaLink
                    href={`/go/${offer.slug}?page_type=offer&position=1&variant=standard`}
                    regionSelected={false}
                    regionRequiredText="Проверить актуальность"
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-700 px-5 text-base font-semibold text-white transition hover:bg-emerald-800"
                  >
                    Оформить заем
                  </OfferCtaLink>
                ) : null}
              </>
            )}
            {availability.isAvailable ? (
              <PublicPageShareButton
                pageType="offer"
                pageSlug={offer.slug}
                pathname={`/offers/${offer.slug}`}
                title={`${offer.name} — условия займа`}
                text={`Посмотрите условия ${offer.name} на ZaimKarta: ${offer.amount}, срок ${offer.term}, ставка ${offer.rate}.`}
                label="Поделиться предложением"
                copiedLabel="Ссылка на предложение скопирована"
                className="mt-3"
              />
            ) : null}
          </aside>

          {alternatives.length > 0 ? (
            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 lg:col-span-2">
              <h2 className="text-xl font-bold text-slate-950">
                Доступные альтернативы
              </h2>
              <p className="mt-2 leading-7 text-slate-700">
                Эти предложения сейчас доступны в выбранном регионе.
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {alternatives.map((alternative) => (
                  <li key={alternative.slug}>
                    <Link
                      href={`/offers/${alternative.slug}`}
                      className="block h-full rounded-lg border border-emerald-200 bg-white p-4 transition hover:border-emerald-400"
                    >
                      <span className="font-bold text-slate-950">
                        {alternative.name}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        {alternative.amount} · {alternative.term} · ставка {alternative.rate}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/#offers"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Перейти ко всем предложениям
              </Link>
            </section>
          ) : null}

          {!availability.isAvailable && alternatives.length === 0 && selectedRegionCode ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-xl font-bold text-slate-950">
                Посмотреть другие варианты
              </h2>
              <p className="mt-2 leading-7 text-slate-700">
                На главной странице собраны остальные доступные разделы и
                предложения.
              </p>
              <Link
                href="/#offers"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Перейти к основным предложениям
              </Link>
            </section>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-slate-950">
              Стандартные условия займа
            </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Сумма" value={offer.amount} />
            <DetailItem label="Срок" value={offer.term} />
            <DetailItem label="Ставка в день" value={offer.rate} />
            <DetailItem label="ПСК" value={offer.psk} />
            <DetailItem label="Рассмотрение" value={offer.decisionTime} />
            <DetailItem
              label="Вероятность одобрения"
              value={offer.approval}
            />
          </dl>
          </div>

          {offer.promoEnabled ? (
            <section className="rounded-lg border border-violet-200 bg-violet-50/60 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
                Отдельные акционные условия
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                {offer.promoTitle ?? "Акция 0%"}
              </h2>
              {offer.promoReady ? (
                <>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-white p-3">
                      <dt className="text-sm text-slate-500">Сумма по акции</dt>
                      <dd className="mt-1 font-bold text-slate-950">
                        {formatMoney(offer.promoMinAmount)}–{formatMoney(offer.promoMaxAmount)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-white p-3">
                      <dt className="text-sm text-slate-500">Срок ставки 0%</dt>
                      <dd className="mt-1 font-bold text-slate-950">
                        {offer.promoZeroTermDays} дней
                      </dd>
                    </div>
                    <div className="rounded-md bg-white p-3">
                      <dt className="text-sm text-slate-500">Ставка по акции</dt>
                      <dd className="mt-1 font-bold text-slate-950">
                        {offer.promoDailyRate?.toLocaleString("ru-RU")}% в день
                      </dd>
                    </div>
                    <div className="rounded-md bg-white p-3">
                      <dt className="text-sm text-slate-500">ПСК по акции</dt>
                      <dd className="mt-1 font-bold text-slate-950">
                        {offer.promoPsk?.toLocaleString("ru-RU")}%
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-700">
                    <p>
                      <strong>Для кого:</strong>{" "}
                      {offer.promoNewClientsOnly
                        ? "только для новых клиентов"
                        : "условия для клиентов указаны кредитором в источнике"}
                    </p>
                    <p><strong>Как сохранить 0%:</strong> {offer.promoConditions}</p>
                    {offer.promoLateConsequences ? (
                      <p><strong>При просрочке или продлении:</strong> {offer.promoLateConsequences}</p>
                    ) : null}
                    {offer.promoPaidServices ? (
                      <p><strong>Возможные платные услуги:</strong> {offer.promoPaidServices}</p>
                    ) : null}
                    <p>
                      <strong>Проверено:</strong> {formatCheckedDate(offer.promoCheckedAt)}
                    </p>
                    {offer.promoSourceUrl ? (
                      <p>
                        <a
                          href={offer.promoSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-violet-800 underline underline-offset-2"
                        >
                          Официальный источник условий
                        </a>
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="mt-4 rounded-md bg-white p-4 text-sm leading-6 text-amber-900">
                  Акция включена, но её данные требуют повторной проверки. Мы не
                  подменяем их стандартными условиями.
                </p>
              )}
            </section>
          ) : null}

          <TextList title="Преимущества" items={offer.advantages} />
          <TextList title="Требования к заемщику" items={offer.requirements} />
          <TextList title="Документы" items={offer.documents} />
          <TextList title="Способы погашения" items={offer.repaymentMethods} />

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold text-slate-950">
              Оценивайте свои финансовые возможности и риски
            </h2>
            <p className="mt-4 leading-7 text-slate-700">
              Решение о выдаче займа принимает кредитор. Просрочка может привести к
              начислению процентов, штрафов и ухудшению кредитной истории.
              Перед оформлением внимательно изучите договор и полную стоимость
              займа.
            </p>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Кратко</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Получение</dt>
                <dd className="text-right font-semibold text-slate-900">
                  {offer.payoutMethods.join(", ")}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Одобрение</dt>
                <dd className={`text-right font-semibold ${approvalClass}`}>
                  {offer.approval}
                </dd>
              </div>
              {offer.legalName ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Компания</dt>
                  <dd className="text-right font-semibold text-slate-900">
                    {offer.legalName}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {offer.warnings.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-lg font-bold text-amber-950">Важно</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-950">
                {offer.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </section>

      <SiteFooter />
    </main>
  );
}
