import assert from "node:assert/strict";
import test from "node:test";
import { calculateRepaymentDate } from "./repayment-date";
import { getRepaymentDateResultCopy } from "./repayment-date-result-copy";

function calculate(startDateValue: string, termDaysValue: string, today: Date) {
  const result = calculateRepaymentDate({
    startDateValue,
    termDaysValue,
    minTermDays: 1,
    maxTermDays: 365,
    today,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

test("выбирает будущий шаблон и правильные формы дней", () => {
  const cases = [
    ["2026-01-01", "1 день"],
    ["2026-01-01", "2 дня"],
    ["2026-01-01", "5 дней"],
    ["2026-01-01", "11 дней"],
    ["2026-01-01", "21 день"],
  ] as const;

  for (const [startDateValue, expectedTerm] of cases) {
    const term = Number(expectedTerm.split(" ")[0]);
    const copy = getRepaymentDateResultCopy(
      calculate(startDateValue, String(term), new Date(2025, 11, 1)),
    );
    assert.match(copy.paragraphs.join(" "), new RegExp(`срок займа — ${expectedTerm}`));
  }
});

test("выбирает шаблоны сегодняшней и прошедшей даты", () => {
  const today = new Date(2026, 0, 10);
  const todayCopy = getRepaymentDateResultCopy(calculate("2026-01-09", "1", today));
  const pastCopy = getRepaymentDateResultCopy(calculate("2026-01-01", "1", today));

  assert.match(todayCopy.paragraphs[0], /сегодня/);
  assert.match(pastCopy.paragraphs[1], /уже прошла/);
  assert.doesNotMatch(pastCopy.paragraphs.join(" "), /наличие просрочки подтверждено/i);
});

test("сохраняет локальную календарную дату и добавляет предупреждение выходного", () => {
  const result = calculate("2026-08-07", "1", new Date(2026, 7, 1));
  const copy = getRepaymentDateResultCopy(result);
  const text = [...copy.paragraphs, copy.warning].filter(Boolean).join(" ");

  assert.equal(result.repaymentDate.getDate(), 8);
  assert.match(text, /8 августа 2026/);
  assert.match(copy.warning ?? "", /суббот/);
  assert.doesNotMatch(text, /\.\./);
  assert.doesNotMatch(text, /\{[^}]+\}|undefined|null|NaN/);
});
