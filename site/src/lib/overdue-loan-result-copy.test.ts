import assert from "node:assert/strict";
import test from "node:test";
import { calculateOverdueLoan } from "./overdue-loan";
import { getOverdueLoanResultCopy } from "./overdue-loan-result-copy";

function calculate(overrides: Partial<Parameters<typeof calculateOverdueLoan>[0]> = {}) {
  const result = calculateOverdueLoan({
    loanAmountValue: "10000",
    receivedDateValue: "2026-07-01",
    termDaysValue: "7",
    plannedPaymentDateValue: "2026-07-15",
    dailyRateValue: "0.8",
    overdueDailyRateValue: "0.8",
    interestMode: "yes",
    partialPaymentsMode: "no",
    penaltyType: "daily",
    penaltyRateValue: "0.05",
    penaltyStartDayValue: "2",
    penaltyBase: "scheduled-payment",
    ...overrides,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result;
}

test("формирует основной ответ без допущений", () => {
  const copy = getOverdueLoanResultCopy({
    result: calculate(),
    contractDataComplete: true,
  });
  const text = copy.paragraphs.join(" ");

  assert.match(text, /Просрочка составляет 7 дней/);
  assert.doesNotMatch(text, /\{[^}]+\}|undefined|null|NaN/);
});

test("сообщает о допущениях без утверждения точной суммы", () => {
  const copy = getOverdueLoanResultCopy({
    result: calculate({
      dailyRateValue: "",
      overdueDailyRateValue: "",
      interestMode: "",
      partialPaymentsMode: "",
      penaltyType: "",
      penaltyRateValue: "",
      penaltyStartDayValue: "",
      penaltyBase: "",
    }),
    contractDataComplete: false,
  });

  assert.match(copy.paragraphs.join(" "), /может составить/);
  assert.match(copy.paragraphs.join(" "), /допущения/);
});

test("не называет нулевое число дней просроченным долгом", () => {
  const copy = getOverdueLoanResultCopy({
    result: calculate({ plannedPaymentDateValue: "2026-07-08" }),
    contractDataComplete: true,
  });

  assert.match(copy.paragraphs[0], /просрочка не образуется/);
  assert.doesNotMatch(copy.paragraphs.join(" "), /Просрочка составляет/);
});

test("сохраняет предупреждение о частичных платежах", () => {
  const copy = getOverdueLoanResultCopy({
    result: calculate({
      partialPaymentsMode: "yes",
      outstandingPrincipalValue: "4000",
      accruedInterestAtDueDateValue: "200",
    }),
    contractDataComplete: true,
  });

  assert.match(copy.warning ?? "", /полная история начислений и платежей/);
});
