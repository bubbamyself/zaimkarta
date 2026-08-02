export type RepaymentDateResult =
  | {
      ok: true;
      startDate: Date;
      repaymentDate: Date;
      termDays: number;
      daysUntil: number;
      isPast: boolean;
      isToday: boolean;
      isWeekend: boolean;
    }
  | {
      ok: false;
      error: string;
    };

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseLocalInputDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toLocalInputDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addCalendarDays(date: Date, days: number) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);

  return result;
}

export function calculateRepaymentDate({
  startDateValue,
  termDaysValue,
  minTermDays,
  maxTermDays,
  today = new Date(),
}: {
  startDateValue: string;
  termDaysValue: string;
  minTermDays: number;
  maxTermDays: number;
  today?: Date;
}): RepaymentDateResult {
  const startDate = parseLocalInputDate(startDateValue);

  if (!startDate) {
    return {
      ok: false,
      error: "Укажите дату получения займа.",
    };
  }

  if (!/^\d+$/.test(termDaysValue.trim())) {
    return {
      ok: false,
      error: "Срок займа должен быть целым числом дней.",
    };
  }

  const termDays = Number(termDaysValue);

  if (termDays < minTermDays || termDays > maxTermDays) {
    return {
      ok: false,
      error: `Укажите срок от ${minTermDays} до ${maxTermDays} дней.`,
    };
  }

  const repaymentDate = addCalendarDays(startDate, termDays);
  const todayDate = startOfLocalDay(today);
  const repaymentDay = startOfLocalDay(repaymentDate);
  const daysUntil = Math.round(
    (repaymentDay.getTime() - todayDate.getTime()) / 86_400_000,
  );
  const weekday = repaymentDate.getDay();

  return {
    ok: true,
    startDate,
    repaymentDate,
    termDays,
    daysUntil,
    isPast: daysUntil < 0,
    isToday: daysUntil === 0,
    isWeekend: weekday === 0 || weekday === 6,
  };
}
