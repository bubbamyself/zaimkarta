import assert from "node:assert/strict";
import test from "node:test";
import {
  parseOfferDisplayVariant,
  toStoredOfferDisplayVariant,
} from "./offer-display-variant";

test("принимаются только известные варианты карточки", () => {
  assert.equal(parseOfferDisplayVariant("standard"), "standard");
  assert.equal(parseOfferDisplayVariant("promo_zero"), "promo_zero");
  assert.equal(parseOfferDisplayVariant("promo_hacked"), "standard");
  assert.equal(parseOfferDisplayVariant(null), "standard");
});

test("публичное значение переводится в значение Prisma", () => {
  assert.equal(toStoredOfferDisplayVariant("standard"), "STANDARD");
  assert.equal(toStoredOfferDisplayVariant("promo_zero"), "PROMO_ZERO");
});
