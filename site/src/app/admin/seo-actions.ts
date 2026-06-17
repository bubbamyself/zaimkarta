"use server";

import { Prisma } from "@prisma/client";
import type {
  SeoPageIntent,
  SeoPageStatus,
  SeoPageType,
  SeoToolVariant,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const SEO_PAGE_STATUSES: SeoPageStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "ARCHIVED",
];
const SEO_PAGE_TYPES: SeoPageType[] = ["CATEGORY", "ARTICLE", "SERVICE"];
const SEO_PAGE_INTENTS: SeoPageIntent[] = [
  "COMMERCIAL",
  "INFORMATIONAL",
  "SERVICE",
  "MIXED",
];
const SEO_TOOL_VARIANTS: SeoToolVariant[] = ["FULL", "COMPACT", "INLINE"];

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: T[],
  fallback: T,
) {
  const value = readString(formData, key) as T;
  return allowed.includes(value) ? value : fallback;
}

function readPositiveInt(formData: FormData, key: string, fallback: number) {
  const value = Number(readString(formData, key));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalJsonObject(value: string, label: string) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== "object") {
      throw new Error();
    }

    return parsed;
  } catch {
    throw new Error(`${label}: нужен валидный JSON`);
  }
}

function parseOptionalJsonValue(value: string, label: string) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label}: нужен валидный JSON`);
  }
}

function readOptionalNumberFromList(values: string[], index: number) {
  const rawValue = values[index]?.trim() ?? "";

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) ? value : null;
}

function mergeJsonRecords(base: unknown, override: unknown) {
  if (!base || typeof base !== "object" || Array.isArray(base)) {
    return override;
  }

  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return base;
  }

  return {
    ...(base as Record<string, unknown>),
    ...(override as Record<string, unknown>),
  };
}

function validateSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug должен быть латиницей в формате primer-stranicy");
  }
}

function hasForbiddenPromise(text: string) {
  const normalized = text.toLocaleLowerCase("ru-RU");

  return [
    /100\s*%\s*одобр/,
    /гарантированн/,
    /деньги\s+всем/,
    /одобр[а-яё]*\s+всем/,
    /без\s+отказа\s+(?:кажд|всем|гарант|получ|одобр|выдад|дадут)/,
  ].some((pattern) => pattern.test(normalized));
}

function hasReadableText(value: string | null) {
  if (!value) {
    return false;
  }

  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;
}

async function requireSeoManager() {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Недостаточно прав для управления SEO-страницами");
  }

  return session;
}

function collectSeoPageData(formData: FormData) {
  const slug = readString(formData, "slug");
  const statusFromField = readEnum(formData, "status", SEO_PAGE_STATUSES, "DRAFT");
  const status = readOptionalString(formData, "submitStatus")
    ? readEnum(formData, "submitStatus", SEO_PAGE_STATUSES, statusFromField)
    : statusFromField;
  const pageType = readEnum(formData, "pageType", SEO_PAGE_TYPES, "CATEGORY");
  const manualContentBlocks = parseOptionalJsonValue(
    readString(formData, "contentBlocks"),
    "Content blocks",
  );

  validateSlug(slug);

  return {
    slug,
    status,
    pageType,
    intent: readOptionalString(formData, "intent")
      ? readEnum(formData, "intent", SEO_PAGE_INTENTS, "MIXED")
      : null,
    title: readString(formData, "title"),
    description: readString(formData, "description"),
    h1: readString(formData, "h1"),
    intro: readOptionalString(formData, "intro"),
    content: readOptionalString(formData, "content"),
    contentBlocks:
      pageType === "CATEGORY"
        ? buildCategoryContentBlocks(formData, manualContentBlocks)
        : manualContentBlocks,
    riskNotice: readOptionalString(formData, "riskNotice"),
    editorNote: readOptionalString(formData, "editorNote"),
    displayPriority: readPositiveInt(formData, "displayPriority", 100),
    updatedByUserAt: readOptionalDate(formData, "updatedByUserAt") ?? new Date(),
  };
}

function buildCategoryContentBlocks(formData: FormData, manualContentBlocks: unknown) {
  const managedBlockIds = new Set([
    "category-criterion",
    "category-main-cta",
    "category-pre-offers",
    "category-post-offers",
  ]);
  const blocks = Array.isArray(manualContentBlocks)
    ? manualContentBlocks.filter((block) => {
        if (!block || typeof block !== "object" || Array.isArray(block)) {
          return false;
        }

        const id = String((block as { id?: unknown }).id ?? "");

        return !managedBlockIds.has(id);
      })
    : [];
  const criterion = readOptionalString(formData, "categoryCriterion");
  const ctaText = readOptionalString(formData, "categoryCtaText");
  const ctaUrl = readOptionalString(formData, "categoryCtaUrl");
  const preOffersText = readOptionalString(formData, "categoryPreOffersText");
  const postOffersText = readOptionalString(formData, "categoryPostOffersText");

  return [
    ...(criterion
      ? [
          {
            id: "category-criterion",
            type: "callout",
            tone: "info",
            title: "Почему эти офферы в подборке",
            text: criterion,
          },
        ]
      : []),
    ...(ctaText
      ? [
          {
            id: "category-main-cta",
            type: "cta",
            href: ctaUrl ?? "",
            ctaText,
          },
        ]
      : []),
    ...(preOffersText
      ? [
          {
            id: "category-pre-offers",
            type: "paragraph",
            text: preOffersText,
          },
        ]
      : []),
    ...blocks,
    ...(postOffersText
      ? [
          {
            id: "category-post-offers",
            type: "paragraph",
            text: postOffersText,
          },
        ]
      : []),
  ];
}

function collectToolBlocks(contentBlocks: unknown) {
  if (!Array.isArray(contentBlocks)) {
    return [];
  }

  return contentBlocks
    .filter((block) => block && typeof block === "object" && !Array.isArray(block))
    .filter((block) => (block as { type?: string }).type === "tool")
    .map((block) => String((block as { blockId?: unknown }).blockId ?? "").trim())
    .filter(Boolean);
}

async function validateSeoPagePublication(
  data: ReturnType<typeof collectSeoPageData>,
  pageTools: ReturnType<typeof collectPageToolLinks>,
  offerLinks: ReturnType<typeof collectOfferLinks>,
) {
  if (data.status !== "PUBLISHED") {
    return;
  }

  const missingFields: string[] = [];

  if (!data.slug) missingFields.push("Slug");
  if (!data.title) missingFields.push("Title");
  if (!data.description) missingFields.push("Description");
  if (!data.h1) missingFields.push("H1");
  if (!data.intro) missingFields.push("Intro");
  if (!data.riskNotice) missingFields.push("Предупреждение о рисках");
  if (
    data.pageType === "ARTICLE" &&
    !hasReadableText(data.content) &&
    (!Array.isArray(data.contentBlocks) || data.contentBlocks.length === 0)
  ) {
    missingFields.push("Основной текст статьи");
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Нельзя опубликовать страницу. Заполни поля: ${missingFields.join(", ")}.`,
    );
  }

  const publicText = [
    data.title,
    data.description,
    data.h1,
    data.intro,
    data.content,
    data.riskNotice,
    JSON.stringify(data.contentBlocks ?? ""),
    ...offerLinks.flatMap((item) => [item.badge, item.note, item.ctaText]),
  ]
    .filter(Boolean)
    .join("\n");

  if (hasForbiddenPromise(publicText)) {
    throw new Error(
      "В тексте есть рискованные обещания вроде «100% одобрение», «гарантированно», «деньги всем» или «без отказа» как обещание. Смягчи формулировку перед публикацией.",
    );
  }

  const toolIds = pageTools.map((item) => item.toolId);
  const activeTools = toolIds.length
    ? await prisma.seoTool.findMany({
        where: {
          id: {
            in: toolIds,
          },
        },
        select: {
          id: true,
          status: true,
        },
      })
    : [];
  const activeToolIds = new Set(
    activeTools.filter((tool) => tool.status === "ACTIVE").map((tool) => tool.id),
  );

  if (pageTools.some((item) => !activeToolIds.has(item.toolId))) {
    throw new Error(
      "Опубликованная страница не может использовать черновые, архивные или остановленные инструменты.",
    );
  }

  const connectedBlockIds = new Set(
    pageTools.map((item) => item.blockId).filter(Boolean),
  );
  const missingBlockLinks = collectToolBlocks(data.contentBlocks).filter(
    (blockId) => !connectedBlockIds.has(blockId),
  );

  if (missingBlockLinks.length > 0) {
    throw new Error(
      `Для tool-блоков нет подключенных инструментов: ${missingBlockLinks.join(", ")}.`,
    );
  }

  if (data.pageType === "SERVICE" && !pageTools.some((item) => activeToolIds.has(item.toolId))) {
    throw new Error("SERVICE-страница должна иметь хотя бы один активный инструмент.");
  }

  if (data.pageType === "CATEGORY") {
    if (offerLinks.length === 0) {
      throw new Error("Подборку нельзя опубликовать без выбранных офферов.");
    }

    const selectedOffers = await prisma.offer.findMany({
      where: {
        id: {
          in: offerLinks.map((item) => item.offerId),
        },
      },
      select: {
        id: true,
        brandName: true,
        status: true,
        affiliateOffers: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            trackingBaseUrl: true,
          },
          take: 1,
        },
      },
    });
    const offersById = new Map(selectedOffers.map((offer) => [offer.id, offer]));
    const unavailableOffers = offerLinks
      .map((item) => offersById.get(item.offerId))
      .filter(
        (offer) =>
          !offer ||
          offer.status !== "ACTIVE" ||
          offer.affiliateOffers.length === 0 ||
          !offer.affiliateOffers.at(0)?.trackingBaseUrl,
      );

    if (unavailableOffers.length > 0) {
      throw new Error(
        `Подборку нельзя опубликовать: у выбранных офферов нет ACTIVE-статуса или активной CPA-ссылки (${unavailableOffers
          .map((offer) => offer?.brandName ?? "неизвестный оффер")
          .join(", ")}).`,
      );
    }
  }
}

