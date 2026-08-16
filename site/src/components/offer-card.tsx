import type { OfferCardData } from "@/lib/offers";
import Link from "next/link";
import { OfferCtaLink } from "@/components/offer-cta-link";
import { getOfferClickVariant } from "@/lib/offer-display-variant";

type OfferCardProps = {
  offer: OfferCardData;
  pageType?: string;
  categorySlug?: string;
  position?: number;
  matchReasons?: string[];
  regionSelected: boolean;
};

export const OFFER_GRID_CLASS_NAME =
  "-mx-3 grid grid-cols-1 gap-2 min-[350px]:grid-cols-2 sm:mx-0 sm:gap-3 md:grid-cols-3 xl:grid-cols-4";

export const DEFAULT_OFFER_RISK_NOTICE =
  "Решение по заявке принимает кредитор. Перед оформлением проверьте полную стоимость займа и условия договора.";

export function OfferCard({
  offer,
  pageType = "home",
  categorySlug,
  position,
  matchReasons = [],
  regionSelected,
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

  clickParams.set(
    "variant",
    getOfferClickVariant(pageType, offer.promoReady),
  );

  return (
    <article
      className={`flex h-full min-w-0 flex-col rounded-lg border bg-white p-2 shadow-sm sm:p-3 lg:p-4 ${
        offer.pageHighlight ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200"
      }`}
    >
      <div className="flex min-h-10 items-center gap-2 sm:min-h-11 sm:items-start sm:gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-emerald-50 text-base font-black text-emerald-700 sm:h-11 sm:w-11 sm:text-lg">
          {offer.logoUrl ? (
            <img
              src={offer.logoUrl}
              alt={`Логотип ${offer.name}`}
              className="h-full w-full rounded-md bg-white object-contain p-1"
            />
          ) : (
            offer.logoText
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-normal text-[11px] font-bold leading-3 text-slate-950 min-[390px]:text-[14px] min-[390px]:leading-4 sm:break-words sm:text-base sm:leading-5">
            {offer.name}
          </h3>
          <div className="mt-1.5 hidden flex-wrap items-start gap-1 sm:flex">
            <span className="whitespace-nowrap rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold leading-3 tracking-tight text-slate-700 sm:max-w-full sm:whitespace-normal sm:break-words sm:px-1.5 sm:text-[11px] sm:leading-4 sm:tracking-normal">
              {badge}
            </span>
            {offer.pageHighlight ? (
              <span className="whitespace-nowrap rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-semibold leading-3 tracking-tight text-emerald-800 sm:px-1.5 sm:text-[11px] sm:leading-4 sm:tracking-normal">
                выделено
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-start gap-1 sm:hidden">
        <span className="whitespace-nowrap rounded bg-slate-100 px-1 py-0.5 text-[8px] font-semibold leading-3 tracking-tight text-slate-700 min-[390px]:text-[9px]">
          {badge}
        </span>
        {offer.pageHighlight ? (
          <span className="whitespace-nowrap rounded bg-emerald-50 px-1 py-0.5 text-[8px] font-semibold leading-3 tracking-tight text-emerald-800 min-[390px]:text-[9px]">
            выделено
          </span>
        ) : null}
      </div>

      {offer.displayVariant === "promo_zero" ? (
        <div className="mt-2 rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[10px] font-semibold leading-4 text-violet-900 sm:text-xs">
          Условия акции 0%
          {offer.promoNewClientsOnly ? " · только новым клиентам" : ""}
        </div>
      ) : offer.promoReady ? (
        <div className="mt-2 text-[10px] font-semibold leading-4 text-violet-700 sm:text-xs">
          Есть акция 0%
        </div>
      ) : null}

      <dl className="mt-2 grid gap-1 text-[10px] leading-4 min-[390px]:text-xs sm:mt-3 sm:gap-1.5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-1.5">
          <dt className="whitespace-nowrap text-slate-500 sm:whitespace-normal">Сумма</dt>
          <dd className="whitespace-nowrap text-right font-semibold text-slate-900 sm:whitespace-normal sm:break-words">
            {offer.amount}
          </dd>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-1.5">
          <dt className="whitespace-nowrap text-slate-500 sm:whitespace-normal">Срок</dt>
          <dd className="whitespace-nowrap text-right font-semibold text-slate-900 sm:whitespace-normal sm:break-words">
            {offer.term}
          </dd>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-1.5">
          <dt className="whitespace-nowrap text-slate-500 sm:whitespace-normal">ПСК</dt>
          <dd className="whitespace-nowrap text-right font-semibold text-slate-900 sm:whitespace-normal sm:break-words">
            {offer.psk}
          </dd>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-1.5">
          <dt className="whitespace-nowrap text-slate-500 sm:whitespace-normal">
            <span className="sm:hidden">% в день</span>
            <span className="hidden sm:inline">Ставка в день</span>
          </dt>
          <dd className="whitespace-nowrap text-right font-semibold text-slate-900 sm:whitespace-normal sm:break-words">
            {offer.rate}
          </dd>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-1.5">
          <dt className="whitespace-nowrap text-slate-500 sm:whitespace-normal">Рассмотрение</dt>
          <dd className="whitespace-nowrap text-right font-semibold text-slate-900 sm:whitespace-normal sm:break-words">
            {offer.decisionTime}
          </dd>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-1.5">
          <dt className="whitespace-nowrap text-slate-500 sm:whitespace-normal">Одобрение</dt>
          <dd className={`whitespace-nowrap text-right font-semibold sm:whitespace-normal sm:break-words ${approvalClass}`}>
            {offer.approval}
          </dd>
        </div>
      </dl>

      {offer.pageNote ? (
        <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-700">
          {offer.pageNote}
        </p>
      ) : null}

      {offer.displayVariant === "promo_zero" && offer.promoConditions ? (
        <p className="mt-2 line-clamp-3 rounded-md bg-violet-50 p-2 text-[10px] leading-4 text-violet-950 sm:text-xs sm:leading-5">
          {offer.promoConditions}
        </p>
      ) : null}

      {matchReasons.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {matchReasons.map((reason) => (
            <span
              key={reason}
              className="max-w-full break-words rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-emerald-800 sm:text-[11px]"
            >
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto grid gap-1.5 pt-3 sm:gap-2 sm:pt-4">
        {offer.promoUnavailable ? (
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-md bg-slate-300 px-2 py-2 text-center text-xs font-semibold leading-5 text-slate-600 min-[390px]:text-sm"
          >
            Акция временно недоступна
          </button>
        ) : (
          <OfferCtaLink
            href={`/go/${offer.slug}?${clickParams.toString()}`}
            regionSelected={regionSelected}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-700 px-2 py-2 text-center text-xs font-semibold leading-5 text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 min-[390px]:text-sm"
          >
            {ctaText}
          </OfferCtaLink>
        )}
        <Link
          href={`/offers/${offer.slug}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-2 text-center text-xs font-semibold leading-5 text-slate-800 transition hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 min-[390px]:text-sm"
        >
          Подробнее
        </Link>
      </div>
    </article>
  );
}
