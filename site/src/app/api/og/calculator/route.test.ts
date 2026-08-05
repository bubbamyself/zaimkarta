import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

function readPngSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

test("валидный запрос возвращает динамический PNG 1200 × 630 с безопасными headers", async () => {
  const response = await GET(
    new Request(
      "http://localhost:3000/api/og/calculator?tool=overpayment&share=1&v=1&amount=15000&term=20&rate=0.8",
      { headers: { "x-real-ip": "192.0.2.10" } },
    ),
  );
  const bytes = new Uint8Array(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(response.headers.get("cache-control") ?? "", /max-age=86400/);
  assert.deepEqual(readPngSize(bytes), { width: 1200, height: 630 });
});

test("невалидный запрос возвращает статический fallback без 500", async () => {
  const response = await GET(
    new Request(
      "http://localhost:3000/api/og/calculator?tool=repayment_date&share=1&v=1&start=2026-02-30&term=30",
    ),
  );
  const bytes = new Uint8Array(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /max-age=3600/);
  assert.deepEqual(readPngSize(bytes), { width: 1200, height: 630 });
});

test("произвольный внешний URL не влияет на нормализованный результат", async () => {
  const base =
    "http://localhost:3000/api/og/calculator?tool=repayment_date&share=1&v=1&start=2026-08-05&term=30";
  const first = await GET(new Request(base, { headers: { "x-real-ip": "192.0.2.11" } }));
  const second = await GET(
    new Request(`${base}&url=https%3A%2F%2Fevil.example`, {
      headers: { "x-real-ip": "192.0.2.12" },
    }),
  );

  assert.deepEqual(
    new Uint8Array(await first.arrayBuffer()),
    new Uint8Array(await second.arrayBuffer()),
  );
});
