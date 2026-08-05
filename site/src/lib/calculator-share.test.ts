import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOverpaymentShareUrl,
  buildRepaymentShareUrl,
  getOverpaymentSharePreview,
  parseOverpaymentShareParams,
  parseRepaymentShareParams,
  sanitizeCalculatorAnalyticsUrl,
} from "./calculator-share";

test("принимает и нормализует параметры переплаты", () => {
  const parsed = parseOverpaymentShareParams(
    new URLSearchParams("share=1&v=1&amount=15499&term=20&rate=0.84"),
  );

  assert.ok(parsed);
  assert.equal(parsed.amount, 15000);
  assert.equal(parsed.term, 20);
  assert.equal(parsed.rate, 0.8);
  assert.equal(parsed.result.totalReturn, 17400);
});

test("отклоняет дубли, бесконечность и значения вне диапазонов", () => {
  assert.equal(
    parseOverpaymentShareParams(
      new URLSearchParams("share=1&v=1&amount=10000&amount=20000&term=20&rate=0.8"),
    ),
    null,
  );
  for (const rate of ["NaN", "Infinity", "-1", "999"]) {
    assert.equal(
      parseOverpaymentShareParams(
        new URLSearchParams(`share=1&v=1&amount=10000&term=20&rate=${rate}`),
      ),
      null,
    );
  }
});

test("принимает реальную локальную дату и пересчитывает результат", () => {
  const parsed = parseRepaymentShareParams(
    new URLSearchParams("share=1&v=1&start=2026-08-05&term=30&result=2099-01-01"),
  );

  assert.ok(parsed);
  assert.equal(parsed.result.repaymentDate.getFullYear(), 2026);
  assert.equal(parsed.result.repaymentDate.getMonth(), 8);
  assert.equal(parsed.result.repaymentDate.getDate(), 4);
});

test("отклоняет невозможные даты, крайние годы и дубли", () => {
  for (const query of [
    "share=1&v=1&start=2026-02-30&term=30",
    "share=1&v=1&start=1999-01-01&term=30",
    "share=1&v=1&start=2101-01-01&term=30",
    "share=1&v=1&start=2026-01-01&start=2026-01-02&term=30",
  ]) {
    assert.equal(parseRepaymentShareParams(new URLSearchParams(query)), null);
  }
});

test("строит ссылку только из allowlist и фиксированных UTM", () => {
  const url = new URL(
    buildOverpaymentShareUrl({
      origin: "https://zaimkarta.ru/current?lead_id=secret&utm_source=old",
      amount: 15000,
      term: 20,
      rate: 0.8,
    }),
  );

  assert.equal(url.pathname, "/raschet-pereplati");
  assert.equal(url.searchParams.get("utm_source"), "calculator_share");
  assert.equal(url.searchParams.has("lead_id"), false);
  assert.equal(url.searchParams.has("click_id"), false);
  assert.equal(url.searchParams.has("secret"), false);
});

test("одинаковый нормализованный ввод даёт одинаковый image URL", () => {
  const first = parseOverpaymentShareParams(
    new URLSearchParams("share=1&v=1&amount=15499&term=20&rate=0.84"),
  );
  const second = parseOverpaymentShareParams(
    new URLSearchParams("share=1&v=1&amount=15000&term=20&rate=0.8"),
  );
  assert.ok(first && second);

  const firstUrl = getOverpaymentSharePreview(first, "https://zaimkarta.ru").imageUrl;
  const secondUrl = getOverpaymentSharePreview(second, "https://zaimkarta.ru").imageUrl;
  assert.equal(firstUrl, secondUrl);

  const repaymentUrl = buildRepaymentShareUrl({
    origin: "https://zaimkarta.ru",
    start: "2026-08-05",
    term: 30,
  });
  assert.match(repaymentUrl, /utm_campaign=repayment_date/);
});

test("Метрика не получает расчётные параметры shared URL, но сохраняет UTM", () => {
  const sanitized = new URL(
    sanitizeCalculatorAnalyticsUrl(
      "https://zaimkarta.ru/raschet-pereplati?share=1&v=1&amount=15000&term=20&rate=0.8&utm_source=calculator_share&utm_campaign=overpayment",
    ),
  );

  for (const key of ["share", "v", "amount", "term", "rate", "start"]) {
    assert.equal(sanitized.searchParams.has(key), false);
  }

  assert.equal(sanitized.searchParams.get("utm_source"), "calculator_share");
  assert.equal(sanitized.searchParams.get("utm_campaign"), "overpayment");
  assert.equal(
    sanitizeCalculatorAnalyticsUrl(
      "https://zaimkarta.ru/zaimy-na-kartu?amount=15000",
    ),
    "https://zaimkarta.ru/zaimy-na-kartu?amount=15000",
  );
});
