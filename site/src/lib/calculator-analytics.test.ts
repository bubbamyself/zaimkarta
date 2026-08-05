import assert from "node:assert/strict";
import test from "node:test";
import { getOffersCountBucket } from "./calculator-analytics";

test("группирует число коммерческих карточек без передачи точного значения", () => {
  assert.equal(getOffersCountBucket(0), "0");
  assert.equal(getOffersCountBucket(1), "1_3");
  assert.equal(getOffersCountBucket(3), "1_3");
  assert.equal(getOffersCountBucket(4), "4_plus");
});
