import type { OfferCardData } from "@/lib/offers";
import Link from "next/link";

type OfferCardProps = {
  offer: OfferCardData;
  pageType?: string;
  categorySlug?: string;
  position?: number;
  matchReasons?: string[];
};

export function OfferCard({
  offer,
  pageType = "home",
  categorySlug,
  position,
  matchReasons = [],
}: OfferCardProps) {
  const approvalClass =
    offer.approvalTone === "high" ? "text-emerald-700" : "text-amber-600";
  const badge = offer.pageBadge ?? offer.badge;
  const ctaText = offer.pageCtaText ?? "Оформить заем";
  const clickParams = new URLSearchParams({
    page_type: pageType,
  });

  if (categorySlug) {
    clickParams.set("category", categorySlug);
  }

  if (position) {
    clickParams.set("position", String(position));
  }

  return (
    <article
      className={`flex h-full flex-col rounded-lg border bg-white p-5 shadow-sm ${
        offer.pageHighlight ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200"
      }`}
    >
      <div className="flex min-h-16 items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-emerald-50 text-2xl font-black text-emerald-700">
          {offer.logoUrl ? (
            <img
              src={offer.logoUrl}
              alt={`Логотип ${offer.name}`}
              className="h-full w-full rounded-lg bg-white object-contain p-1.5"
            />
          ) : (
            offer.logoText
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-950">{offer.name}</h3>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {badge}
            </span>
            {offer.pageHighlight ? (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                выделено
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Рейтинг {offer.rating} · отзывов {offer.reviewsCount}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Сумма</dt>
          <dd className="mt-1 font-semibold text-slate-900">{offer.amount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Срок</dt>
          <dd className="mt-1 font-semibold text-slate-900">{offer.term}</dd>
        </div>
        <div>
          <dt className="text-slate-500">ПСК</dt>
          <dd className="mt-1 font-semibold text-slate-900">{offer.psk}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Ставка в день</dt>
          <dd className="mt-1 font-semibold text-slate-900">{offer.rate}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Рассмотрение</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {offer.decisionTime}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Одобрение</dt>
          <dd className={`mt-1 font-semibold ${approvalClass}`}>
            {offer.approval}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-slate-600">
        Получение: {offer.payoutMethods.join(", ")}
      </p>

      {offer.pageNote ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {offer.pageNote}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {matchReasons.map((reason) => (
          <span
            key={reason}
            className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
          >
            {reason}
          </span>
        ))}
        {offer.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto grid gap-3 pt-6">
        <a
          href={`/go/${offer.slug}?${clickParams.toString()}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800"
        >
          {ctaText}
        </a>
        <Link
          href={`/offers/${offer.slug}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-800 transition hover:border-slate-500"
        >
          Подробнее
        </Link>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Решение о выдаче принимает МФО. Перед оформлением проверьте полную
          стоимость займа и условия договора.
        </p>
      </div>
    </article>
  );
}
