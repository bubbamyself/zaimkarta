import assert from "node:assert/strict";
import test from "node:test";
import {
  getOfferApplicationAvailability,
  isPublicOfferStatus,
} from "./offer-publication";

test("публичными остаются ACTIVE и PAUSED офферы", () => {
  assert.equal(isPublicOfferStatus("ACTIVE"), true);
  assert.equal(isPublicOfferStatus("PAUSED"), true);
  assert.equal(isPublicOfferStatus("DRAFT"), false);
  assert.equal(isPublicOfferStatus("ARCHIVED"), false);
});

test("ACTIVE оффер с рабочей CPA-ссылкой доступен", () => {
  assert.deepEqual(
    getOfferApplicationAvailability({
      status: "ACTIVE",
      restrictedRegionCodes: [],
      selectedRegionCode: "55",
      hasActiveAffiliateOffer: true,
    }),
    { isAvailable: true, reason: "AVAILABLE" },
  );
});

test("PAUSED оффер сохраняет страницу, но не заявку", () => {
  assert.deepEqual(
    getOfferApplicationAvailability({
      status: "PAUSED",
      restrictedRegionCodes: [],
      selectedRegionCode: null,
      hasActiveAffiliateOffer: true,
    }),
    { isAvailable: false, reason: "PAUSED" },
  );
});

test("региональное ограничение отключает заявку", () => {
  assert.deepEqual(
    getOfferApplicationAvailability({
      status: "ACTIVE",
      restrictedRegionCodes: ["55"],
      selectedRegionCode: "55",
      hasActiveAffiliateOffer: true,
    }),
    { isAvailable: false, reason: "REGION_RESTRICTED" },
  );
});

test("без выбранного региона заявка не открывается", () => {
  assert.deepEqual(
    getOfferApplicationAvailability({
      status: "ACTIVE",
      restrictedRegionCodes: [],
      selectedRegionCode: null,
      hasActiveAffiliateOffer: true,
    }),
    { isAvailable: false, reason: "REGION_REQUIRED" },
  );
});

test("отсутствие активной CPA-ссылки отключает заявку", () => {
  assert.deepEqual(
    getOfferApplicationAvailability({
      status: "ACTIVE",
      restrictedRegionCodes: [],
      selectedRegionCode: "55",
      hasActiveAffiliateOffer: false,
    }),
    { isAvailable: false, reason: "AFFILIATE_UNAVAILABLE" },
  );
});
