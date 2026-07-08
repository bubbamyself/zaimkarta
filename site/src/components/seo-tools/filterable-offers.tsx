"use client";

import { useEffect, useMemo, useState } from "react";
import { OfferCard } from "@/components/offer-card";
import type { OfferCardData } from "@/lib/offers";

const OFFER_FILTER_EVENT = "zaimkarta:offer-filter";

type OfferFilterDetail = {
  amount?: number;
  termDays?: number;
  dailyRate?: number;
  priority?: OfferPickerPriority;
  checklist?: ChecklistFilter;
};

export type OfferPickerPriority = "lowRate" | "fast" | "zero" | "approval";

export type ChecklistFilter = {
  passportReady?: "yes" | "no";
  namedCard?: "yes" | "no";
  repaymentPlan?: "yes" | "no";
  overpaymentCalculated?: "yes" | "no";
  contractReady?: "yes" | "no";
};

export function publishOfferAmountFilter({
  amount,
  termDays,
  dailyRate,
  priority,
}: {
  amount: number;
  termDays?: number;
  dailyRate?: number;
  priority?: OfferPickerPriority;
}) {
  window.dispatchEvent(
    new CustomEvent<OfferFilterDetail>(OFFER_FILTER_EVENT, {
      detail: {
        amount,
        termDays,
        dailyRate,
        priority,
      },
    }),
  );
}

