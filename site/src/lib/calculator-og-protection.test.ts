import assert from "node:assert/strict";
import test from "node:test";
import {
  CALCULATOR_OG_LIMITS,
  createCalculatorOgProtection,
  isCalculatorOgQueryShapeSafe,
} from "./calculator-og-protection";

test("ограничивает одновременные генерации и освобождает слот", () => {
  const protection = createCalculatorOgProtection();

  for (let index = 0; index < CALCULATOR_OG_LIMITS.maxConcurrent; index += 1) {
    assert.equal(protection.tryBegin(`source-${index}`, 1), true);
  }
  assert.equal(protection.tryBegin("overflow", 1), false);
  protection.finish();
  assert.equal(protection.tryBegin("after-release", 1), true);
});

test("ограничивает источник и процесс в минутном окне", () => {
  const sourceProtection = createCalculatorOgProtection();

  for (let index = 0; index < CALCULATOR_OG_LIMITS.perSourcePerMinute; index += 1) {
    assert.equal(sourceProtection.tryBegin("same", 1), true);
    sourceProtection.finish();
  }
  assert.equal(sourceProtection.tryBegin("same", 1), false);
  assert.equal(sourceProtection.tryBegin("same", 60_001), true);

  const processProtection = createCalculatorOgProtection();
  for (let index = 0; index < CALCULATOR_OG_LIMITS.processPerMinute; index += 1) {
    assert.equal(processProtection.tryBegin(`source-${index}`, 1), true);
    processProtection.finish();
  }
  assert.equal(processProtection.tryBegin("overflow", 1), false);
});

test("cache ограничен, имеет TTL и обновляет одинаковый ключ", () => {
  const protection = createCalculatorOgProtection();
  const body = new Uint8Array([137, 80, 78, 71]);

  for (let index = 0; index <= CALCULATOR_OG_LIMITS.cacheEntries; index += 1) {
    protection.setCached(`key-${index}`, body, 1);
  }
  assert.equal(protection.snapshot().cacheSize, CALCULATOR_OG_LIMITS.cacheEntries);
  assert.equal(protection.getCached("key-0", 2), null);
  assert.deepEqual(protection.getCached("key-500", 2), body);
  assert.equal(
    protection.getCached("key-500", CALCULATOR_OG_LIMITS.cacheTtlMs + 2),
    null,
  );
});

test("отклоняет слишком длинные и многочисленные query-параметры", () => {
  assert.equal(
    isCalculatorOgQueryShapeSafe(new URLSearchParams("tool=overpayment&share=1&v=1")),
    true,
  );
  assert.equal(
    isCalculatorOgQueryShapeSafe(new URLSearchParams(`tool=${"x".repeat(65)}`)),
    false,
  );
  assert.equal(
    isCalculatorOgQueryShapeSafe(
      new URLSearchParams(Array.from({ length: 9 }, (_, index) => [`p${index}`, "1"])),
    ),
    false,
  );
});
