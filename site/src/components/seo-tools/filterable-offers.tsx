"use client";

import { useEffect, useMemo, useState } from "react";
import { OfferCard } from "@/components/offer-card";
import type { OfferCardData } from "@/lib/offers";

const OFFER_FILTER_EVENT = "zaimkarta:offer-filter";

type OfferFilterDetail = {
  amount?: number;
  checklist?: ChecklistFilter;
};

export type ChecklistFilter = {
  age18?: "yes" | "no";
  rfPassport?: "yes" | "no";
  payout?: "card" | "cash" | "online" | "any";
  priority?: "zero" | "fast" | "approval" | "long" | "any";
};

export function publishOfferAmountFilter(amount: number) {
  window.dispatchEvent(
    new CustomEvent<OfferFilterDetail>(OFFER_FILTER_EVENT, {
      detail: {
        amount,
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

function offerSupportsPayout(offer: OfferCardData, payout: ChecklistFilter["payout"]) {
  if (!payout || payout === "any") {
    return true;
  }

  const patterns = {
    card: ["карт"],
    cash: ["налич"],
    online: ["онлайн", "online"],
  }[payout];

  return includesAny(offer.payoutMethods, patterns);
}

function offerMatchesRfPassport(offer: OfferCardData, rfPassport: ChecklistFilter["rfPassport"]) {
  if (!rfPassport) {
    return true;
  }

  const requirementText = [...offer.requirements, ...offer.documents];

  if (rfPassport === "yes") {
    return includesAny(requirementText, ["паспорт рф", "паспорт гражданина", "гражданство рф"]);
  }

  return includesAny(requirementText, ["нерезидент", "иностран", "другой документ"]);
}

function offerMatchesAge18(offer: OfferCardData, age18: ChecklistFilter["age18"]) {
  if (!age18) {
    return true;
  }

  if (age18 === "no") {
    return false;
  }

  return includesAny(offer.requirements, ["18", "совершеннолет"]);
}

function isFastDecision(offer: OfferCardData) {
  const text = normalize(`${offer.decisionTime} ${offer.advantages.join(" ")}`);
  const minutesMatch = text.match(/(\d+)\s*(мин|мину)/);

  if (minutesMatch) {
    return Number(minutesMatch[1]) <= 30;
  }

  return text.includes("быстр") || text.includes("сроч");
}

function getPriorityMatch(offer: OfferCardData, priority: ChecklistFilter["priority"]) {
  if (!priority || priority === "any") {
    return null;
  }

  const text = normalize(`${offer.badge} ${offer.advantages.join(" ")} ${offer.tags.join(" ")}`);

  if (priority === "zero" && (text.includes("0%") || text.includes("0 процент"))) {
    return "по приоритету 0%";
  }

  if (priority === "fast" && isFastDecision(offer)) {
    return "быстрое решение";
  }

  if (priority === "approval" && offer.approvalTone === "high") {
    return "высокая вероятность";
  }

  if (priority === "long" && (offer.maxTermDays ?? 0) > 30) {
    return "длинный срок";
  }

  return null;
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

  if (offerMatchesAge18(offer, checklist.age18)) {
    score += checklist.age18 ? 10 : 0;
  }

  if (checklist.payout && checklist.payout !== "any" && offerSupportsPayout(offer, checklist.payout)) {
    score += 30;
    reasons.push(
      checklist.payout === "card"
        ? "получение на карту"
        : checklist.payout === "cash"
          ? "можно наличными"
          : "онлайн получение",
    );
  }

  if (offerMatchesRfPassport(offer, checklist.rfPassport)) {
    score += checklist.rfPassport ? 10 : 0;
  }

  const priorityReason = getPriorityMatch(offer, checklist.priority);

  if (priorityReason) {
    score += 40;
    reasons.push(priorityReason);
  }

  return {
    score,
    reasons,
  };
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
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter | null>(null);

  useEffect(() => {
    function handleOfferFilter(event: Event) {
      const detail = (event as CustomEvent<OfferFilterDetail>).detail;

      if (typeof detail?.amount === "number" && Number.isFinite(detail.amount)) {
        setRequestedAmount(detail.amount);
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
    const filteredByAmount = requestedAmount
      ? offers.filter(
          (offer) => offer.maxAmount === null || offer.maxAmount >= requestedAmount,
        )
      : offers;

    const filteredByChecklist = filteredByAmount.filter((offer) => {
      if (!checklistFilter) {
        return true;
      }

      return offerSupportsPayout(offer, checklistFilter.payout);
    });

    return filteredByChecklist
      .map((offer, initialIndex) => ({
        offer,
        initialIndex,
        match: scoreOffer(offer, checklistFilter),
      }))
      .sort((first, second) => {
        if (second.match.score !== first.match.score) {
          return second.match.score - first.match.score;
        }

        return first.initialIndex - second.initialIndex;
      });
  }, [offers, requestedAmount, checklistFilter]);

  const hasChecklistAnswers =
    checklistFilter && Object.values(checklistFilter).some(Boolean);
  const hasHardWarning =
    checklistFilter?.age18 === "no" || checklistFilter?.rfPassport === "no";

  return (
    <section id="offers" className="mx-auto max-w-6xl px-5">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        {requestedAmount ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Показываем предложения, где максимальная сумма не ниже{" "}
            {requestedAmount.toLocaleString("ru-RU")} ₽.
          </p>
        ) : null}
        {hasChecklistAnswers ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Карточки перестроены с учетом ответов в чек-листе.
          </p>
        ) : null}
        {hasHardWarning ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Перед переходом к заявке внимательно проверьте требования МФО.
            Большинство офферов рассчитаны на совершеннолетних заемщиков с
            паспортом гражданина РФ.
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
