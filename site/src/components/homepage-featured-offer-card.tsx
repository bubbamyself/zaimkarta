import type { HomepageFeaturedOffer } from "@/lib/homepage-featured-offer";

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

export function HomepageFeaturedOfferCard({
  offer,
}: {
  offer: HomepageFeaturedOffer;
}) {
  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Omsk",
  }).format(new Date());

  return (
    <article className="flex flex-col rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Реклама
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Рекламодатель: {offer.legalName}
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Предложение дня · {dateLabel}
        </p>
      </div>

      <div className="mt-4 flex min-w-0 items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-emerald-50 text-2xl font-black text-emerald-700">
          {offer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.logoUrl}
              alt={`Логотип ${offer.brandName}`}
              className="h-full w-full bg-white object-contain p-1.5"
            />
          ) : (
            offer.logoText
          )}
        </div>
        <p className="min-w-0 break-words text-2xl font-bold leading-tight text-slate-950">
          {offer.brandName}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Сумма</dt>
          <dd className="mt-1 font-semibold text-slate-950">
            {formatMoney(offer.minAmount)}–{formatMoney(offer.maxAmount)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Рассмотрение</dt>
          <dd className="mt-1 break-words font-semibold text-slate-950">
            {offer.decisionTime}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Оценка одобрения</dt>
          <dd className="mt-1 break-words font-semibold text-slate-950">
            {offer.approvalLabel}
          </dd>
        </div>
        {offer.psk ? (
          <div>
            <dt className="text-slate-500">ПСК</dt>
            <dd className="mt-1 font-semibold text-slate-950">{offer.psk}</dd>
          </div>
        ) : offer.rate ? (
          <div>
            <dt className="text-slate-500">Ставка в день</dt>
            <dd className="mt-1 font-semibold text-slate-950">{offer.rate}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-4 break-words text-sm leading-6 text-slate-600">
        Получение: {offer.payoutMethods.join(", ")}
      </p>

      <div className="mt-auto grid gap-2 pt-5">
        <a
          href={`/go/${offer.slug}?page_type=home&category=home&position=1`}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-700 px-4 text-center font-semibold text-white transition hover:bg-emerald-800"
        >
          Получить предложение
        </a>
        <p className="text-xs leading-5 text-slate-500">
          Оценивайте свои финансовые возможности и риски.
        </p>
        <p className="text-xs leading-5 text-slate-400">Erid: {offer.erid}</p>
      </div>
    </article>
  );
}
