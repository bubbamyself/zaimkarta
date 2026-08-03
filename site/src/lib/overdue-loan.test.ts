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
  assert.equal(result.overdueDailyRate, 0.8);
  assert.equal(result.overdueInterest, 560);
  assert.equal(result.penaltyDays, 7);
  assert.ok(
    result.assumptions.some(
      (item) =>
        item.field === "Ставка после просрочки" &&
        item.value === "такая же, как ставка за обычный срок",
    ),
  );
  assert.ok(
    result.assumptions.some(
      (item) =>
        item.field === "Частичные платежи" &&
        item.value === "считаем, что их не было",
    ),
  );
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

test("считает один календарный год, а не всегда 365 дней", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2024-01-01",
    termDaysValue: "366",
    plannedPaymentDateValue: "2026-01-01",
    dailyRateValue: "0.8",
    interestMode: "yes",
    partialPaymentsMode: "no",
    penaltyType: "annual",
    penaltyRateValue: "20",
    penaltyStartDayValue: "1",
    penaltyBase: "scheduled-payment",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.limitCheck.applies, true);
  assert.equal(result.estimatedTotal, 23000);
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

test("использует точную дату возврата из договора для процентов", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    exactDueDateValue: "2026-07-10",
    plannedPaymentDateValue: "2026-07-10",
    dailyRateValue: "0.8",
    interestMode: "no",
    partialPaymentsMode: "no",
    penaltyType: "daily",
    penaltyRateValue: "0.1",
    penaltyStartDayValue: "1",
    penaltyBase: "scheduled-payment",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.contractInterestDays, 9);
  assert.equal(result.contractInterest, 720);
  assert.equal(result.scheduledPayment, 10720);
  assert.ok(result.warnings.some((item) => item.includes("не совпадает")));
});

test("применяет отдельную ставку после наступления просрочки", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-15",
    dailyRateValue: "0.8",
    overdueDailyRateValue: "0.5",
    interestMode: "yes",
    partialPaymentsMode: "no",
    penaltyType: "daily",
    penaltyRateValue: "0",
    penaltyStartDayValue: "1",
    penaltyBase: "principal",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.overdueDailyRate, 0.5);
  assert.equal(result.overdueInterest, 350);
});

test("считает просрочку от остатка после частичных платежей", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-15",
    dailyRateValue: "0.8",
    overdueDailyRateValue: "0.8",
    interestMode: "yes",
    partialPaymentsMode: "yes",
    outstandingPrincipalValue: "4000",
    accruedInterestAtDueDateValue: "200",
    penaltyType: "daily",
    penaltyRateValue: "0.05",
    penaltyStartDayValue: "2",
    penaltyBase: "scheduled-payment",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.scheduledPayment, 4200);
  assert.equal(result.overdueInterest, 224);
  assert.ok(Math.abs(result.penalty - 12.6) < 0.000001);
  assert.ok(Math.abs(result.estimatedTotal - 4436.6) < 0.000001);
  assert.equal(result.limitCheck.applies, false);
});

test("для неустойки без процентов подставляет максимум 0,1% в день", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-09",
    dailyRateValue: "0.8",
    interestMode: "no",
    partialPaymentsMode: "no",
    penaltyType: "annual",
    penaltyRateValue: "",
    penaltyStartDayValue: "1",
    penaltyBase: "principal",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(Math.abs(result.penalty - 10) < 0.000001);
});

test("не применяет современные пределы к договору до 1 июля 2023 года", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2023-06-30",
    termDaysValue: "7",
    plannedPaymentDateValue: "2023-07-15",
    dailyRateValue: "0.8",
    interestMode: "yes",
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.ok(result.errors.some((item) => item.includes("с 1 июля 2023 года")));
});

test("предупреждает о расчётной дате возврата в выходной", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-03",
    termDaysValue: "1",
    plannedPaymentDateValue: "2026-07-04",
    dailyRateValue: "0.8",
    interestMode: "yes",
    partialPaymentsMode: "no",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.warnings.some((item) => item.includes("выходной")));
});

test("не считает досрочный платёж как расчёт просрочки", () => {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-07",
    dailyRateValue: "0.8",
    interestMode: "yes",
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.ok(result.errors.some((item) => item.includes("не раньше даты возврата")));
});
