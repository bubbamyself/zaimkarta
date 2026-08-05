import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  getOverpaymentSharePreview,
  getRepaymentSharePreview,
  parseOverpaymentShareParams,
  parseRepaymentShareParams,
  type CalculatorShareData,
} from "@/lib/calculator-share";
import {
  calculatorOgProtection,
  isCalculatorOgQueryShapeSafe,
} from "@/lib/calculator-og-protection";

export const runtime = "nodejs";

const IMAGE_HEADERS = {
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  "Content-Type": "image/png",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

const FALLBACK_HEADERS = {
  ...IMAGE_HEADERS,
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

let fallbackImagePromise: Promise<Uint8Array> | null = null;

function getFallbackImage() {
  fallbackImagePromise ??= readFile(
    join(process.cwd(), "src", "app", "opengraph-image.png"),
  )
    .then((buffer) => new Uint8Array(buffer))
    .catch(async () => {
      const response = new ImageResponse(
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#f0fdf4",
            color: "#0f172a",
            padding: "68px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div style={{ display: "flex", color: "#047857", fontSize: 36 }}>
            ZaimKarta
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 56, fontWeight: 700 }}>
            Калькуляторы займов
          </div>
          <div style={{ display: "flex", marginTop: 20, color: "#475569", fontSize: 28 }}>
            Рассчитайте свой вариант и проверьте условия договора
          </div>
        </div>,
        { width: 1200, height: 630 },
      );

      return new Uint8Array(await response.arrayBuffer());
    });
  return fallbackImagePromise;
}

async function fallbackResponse() {
  const body = await getFallbackImage();

  return new Response(Uint8Array.from(body).buffer, {
    status: 200,
    headers: FALLBACK_HEADERS,
  });
}

function getSourceHash(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const source =
    request.headers.get("cf-connecting-ip")?.trim() ||
    forwardedFor ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  return createHash("sha256").update(source).digest("hex").slice(0, 24);
}

function parseRequest(url: URL): CalculatorShareData | null {
  const tools = url.searchParams.getAll("tool");

  if (tools.length !== 1 || !isCalculatorOgQueryShapeSafe(url.searchParams)) {
    return null;
  }

  if (tools[0] === "repayment_date") {
    return parseRepaymentShareParams(url.searchParams);
  }

  if (tools[0] === "overpayment") {
    return parseOverpaymentShareParams(url.searchParams);
  }

  return null;
}

function getCacheKey(data: CalculatorShareData) {
  return data.tool === "repayment_date"
    ? `repayment_date:${data.start}:${data.term}`
    : `overpayment:${data.amount}:${data.term}:${data.rate}`;
}

function ImageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        background: "#f0fdf4",
        color: "#0f172a",
        padding: "58px 68px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", color: "#047857", fontSize: 34, fontWeight: 700 }}>
        ZaimKarta
      </div>
      {children}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "auto",
          color: "#475569",
          fontSize: 24,
        }}
      >
        <span>Расчёт ориентировочный — проверьте договор</span>
        <span>zaimkarta.ru</span>
      </div>
    </div>
  );
}

function renderImage(data: CalculatorShareData) {
  if (data.tool === "repayment_date") {
    const preview = getRepaymentSharePreview(data, "https://zaimkarta.ru");

    return new ImageResponse(
      <ImageFrame>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#334155", fontSize: 34 }}>
            Вернуть займ ориентировочно
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 64, fontWeight: 700 }}>
            {preview.image.repaymentDate}
          </div>
          <div style={{ display: "flex", marginTop: 24, color: "#334155", fontSize: 30 }}>
            Срок: {preview.image.term} · {preview.image.weekday}
          </div>
        </div>
      </ImageFrame>,
      { width: 1200, height: 630 },
    );
  }

  const preview = getOverpaymentSharePreview(data, "https://zaimkarta.ru");

  return new ImageResponse(
    <ImageFrame>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>
          {preview.image.amountAndTerm}
        </div>
        <div style={{ display: "flex", marginTop: 20, color: "#065f46", fontSize: 42 }}>
          Вернуть: {preview.image.totalReturn}
        </div>
        <div style={{ display: "flex", marginTop: 12, color: "#334155", fontSize: 30 }}>
          Переплата: {preview.image.overpayment} · около {preview.image.dailyCost} в день
        </div>
        <div style={{ display: "flex", marginTop: 14, color: "#475569", fontSize: 24 }}>
          Расчёт при ставке {preview.image.dailyRate}% в день
        </div>
      </div>
    </ImageFrame>,
    { width: 1200, height: 630 },
  );
}

export async function GET(request: Request) {
  const data = parseRequest(new URL(request.url));

  if (!data) {
    return fallbackResponse();
  }

  const cacheKey = getCacheKey(data);
  const cached = calculatorOgProtection.getCached(cacheKey);

  if (cached) {
    return new Response(Uint8Array.from(cached).buffer, {
      status: 200,
      headers: IMAGE_HEADERS,
    });
  }

  if (!calculatorOgProtection.tryBegin(getSourceHash(request))) {
    return fallbackResponse();
  }

  try {
    const imageResponse = renderImage(data);
    const body = new Uint8Array(await imageResponse.arrayBuffer());
    calculatorOgProtection.setCached(cacheKey, body);
    return new Response(Uint8Array.from(body).buffer, {
      status: 200,
      headers: IMAGE_HEADERS,
    });
  } catch {
    return fallbackResponse();
  } finally {
    calculatorOgProtection.finish();
  }
}
