export const CALCULATOR_OG_LIMITS = {
  maxConcurrent: 4,
  perSourcePerMinute: 30,
  processPerMinute: 120,
  cacheEntries: 500,
  cacheTtlMs: 24 * 60 * 60 * 1000,
  sourceEntries: 2000,
};

type CacheEntry = {
  body: Uint8Array;
  expiresAt: number;
};

type RateEntry = {
  count: number;
  windowStartedAt: number;
};

export function createCalculatorOgProtection() {
  const cache = new Map<string, CacheEntry>();
  const sourceRates = new Map<string, RateEntry>();
  let processRate: RateEntry = { count: 0, windowStartedAt: 0 };
  let concurrent = 0;

  function getCached(key: string, now = Date.now()) {
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= now) {
      cache.delete(key);
      return null;
    }

    cache.delete(key);
    cache.set(key, entry);
    return entry.body;
  }

  function setCached(key: string, body: Uint8Array, now = Date.now()) {
    cache.delete(key);

    while (cache.size >= CALCULATOR_OG_LIMITS.cacheEntries) {
      const oldestKey = cache.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      cache.delete(oldestKey);
    }

    cache.set(key, {
      body,
      expiresAt: now + CALCULATOR_OG_LIMITS.cacheTtlMs,
    });
  }

  function normalizeRate(entry: RateEntry, now: number) {
    if (now - entry.windowStartedAt >= 60_000) {
      return { count: 0, windowStartedAt: now };
    }

    return entry;
  }

  function tryBegin(sourceHash: string, now = Date.now()) {
    processRate = normalizeRate(processRate, now);
    const sourceRate = normalizeRate(
      sourceRates.get(sourceHash) ?? { count: 0, windowStartedAt: now },
      now,
    );

    if (
      concurrent >= CALCULATOR_OG_LIMITS.maxConcurrent ||
      processRate.count >= CALCULATOR_OG_LIMITS.processPerMinute ||
      sourceRate.count >= CALCULATOR_OG_LIMITS.perSourcePerMinute
    ) {
      return false;
    }

    if (!sourceRates.has(sourceHash) && sourceRates.size >= CALCULATOR_OG_LIMITS.sourceEntries) {
      const oldestSource = sourceRates.keys().next().value;

      if (oldestSource !== undefined) {
        sourceRates.delete(oldestSource);
      }
    }

    sourceRate.count += 1;
    processRate.count += 1;
    sourceRates.delete(sourceHash);
    sourceRates.set(sourceHash, sourceRate);
    concurrent += 1;
    return true;
  }

  function finish() {
    concurrent = Math.max(0, concurrent - 1);
  }

  function snapshot() {
    return {
      cacheSize: cache.size,
      concurrent,
      processCount: processRate.count,
      sourceSize: sourceRates.size,
    };
  }

  return { finish, getCached, setCached, snapshot, tryBegin };
}

export const calculatorOgProtection = createCalculatorOgProtection();

export function isCalculatorOgQueryShapeSafe(searchParams: URLSearchParams) {
  const entries = Array.from(searchParams.entries());

  return (
    entries.length <= 8 &&
    entries.every(([key, value]) => key.length <= 32 && value.length <= 64)
  );
}