function collectOfferLinks(formData: FormData) {
  return formData
    .getAll("offerId")
    .map((value, index) => {
      const offerId = String(value);

      return {
        offerId,
        position: readPositiveInt(formData, `offerPosition:${offerId}`, index + 1),
        badge: readOptionalString(formData, `offerBadge:${offerId}`),
        note: readOptionalString(formData, `offerNote:${offerId}`),
        ctaText: readOptionalString(formData, `offerCtaText:${offerId}`),
        highlight: readString(formData, `offerHighlight:${offerId}`) === "on",
      };
    })
    .filter((item) => item.offerId.length > 0)
    .sort((first, second) => first.position - second.position);
}

function collectFaqItems(formData: FormData) {
  const questions = formData.getAll("faqQuestion").map((value) => String(value).trim());
  const answers = formData.getAll("faqAnswer").map((value) => String(value).trim());
  const positions = formData.getAll("faqPosition").map((value) => String(value).trim());

  return questions
    .map((question, index) => ({
      question,
      answer: answers[index] ?? "",
      position:
        Number.isInteger(Number(positions[index])) && Number(positions[index]) > 0
          ? Number(positions[index])
          : index + 1,
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0)
    .sort((first, second) => first.position - second.position);
}

function collectPageToolLinks(formData: FormData) {
  const toolIds = formData
    .getAll("pageToolToolId")
    .map((value) => String(value).trim());
  const positions = formData
    .getAll("pageToolPosition")
    .map((value) => String(value).trim());
  const variants = formData
    .getAll("pageToolVariant")
    .map((value) => String(value).trim());
  const blockIds = formData
    .getAll("pageToolBlockId")
    .map((value) => String(value).trim());
  const titles = formData
    .getAll("pageToolTitle")
    .map((value) => String(value).trim());
  const intros = formData
    .getAll("pageToolIntro")
    .map((value) => String(value).trim());
  const configs = formData
    .getAll("pageToolConfig")
    .map((value) => String(value).trim());
  const ctaTexts = formData
    .getAll("pageToolCtaText")
    .map((value) => String(value).trim());
  const riskNotices = formData
    .getAll("pageToolRiskNotice")
    .map((value) => String(value).trim());
  const defaultAmounts = formData
    .getAll("pageToolDefaultAmount")
    .map((value) => String(value).trim());
  const defaultTerms = formData
    .getAll("pageToolDefaultTermDays")
    .map((value) => String(value).trim());
  const defaultRates = formData
    .getAll("pageToolDefaultDailyRate")
    .map((value) => String(value).trim());

  return toolIds
    .map((toolId, index) => {
      const defaults: Record<string, number> = {};
      const amount = readOptionalNumberFromList(defaultAmounts, index);
      const termDays = readOptionalNumberFromList(defaultTerms, index);
      const dailyRate = readOptionalNumberFromList(defaultRates, index);

      if (amount !== null) defaults.amount = amount;
      if (termDays !== null) defaults.termDays = termDays;
      if (dailyRate !== null) defaults.dailyRate = dailyRate;

      const managedConfig = {
        ...(Object.keys(defaults).length > 0 ? { defaults } : {}),
        ...(ctaTexts[index] ? { cta: { text: ctaTexts[index], target: "offers" } } : {}),
        ...(riskNotices[index]
          ? { riskNotice: { text: riskNotices[index] } }
          : {}),
      };
      const advancedConfig = parseOptionalJsonObject(
        configs[index] ?? "",
        `Config override инструмента ${index + 1}`,
      );

      return {
        toolId,
        position:
          Number.isInteger(Number(positions[index])) && Number(positions[index]) > 0
            ? Number(positions[index])
            : index + 1,
        variant: SEO_TOOL_VARIANTS.includes(variants[index] as SeoToolVariant)
          ? (variants[index] as SeoToolVariant)
          : "FULL",
        blockId: blockIds[index] || `tool-${index + 1}`,
        title: titles[index] || null,
        intro: intros[index] || null,
        config:
          Object.keys(managedConfig).length > 0 || advancedConfig
            ? mergeJsonRecords(managedConfig, advancedConfig)
            : null,
      };
    })
    .filter((item) => item.toolId.length > 0)
    .sort((first, second) => first.position - second.position);
}

function buildServiceContentBlocks(pageTools: ReturnType<typeof collectPageToolLinks>) {
  const primaryTool = pageTools[0];

  if (!primaryTool) {
    return null;
  }

  return [
    {
      id: "tool-1",
      type: "tool",
      blockId: primaryTool.blockId,
    },
    {
      id: "offers-1",
      type: "offers",
      title: "Предложения по теме",
    },
    {
      id: "faq-1",
      type: "faq",
    },
    {
      id: "risk-1",
      type: "riskNotice",
    },
  ];
}

async function replaceSeoPageRelations(seoPageId: string, formData: FormData) {
  const offerLinks = collectOfferLinks(formData);
  const faqItems = collectFaqItems(formData);
  const pageToolLinks = collectPageToolLinks(formData);

  await prisma.$transaction([
    prisma.seoPageOffer.deleteMany({
      where: {
        seoPageId,
      },
    }),
    prisma.seoPageFaqItem.deleteMany({
      where: {
        seoPageId,
      },
    }),
    prisma.seoPageTool.deleteMany({
      where: {
        pageId: seoPageId,
      },
    }),
    ...(offerLinks.length > 0
      ? [
          prisma.seoPageOffer.createMany({
            data: offerLinks.map((item) => ({
              seoPageId,
              offerId: item.offerId,
              position: item.position,
              badge: item.badge,
              note: item.note,
              ctaText: item.ctaText,
              highlight: item.highlight,
            })),
          }),
        ]
      : []),
    ...(faqItems.length > 0
      ? [
          prisma.seoPageFaqItem.createMany({
            data: faqItems.map((item) => ({
              seoPageId,
              question: item.question,
              answer: item.answer,
              position: item.position,
            })),
          }),
        ]
      : []),
    ...(pageToolLinks.length > 0
      ? [
          prisma.seoPageTool.createMany({
            data: pageToolLinks.map((item) => ({
              pageId: seoPageId,
              toolId: item.toolId,
              position: item.position,
              blockId: item.blockId,
              variant: item.variant,
              title: item.title,
              intro: item.intro,
              config: item.config
                ? (item.config as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            })),
          }),
        ]
      : []),
  ]);
}

export async function createSeoPage(formData: FormData) {
  await requireSeoManager();

  const seoPageData = collectSeoPageData(formData);
  const pageToolLinks = collectPageToolLinks(formData);
  const offerLinks = collectOfferLinks(formData);
  if (seoPageData.pageType === "SERVICE" && !seoPageData.contentBlocks) {
    seoPageData.contentBlocks = buildServiceContentBlocks(pageToolLinks);
  }
  await validateSeoPagePublication(seoPageData, pageToolLinks, offerLinks);

  const seoPage = await prisma.seoPage.create({
    data: {
      ...seoPageData,
      publishedAt: seoPageData.status === "PUBLISHED" ? new Date() : null,
    },
  });

  await replaceSeoPageRelations(seoPage.id, formData);

  revalidatePath("/");
  revalidatePath(`/${seoPage.slug}`);
  revalidatePath("/admin");
  redirect(`/admin/seo/${seoPage.id}?saved=1`);
}

export async function updateSeoPage(formData: FormData) {
  await requireSeoManager();

  const seoPageId = readString(formData, "seoPageId");
  const seoPageData = collectSeoPageData(formData);
  const pageToolLinks = collectPageToolLinks(formData);
  const offerLinks = collectOfferLinks(formData);
  if (seoPageData.pageType === "SERVICE" && !seoPageData.contentBlocks) {
    seoPageData.contentBlocks = buildServiceContentBlocks(pageToolLinks);
  }
  await validateSeoPagePublication(seoPageData, pageToolLinks, offerLinks);

  if (!seoPageId) {
    throw new Error("Не найден ID SEO-страницы");
  }

  const currentPage = await prisma.seoPage.findUnique({
    where: {
      id: seoPageId,
    },
  });

  if (!currentPage) {
    throw new Error("SEO-страница не найдена");
  }

  await prisma.seoPage.update({
    where: {
      id: seoPageId,
    },
    data: {
      ...seoPageData,
      publishedAt:
        seoPageData.status === "PUBLISHED"
          ? (currentPage.publishedAt ?? new Date())
          : currentPage.publishedAt,
    },
  });

  await replaceSeoPageRelations(seoPageId, formData);

  revalidatePath("/");
  revalidatePath(`/${currentPage.slug}`);
  revalidatePath(`/${seoPageData.slug}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/seo/${seoPageId}`);
  redirect(`/admin/seo/${seoPageId}?saved=1`);
}

export async function updateSeoPageDisplayOrder(
  pageType: SeoPageType,
  seoPageIds: string[],
) {
  await requireSeoManager();

  if (!SEO_PAGE_TYPES.includes(pageType)) {
    throw new Error("Некорректный тип SEO-страницы");
  }

  const uniqueSeoPageIds = Array.from(new Set(seoPageIds)).filter(Boolean);

  if (uniqueSeoPageIds.length === 0) {
    return;
  }

  await prisma.$transaction(
    uniqueSeoPageIds.map((seoPageId, index) =>
      prisma.seoPage.update({
        where: {
          id: seoPageId,
          pageType,
        },
        data: {
          displayPriority: index + 1,
          updatedByUserAt: new Date(),
        },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/services");
  revalidatePath("/admin");
}
