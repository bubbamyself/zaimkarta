import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { calculatorOgProtection } from "@/lib/calculator-og-protection";
import { getOfferDetails } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import type { PublicSharePageType } from "@/lib/public-page-share";

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

const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let fallbackImagePromise: Promise<Uint8Array> | null = null;

type PublicShareRequest = {
  pageType: PublicSharePageType;
  pageSlug: string;
};

function getFallbackImage() {
  fallbackImagePromise ??= readFile(
    join(process.cwd(), "public", "opengraph-image.png"),
  ).then((buffer) => new Uint8Array(buffer));
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

function parseRequest(url: URL): PublicShareRequest | null {
  const types = url.searchParams.getAll("type");
  const slugs = url.searchParams.getAll("slug");

  if (
    Array.from(url.searchParams.keys()).length !== 2 ||
    types.length !== 1 ||
    slugs.length !== 1 ||
    !["category", "offer"].includes(types[0]) ||
    slugs[0].length > 96 ||
    !SAFE_SLUG_PATTERN.test(slugs[0])
  ) {
    return null;
  }

  return {
    pageType: types[0] as PublicSharePageType,
    pageSlug: slugs[0],
  };
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function ImageFrame({
  eyebrow,
  children,
  footer,
}: {
  eyebrow: string;
  children: React.ReactNode;
  footer: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f0fdf4",
        color: "#0f172a",
        padding: "58px 68px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#047857", fontSize: 34, fontWeight: 700 }}>
          ZaimKarta
        </span>
        <span style={{ color: "#475569", fontSize: 24 }}>{eyebrow}</span>
      </div>
      {children}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "auto",
          color: "#475569",
          fontSize: 23,
        }}
      >
        <span>{footer}</span>
        <span>zaimkarta.ru</span>
      </div>
    </div>
  );
}

async function renderCategoryImage(pageSlug: string) {
  const page = await prisma.seoPage.findFirst({
    where: {
      slug: pageSlug,
      status: "PUBLISHED",
      pageType: "CATEGORY",
    },
    select: {
      h1: true,
      intro: true,
      description: true,
    },
  });

  if (!page) {
    return null;
  }

  const description = truncate(page.intro ?? page.description, 150);
  const title = truncate(page.h1, 72);

  return new ImageResponse(
    <ImageFrame
      eyebrow="Подборка займов"
      footer="Сравните условия и выберите подходящий вариант"
    >
      <div style={{ display: "flex", flexDirection: "column", marginTop: 58 }}>
        <div
          style={{
            display: "flex",
            maxWidth: 1040,
            fontSize: title.length > 48 ? 48 : 60,
            fontWeight: 700,
            lineHeight: 1.08,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 1000,
            marginTop: 28,
            color: "#334155",
            fontSize: 29,
            lineHeight: 1.35,
          }}
        >
          {description}
        </div>
      </div>
    </ImageFrame>,
    { width: 1200, height: 630 },
  );
}

async function renderOfferImage(pageSlug: string) {
  const offer = await getOfferDetails(pageSlug);

  if (!offer) {
    return null;
  }

  return new ImageResponse(
    <ImageFrame
      eyebrow="Условия предложения"
      footer="Перед оформлением проверьте условия договора"
    >
      <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
        <div
          style={{
            display: "flex",
            color: "#0f172a",
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          {truncate(offer.name, 44)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 30,
            color: "#065f46",
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          {offer.amount} · {offer.term}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            color: "#334155",
            fontSize: 30,
          }}
        >
          Ставка в день: {offer.rate} · рассмотрение: {offer.decisionTime}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            color: "#475569",
            fontSize: 25,
          }}
        >
          Решение принимает кредитор после проверки заявки
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

  const cacheKey = `public-share:${data.pageType}:${data.pageSlug}`;
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
    const imageResponse =
      data.pageType === "category"
        ? await renderCategoryImage(data.pageSlug)
        : await renderOfferImage(data.pageSlug);

    if (!imageResponse) {
      return fallbackResponse();
    }

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
