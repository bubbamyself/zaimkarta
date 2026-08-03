import assert from "node:assert/strict";
import test from "node:test";
import { calculateOverdueLoan, toLocalInputDateValue } from "./overdue-loan";

test("считает пример 10 000 рублей с 1 по 8 июля и оплатой 15 июля", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-15",
    dailyRateValue: "0.8",
    interestMode: "yes",
    penaltyType: "daily",
    penaltyRateValue: "0.05",
    penaltyStartDayValue: "2",
    penaltyBase: "scheduled-payment",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(toLocalInputDateValue(result.dueDate), "2026-07-08");
  assert.equal(result.daysOverdue, 7);
  assert.equal(result.contractInterest, 560);
  assert.equal(result.scheduledPayment, 10560);
  assert.equal(result.overdueInterest, 560);
  assert.equal(result.penaltyDays, 6);
  assert.ok(Math.abs(result.penalty - 31.68) < 0.000001);
  assert.ok(Math.abs(result.estimatedTotal - 11151.68) < 0.000001);
});

test("подставляет строгие законные условия, если поля договора пустые", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-15",
    dailyRateValue: "",
    interestMode: "",
    penaltyType: "",
    penaltyRateValue: "",
    penaltyStartDayValue: "",
    penaltyBase: "",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.dailyRate, 0.8);
  assert.equal(result.overdueInterest, 560);
  assert.equal(result.penaltyDays, 7);
  assert.equal(result.assumptions.length, 6);
});

test("ограничивает общие начисления применимым пределом", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-04-01",
    termDaysValue: "365",
    plannedPaymentDateValue: "2028-04-01",
    dailyRateValue: "0.8",
    interestMode: "yes",
    penaltyType: "annual",
    penaltyRateValue: "20",
    penaltyStartDayValue: "1",
    penaltyBase: "scheduled-payment",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.limitCheck.applies, true);
  assert.equal(result.estimatedTotal, 20000);
});

test("не начисляет пеню до указанного договором дня", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-10",
    dailyRateValue: "0.8",
    interestMode: "yes",
    penaltyType: "daily",
    penaltyRateValue: "0.05",
    penaltyStartDayValue: "4",
    penaltyBase: "principal",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.daysOverdue, 2);
  assert.equal(result.penaltyDays, 0);
  assert.equal(result.penalty, 0);
});

test("ограничивает дневную неустойку эквивалентом 20% годовых, когда проценты продолжаются", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-09",
    dailyRateValue: "0.8",
    interestMode: "yes",
    penaltyType: "daily",
    penaltyRateValue: "0.1",
    penaltyStartDayValue: "1",
    penaltyBase: "principal",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(Math.abs(result.penalty - 10000 * (0.2 / 365)) < 0.000001);
  assert.equal(result.warnings.length, 1);
});
