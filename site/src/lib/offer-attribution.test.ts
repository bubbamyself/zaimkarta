import assert from "node:assert/strict";
import test from "node:test";
import { buildAttributedGoHref } from "./offer-attribution";

test("разрешённые UTM переходят в /go без посторонних параметров", () => {
  const href = buildAttributedGoHref(
    "/go/moneyman?page_type=service&position=1",
    "?share=1&utm_source=calculator_share&utm_medium=referral&utm_campaign=overpayment&lead_id=secret",
  );
  const url = new URL(href, "https://zaimkarta.ru");

  assert.equal(url.searchParams.get("page_type"), "service");
  assert.equal(url.searchParams.get("position"), "1");
  assert.equal(url.searchParams.get("utm_source"), "calculator_share");
  assert.equal(url.searchParams.get("utm_medium"), "referral");
  assert.equal(url.searchParams.get("utm_campaign"), "overpayment");
  assert.equal(url.searchParams.has("share"), false);
  assert.equal(url.searchParams.has("lead_id"), false);
});

test("дублированная или слишком длинная UTM не передаётся", () => {
  const href = buildAttributedGoHref(
    "/go/moneyman?page_type=service",
    `?utm_source=first&utm_source=second&utm_term=${"x".repeat(201)}`,
  );
  const url = new URL(href, "https://zaimkarta.ru");

  assert.equal(url.searchParams.has("utm_source"), false);
  assert.equal(url.searchParams.has("utm_term"), false);
});
