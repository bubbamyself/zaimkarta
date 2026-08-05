import assert from "node:assert/strict";
import test from "node:test";
import { getOverpaymentResultCopy } from "./overpayment-result-copy";

test("формирует ответ для положительной ставки", () => {
  const copy = getOverpaymentResultCopy({
    amount: 15000,
    termDays: 21,
    dailyRate: 0.8,
    overpayment: 2520,
    totalReturn: 17520,
    dailyCost: 120,
  });
  const text = copy.paragraphs.join(" ");

  assert.match(text, /15\s000/);
  assert.match(text, /21 день/);
  assert.match(text, /17\s520/);
  assert.doesNotMatch(text, /\{[^}]+\}|undefined|null|NaN/);
});

test("нулевая ставка не называется безусловно бесплатным займом", () => {
  const copy = getOverpaymentResultCopy({
    amount: 10000,
    termDays: 14,
    dailyRate: 0,
    overpayment: 0,
    totalReturn: 10000,
    dailyCost: 0,
  });
  const text = copy.paragraphs.join(" ");

  assert.match(text, /условий акции/);
  assert.doesNotMatch(text, /бесплатн/i);
});
