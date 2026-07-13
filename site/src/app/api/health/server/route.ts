import { readFile } from "node:fs/promises";

const HEALTH_MARKER_FILE = "/tmp/zaimkarta-health-ok";
const MAX_MARKER_AGE_MS = 12 * 60 * 1000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "text/plain; charset=utf-8",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET() {
  try {
    const rawTimestamp = await readFile(HEALTH_MARKER_FILE, "utf8");
    const timestampMs = Number(rawTimestamp.trim()) * 1000;
    const ageMs = Date.now() - timestampMs;

    if (
      Number.isSafeInteger(timestampMs) &&
      ageMs >= 0 &&
      ageMs <= MAX_MARKER_AGE_MS
    ) {
      return new Response("ok\n", {
        status: 200,
        headers: responseHeaders,
      });
    }
  } catch {
    // Отсутствующий marker означает, что серверная проверка не подтверждена.
  }

  return new Response("unavailable\n", {
    status: 503,
    headers: responseHeaders,
  });
}
