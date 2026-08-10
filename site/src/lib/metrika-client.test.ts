import assert from "node:assert/strict";
import test from "node:test";
import {
  appendMetrikaClientId,
  getOfferClickGoalParams,
  isValidMetrikaClientId,
} from "./metrika-client";

test("ClientID принимает только цифровую строку разумной длины", () => {
  assert.equal(isValidMetrikaClientId("1234567890123456789"), true);
  assert.equal(isValidMetrikaClientId(""), false);
  assert.equal(isValidMetrikaClientId("123abc"), false);
  assert.equal(isValidMetrikaClientId("1".repeat(33)), false);
});

test("ClientID добавляется только во внутренний /go URL", () => {
  const href = appendMetrikaClientId(
    "/go/moneyman?page_type=home&utm_source=test",
    "123456789",
  );
  const url = new URL(href, "https://zaimkarta.ru");

  assert.equal(url.searchParams.get("metrika_client_id"), "123456789");
  assert.equal(url.searchParams.get("utm_source"), "test");
});

test("параметры цели берутся только из безопасных полей CTA", () => {
  assert.deepEqual(
    getOfferClickGoalParams(
      "/go/moneyman?page_type=service&category=zaimy-na-kartu&position=2&lead_id=secret",
    ),
    {
      offer_slug: "moneyman",
      page_type: "service",
      category: "zaimy-na-kartu",
      position: 2,
    },
  );
  assert.equal(getOfferClickGoalParams("/offers/moneyman"), null);
});
