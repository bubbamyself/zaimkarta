import assert from "node:assert/strict";
import test from "node:test";
import {
  offerFilterTargetsMatch,
  offerHasConfirmedPaidMinimumRate,
  offerMatchesAmount,
  offerMatchesTerm,
} from "./filterable-offers";

test("просрочка принимает только подтверждённую платную минимальную ставку", () => {
  assert.equal(
    offerHasConfirmedPaidMinimumRate({ dailyRateFrom: 0.01 }),
    true,
  );
  assert.equal(offerHasConfirmedPaidMinimumRate({ dailyRateFrom: 0 }), false);
  assert.equal(offerHasConfirmedPaidMinimumRate({ dailyRateFrom: null }), false);
});

test("событие коммерческого блока не затрагивает чужую подборку", () => {
  assert.equal(offerFilterTargetsMatch("offers-overdue", "offers-overdue"), true);
  assert.equal(offerFilterTargetsMatch("offers-overdue", "offers-other"), false);
  assert.equal(offerFilterTargetsMatch("offers-overdue", undefined), false);
  assert.equal(offerFilterTargetsMatch(undefined, "offers-other"), true);
});

test("переплата учитывает минимальную и максимальную сумму", () => {
  const offer = { minAmount: 5_000, maxAmount: 30_000 };

  assert.equal(offerMatchesAmount(offer, 4_999), false);
  assert.equal(offerMatchesAmount(offer, 5_000), true);
  assert.equal(offerMatchesAmount(offer, 30_000), true);
  assert.equal(offerMatchesAmount(offer, 30_001), false);
  assert.equal(
    offerMatchesAmount({ minAmount: null, maxAmount: null }, 100_000),
    true,
  );
});

test("срок проверяется по обеим границам", () => {
  const offer = { minTermDays: 7, maxTermDays: 30 };

  assert.equal(offerMatchesTerm(offer, 6, false), false);
  assert.equal(offerMatchesTerm(offer, 7, false), true);
  assert.equal(offerMatchesTerm(offer, 30, true), true);
  assert.equal(offerMatchesTerm(offer, 31, true), false);
  assert.equal(
    offerMatchesTerm({ minTermDays: 1, maxTermDays: null }, 14, true),
    false,
  );
});
