import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type ArticleImport = {
  version: number;
  page: {
    slug: string;
    status: "PUBLISHED";
    pageType: "ARTICLE";
    intent: "INFORMATIONAL";
    title: string;
    description: string;
    h1: string;
    intro: string | null;
    content: string;
    contentBlocks: Prisma.InputJsonValue | null;
    riskNotice: string | null;
    editorNote: string | null;
    displayPriority: number;
    publishedAt: string;
    updatedByUserAt: string | null;
    createdAt: string;
  };
  offerLinks: Array<{
    offerSlug: string;
    position: number;
    badge: string | null;
    note: string | null;
    ctaText: string | null;
    highlight: boolean;
  }>;
  toolLinks: Array<{
    position: number;
    blockId: string;
    variant: "FULL" | "COMPACT" | "INLINE";
    title: string | null;
    intro: string | null;
    config: Prisma.InputJsonValue | null;
    tool: {
      slug: string;
      type:
        | "OVERPAYMENT_CALCULATOR"
        | "APPLICATION_CHECKLIST"
        | "MINI_OFFER_PICKER"
        | "LOAN_TYPE_QUIZ"
        | "COMPARISON";
      status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
      name: string;
      title: string;
      description: string | null;
      config: Prisma.InputJsonValue;
      defaultBlock: Prisma.InputJsonValue | null;
    };
  }>;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

function nullableJson(value: Prisma.InputJsonValue | null) {
  return value === null ? Prisma.DbNull : value;
}

async function readImport(): Promise<ArticleImport> {
  const importPath = resolve(
    process.cwd(),
    "content/imports/snowball-article.json",
  );
  const parsed = JSON.parse(await readFile(importPath, "utf8")) as ArticleImport;

  if (
    parsed.version !== 1 ||
    parsed.page.slug !== "snejnii-kom-kak-pogasit-dolgi" ||
    parsed.page.pageType !== "ARTICLE" ||
    parsed.page.status !== "PUBLISHED" ||
    !parsed.page.content
  ) {
    throw new Error("Snowball article import file has an unexpected format");
  }

  return parsed;
}

async function main() {
  const articleImport = await readImport();
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingPage = await prisma.seoPage.findUnique({
      where: { slug: articleImport.page.slug },
      select: { id: true },
    });
    const pageData = {
      status: articleImport.page.status,
      pageType: articleImport.page.pageType,
      intent: articleImport.page.intent,
      title: articleImport.page.title,
      description: articleImport.page.description,
      h1: articleImport.page.h1,
      intro: articleImport.page.intro,
      content: articleImport.page.content,
      contentBlocks: nullableJson(articleImport.page.contentBlocks),
      riskNotice: articleImport.page.riskNotice,
      editorNote: articleImport.page.editorNote,
      displayPriority: articleImport.page.displayPriority,
      publishedAt: new Date(articleImport.page.publishedAt),
      updatedByUserAt: articleImport.page.updatedByUserAt
        ? new Date(articleImport.page.updatedByUserAt)
        : null,
    };
    const page = await prisma.seoPage.upsert({
      where: { slug: articleImport.page.slug },
      update: pageData,
      create: {
        slug: articleImport.page.slug,
        ...pageData,
        createdAt: new Date(articleImport.page.createdAt),
      },
    });

    for (const link of articleImport.toolLinks) {
      const tool = await prisma.seoTool.upsert({
        where: { slug: link.tool.slug },
        update: {},
        create: {
          slug: link.tool.slug,
          type: link.tool.type,
          status: link.tool.status,
          name: link.tool.name,
          title: link.tool.title,
          description: link.tool.description,
          config: link.tool.config,
          defaultBlock: nullableJson(link.tool.defaultBlock),
        },
      });

      await prisma.seoPageTool.upsert({
        where: {
          pageId_blockId: {
            pageId: page.id,
            blockId: link.blockId,
          },
        },
        update: {
          toolId: tool.id,
          position: link.position,
          variant: link.variant,
          title: link.title,
          intro: link.intro,
          config: nullableJson(link.config),
        },
        create: {
          pageId: page.id,
          toolId: tool.id,
          position: link.position,
          blockId: link.blockId,
          variant: link.variant,
          title: link.title,
          intro: link.intro,
          config: nullableJson(link.config),
        },
      });
    }

    const offerSlugs = articleImport.offerLinks.map((link) => link.offerSlug);
    const existingOffers = await prisma.offer.findMany({
      where: { slug: { in: offerSlugs } },
      select: { id: true, slug: true },
    });
    const offersBySlug = new Map(
      existingOffers.map((offer) => [offer.slug, offer]),
    );

    for (const link of articleImport.offerLinks) {
      const offer = offersBySlug.get(link.offerSlug);

      if (!offer) {
        continue;
      }

      await prisma.seoPageOffer.upsert({
        where: {
          seoPageId_offerId: {
            seoPageId: page.id,
            offerId: offer.id,
          },
        },
        update: {
          position: link.position,
          badge: link.badge,
          note: link.note,
          ctaText: link.ctaText,
          highlight: link.highlight,
        },
        create: {
          seoPageId: page.id,
          offerId: offer.id,
          position: link.position,
          badge: link.badge,
          note: link.note,
          ctaText: link.ctaText,
          highlight: link.highlight,
        },
      });
    }

    const missingOfferSlugs = offerSlugs.filter(
      (slug) => !offersBySlug.has(slug),
    );
    console.log(
      `${existingPage ? "Updated" : "Created"} article: /${page.slug}`,
    );
    console.log(`Connected tools: ${articleImport.toolLinks.length}`);
    console.log(`Connected existing offers: ${existingOffers.length}`);

    if (missingOfferSlugs.length > 0) {
      console.warn(`Skipped missing offers: ${missingOfferSlugs.join(", ")}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
