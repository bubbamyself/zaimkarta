import assert from "node:assert/strict";
import test from "node:test";
import {
  getArchivedOfferRoutingDecision,
  getReplacementOfferValidationError,
} from "./offer-archive-policy";

test("рабочий оффер проходит без редиректа", () => {
  assert.deepEqual(
    getArchivedOfferRoutingDecision({
      sourceSlug: "old-offer",
      sourceStatus: "PAUSED",
      replacement: null,
    }),
    { type: "PASS" },
  );
});

test("ARCHIVED с активной точной заменой получает постоянный редирект", () => {
  assert.deepEqual(
    getArchivedOfferRoutingDecision({
      sourceSlug: "old-offer",
      sourceStatus: "ARCHIVED",
      replacement: {
        slug: "new-offer",
        status: "ACTIVE",
      },
    }),
    { type: "REDIRECT", replacementSlug: "new-offer" },
  );
});

test("ARCHIVED без замены получает 410", () => {
  assert.deepEqual(
    getArchivedOfferRoutingDecision({
      sourceSlug: "old-offer",
      sourceStatus: "ARCHIVED",
      replacement: null,
    }),
    { type: "GONE" },
  );
});

test("неактивная замена не создаёт цепочку редиректов", () => {
  assert.deepEqual(
    getArchivedOfferRoutingDecision({
      sourceSlug: "old-offer",
      sourceStatus: "ARCHIVED",
      replacement: {
        slug: "new-offer",
        status: "ARCHIVED",
      },
    }),
    { type: "GONE" },
  );
});

test("редирект на самого себя блокируется", () => {
  assert.equal(
    getReplacementOfferValidationError({
      sourceOfferId: "offer-1",
      sourceStatus: "ARCHIVED",
      replacement: {
        id: "offer-1",
        status: "ACTIVE",
      },
    }),
    "Оффер не может перенаправлять сам на себя",
  );
});

test("заменой нельзя назначить неактивный оффер", () => {
  assert.equal(
    getReplacementOfferValidationError({
      sourceOfferId: "offer-1",
      sourceStatus: "ARCHIVED",
      replacement: {
        id: "offer-2",
        status: "PAUSED",
      },
    }),
    "Заменой может быть только активный оффер",
  );
});