export function publishOfferChecklistFilter(checklist: ChecklistFilter) {
  window.dispatchEvent(
    new CustomEvent<OfferFilterDetail>(OFFER_FILTER_EVENT, {
      detail: {
        checklist,
      },
    }),
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace("ё", "е");
}

function includesAny(items: string[], patterns: string[]) {
  return items.some((item) => {
    const normalized = normalize(item);
    return patterns.some((pattern) => normalized.includes(pattern));
  });
}

function requiresPassport(offer: OfferCardData) {
  return includesAny([...offer.requirements, ...offer.documents], ["паспорт"]);
}

function hasCardOrSbpPayout(offer: OfferCardData) {
  return includesAny(offer.payoutMethods, ["карт", "сбп"]);
}

function hasAlternativePayoutWithoutNamedCard(offer: OfferCardData) {
  return includesAny(offer.payoutMethods, [
    "налич",
    "банковский счет",
    "счет",
    "электрон",
    "кошелек",
  ]);
}

function offerMatchesPassport(offer: OfferCardData, passportReady: ChecklistFilter["passportReady"]) {
  if (!passportReady) {
    return true;
  }

  if (passportReady === "yes") {
    return requiresPassport(offer);
  }

  return !requiresPassport(offer);
}

function offerMatchesNamedCard(offer: OfferCardData, namedCard: ChecklistFilter["namedCard"]) {
  if (!namedCard || namedCard === "yes") {
    return true;
  }

  if (!hasCardOrSbpPayout(offer)) {
    return true;
  }

  return hasAlternativePayoutWithoutNamedCard(offer);
}

function shouldShowOnlyHighApproval(checklist: ChecklistFilter | null) {
  return (
    checklist?.repaymentPlan === "no" ||
    checklist?.overpaymentCalculated === "no" ||
    checklist?.contractReady === "no"
  );
}

function offerMatchesRiskReadiness(offer: OfferCardData, checklist: ChecklistFilter | null) {
  if (!shouldShowOnlyHighApproval(checklist)) {
    return true;
  }

  return offer.approvalTone === "high";
}

function offerMatchesAmount(offer: OfferCardData, amount: number | null) {
  return !amount || offer.maxAmount === null || offer.maxAmount >= amount;
}

function offerMatchesTerm(offer: OfferCardData, termDays: number | null) {
  if (!termDays) {
    return true;
  }

  const minTerm = offer.minTermDays ?? 0;
  const maxTerm = offer.maxTermDays ?? Number.POSITIVE_INFINITY;

  return minTerm <= termDays && maxTerm >= termDays;
}

function offerMatchesDailyRate(offer: OfferCardData, dailyRate: number | null) {
  if (dailyRate === null) {
    return true;
  }

  const minRate = offer.dailyRateFrom ?? 0;
  const maxRate = offer.dailyRateTo ?? Number.POSITIVE_INFINITY;

  return minRate <= dailyRate && maxRate >= dailyRate;
}

function isFastDecision(offer: OfferCardData) {
  const text = normalize(`${offer.decisionTime} ${offer.advantages.join(" ")}`);
  const minutesMatch = text.match(/(\d+)\s*(мин|мину)/);

  if (minutesMatch) {
    return Number(minutesMatch[1]) <= 30;
  }

  return text.includes("быстр") || text.includes("сроч");
}

function isZeroRateOffer(offer: OfferCardData) {
  const text = normalize(`${offer.badge} ${offer.advantages.join(" ")} ${offer.tags.join(" ")}`);

  return text.includes("0%") || text.includes("0 процент") || offer.dailyRateFrom === 0;
}

function offerMatchesPriority(offer: OfferCardData, priority: OfferPickerPriority | null) {
  if (!priority || priority === "lowRate") {
    return true;
  }

  if (priority === "fast") {
    return isFastDecision(offer);
  }

  if (priority === "zero") {
    return isZeroRateOffer(offer);
  }

  return offer.approvalTone === "high";
}

function scoreOffer(offer: OfferCardData, checklist: ChecklistFilter | null) {
  if (!checklist) {
    return {
      score: 0,
      reasons: [] as string[],
    };
  }

  const reasons: string[] = [];
  let score = 0;

  if (checklist.passportReady && offerMatchesPassport(offer, checklist.passportReady)) {
    score += 20;
    reasons.push(
      checklist.passportReady === "yes"
        ? "паспорт указан в документах"
        : "паспорт не указан как обязательный документ",
    );
  }

  if (checklist.namedCard === "no" && offerMatchesNamedCard(offer, checklist.namedCard)) {
    score += 20;
    reasons.push("есть вариант без именной карты");
  }

  if (shouldShowOnlyHighApproval(checklist) && offer.approvalTone === "high") {
    score += 40;
    reasons.push("высокая вероятность");
  }

  if (
    checklist.repaymentPlan === "yes" &&
    checklist.overpaymentCalculated === "yes" &&
    checklist.contractReady === "yes"
  ) {
    score += 10;
  }

  return {
    score,
    reasons,
  };
}

function scorePickerPriority(offer: OfferCardData, priority: OfferPickerPriority | null) {
  if (!priority) {
    return 0;
  }

  if (priority === "lowRate") {
    return 100 - (offer.dailyRateTo ?? offer.dailyRateFrom ?? 100);
  }

  if (priority === "fast" && isFastDecision(offer)) {
    return 50;
  }

  if (priority === "zero" && isZeroRateOffer(offer)) {
    return 50;
  }

  if (priority === "approval" && offer.approvalTone === "high") {
    return 50;
  }

  return 0;
}

export function FilterableOffers({
  title,
  offers,
  pageType,
  categorySlug,
}: {
  title: string;
  offers: OfferCardData[];
  pageType: string;
  categorySlug: string;
}) {
  const [requestedAmount, setRequestedAmount] = useState<number | null>(null);
  const [requestedTermDays, setRequestedTermDays] = useState<number | null>(null);
  const [requestedDailyRate, setRequestedDailyRate] = useState<number | null>(null);
  const [pickerPriority, setPickerPriority] = useState<OfferPickerPriority | null>(null);
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter | null>(null);

  useEffect(() => {
    function handleOfferFilter(event: Event) {
      const detail = (event as CustomEvent<OfferFilterDetail>).detail;

      if (typeof detail?.amount === "number" && Number.isFinite(detail.amount)) {
        setRequestedAmount(detail.amount);
      }

      if (typeof detail?.termDays === "number" && Number.isFinite(detail.termDays)) {
        setRequestedTermDays(detail.termDays);
      }

      if (typeof detail?.dailyRate === "number" && Number.isFinite(detail.dailyRate)) {
        setRequestedDailyRate(detail.dailyRate);
      }

      if (detail?.priority) {
        setPickerPriority(detail.priority);
      }

      if (detail?.checklist) {
        setChecklistFilter(detail.checklist);
      }
    }

    window.addEventListener(OFFER_FILTER_EVENT, handleOfferFilter);

    return () => {
      window.removeEventListener(OFFER_FILTER_EVENT, handleOfferFilter);
    };
  }, []);

  const filteredOffers = useMemo(() => {
    const filteredByCalculation = offers.filter(
      (offer) =>
        offerMatchesAmount(offer, requestedAmount) &&
        offerMatchesTerm(offer, requestedTermDays) &&
        offerMatchesDailyRate(offer, requestedDailyRate) &&
        offerMatchesPriority(offer, pickerPriority),
    );

    const filteredByChecklist = filteredByCalculation.filter((offer) => {
      if (!checklistFilter) {
        return true;
      }

      return (
        offerMatchesPassport(offer, checklistFilter.passportReady) &&
        offerMatchesNamedCard(offer, checklistFilter.namedCard) &&
        offerMatchesRiskReadiness(offer, checklistFilter)
      );
    });

    return filteredByChecklist
      .map((offer, initialIndex) => ({
        offer,
        initialIndex,
        match: {
          ...scoreOffer(offer, checklistFilter),
          score: scoreOffer(offer, checklistFilter).score +
            scorePickerPriority(offer, pickerPriority),
        },
      }))
      .sort((first, second) => {
        if (second.match.score !== first.match.score) {
          return second.match.score - first.match.score;
        }

        return first.initialIndex - second.initialIndex;
      });
  }, [
    offers,
    requestedAmount,
    requestedDailyRate,
    requestedTermDays,
    pickerPriority,
    checklistFilter,
  ]);

  const hasChecklistAnswers =
    checklistFilter && Object.values(checklistFilter).some(Boolean);
  const hasHardWarning =
    checklistFilter?.passportReady === "no" || checklistFilter?.namedCard === "no";

  return (
    <section id="offers" className="mx-auto max-w-6xl px-5">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        {requestedAmount ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Показываем предложения, где подходят сумма{" "}
            {requestedAmount.toLocaleString("ru-RU")} ₽
            {requestedTermDays ? `, срок ${requestedTermDays} дней` : ""}
            {requestedDailyRate !== null
              ? ` и ставка ${requestedDailyRate.toLocaleString("ru-RU")}% в день`
              : ""}
            .
          </p>
        ) : null}
        {hasChecklistAnswers ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Карточки отфильтрованы с учетом ответов в чек-листе.
          </p>
        ) : null}
        {hasHardWarning ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Перед переходом к заявке внимательно проверьте документы и способ
            получения у кредитора. Некоторые предложения могут не подойти без
            паспорта или именной карты.
          </p>
        ) : null}
      </div>

      {filteredOffers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {filteredOffers.map(({ offer, match }, offerIndex) => (
            <OfferCard
              key={offer.slug}
              offer={offer}
              pageType={pageType}
              categorySlug={categorySlug}
              position={offerIndex + 1}
              matchReasons={match.reasons}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Для выбранных условий в этой подборке нет подходящих офферов. Можно
          изменить ответы или проверить другие категории.
        </p>
      )}
    </section>
  );
}
