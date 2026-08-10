import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMetrikaOfflineEvents,
  METRIKA_OFFLINE_TARGETS,
} from "./metrika-offline-events";

const eventAt = new Date("2026-08-11T09:00:00.000Z");

test("первая pending-конверсия создаёт заявку и hold", () => {
  assert.deepEqual(
    buildMetrikaOfflineEvents({
      isNewConversion: true,
      normalizedStatus: "PENDING",
      payoutAmount: "0.00",
      currency: "RUB",
      eventAt,
    }).map((event) => event.target),
    [METRIKA_OFFLINE_TARGETS.conversion, METRIKA_OFFLINE_TARGETS.hold],
  );
});

test("approved получает выплату, остальные цели остаются без цены", () => {
  assert.deepEqual(
    buildMetrikaOfflineEvents({
      isNewConversion: false,
      normalizedStatus: "APPROVED",
      payoutAmount: "1250.50",
      currency: "RUB",
      eventAt,
    }),
    [
      {
        target: METRIKA_OFFLINE_TARGETS.approved,
        eventAt,
        price: "1250.50",
        currency: "RUB",
      },
    ],
  );
});

test("UNKNOWN не создаёт статусную офлайн-конверсию", () => {
  assert.deepEqual(
    buildMetrikaOfflineEvents({
      isNewConversion: false,
      normalizedStatus: "UNKNOWN",
      payoutAmount: "0.00",
      currency: "RUB",
      eventAt,
    }),
    [],
  );
});
