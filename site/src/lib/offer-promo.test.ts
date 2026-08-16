import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PROMO_TITLE,
  getPromoFieldErrors,
  isPromoReady,
  type PromoOfferData,
} from "./offer-promo";

function validPromo(overrides: Partial<PromoOfferData> = {}): PromoOfferData {
  return {
    promoEnabled: true,
    promoTitle: DEFAULT_PROMO_TITLE,
    promoDailyRate: "0",
    promoPsk: "0",
    promoMinAmount: 1_000,
    promoMaxAmount: 30_000,
    promoZeroTermDays: 30,
    promoNewClientsOnly: true,
    promoConditions: "Погасить заем полностью и без просрочки.",
    promoLateConsequences: null,
    promoPaidServices: null,
    promoSourceUrl: "https://example.com/promo",
    promoCheckedAt: new Date("2026-08-17T00:00:00.000Z"),
    ...overrides,
  };
}

test("выключенная акция не требует заполнения полей", () => {
  const promo = validPromo({
    promoEnabled: false,
    promoTitle: null,
    promoSourceUrl: null,
    promoCheckedAt: null,
  });

  assert.deepEqual(getPromoFieldErrors(promo), {});
  assert.equal(isPromoReady(promo), false);
});

test("валидная акция готова к публикации", () => {
  assert.deepEqual(getPromoFieldErrors(validPromo()), {});
  assert.equal(isPromoReady(validPromo()), true);
});

test("неполная акция возвращает ошибки конкретных полей", () => {
  const errors = getPromoFieldErrors(
    validPromo({
      promoTitle: null,
      promoDailyRate: "-0.1",
      promoMinAmount: 40_000,
      promoMaxAmount: 30_000,
      promoZeroTermDays: 0,
      promoConditions: null,
      promoSourceUrl: "http://example.com/promo",
      promoCheckedAt: null,
    }),
  );

  assert.match(errors.promoTitle, /название/i);
  assert.match(errors.promoDailyRate, /отрицательной/i);
  assert.match(errors.promoMaxAmount, /не меньше/i);
  assert.match(errors.promoZeroTermDays, /больше нуля/i);
  assert.match(errors.promoConditions, /условия/i);
  assert.match(errors.promoSourceUrl, /HTTPS/i);
  assert.match(errors.promoCheckedAt, /дату/i);
});
