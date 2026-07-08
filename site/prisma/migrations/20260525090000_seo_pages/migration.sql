CREATE TYPE "SeoPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

CREATE TYPE "SeoPageType" AS ENUM ('CATEGORY', 'ARTICLE', 'SERVICE');

CREATE TABLE "SeoPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "SeoPageStatus" NOT NULL DEFAULT 'DRAFT',
    "pageType" "SeoPageType" NOT NULL DEFAULT 'CATEGORY',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "h1" TEXT NOT NULL,
    "intro" TEXT,
    "content" TEXT,
    "riskNotice" TEXT,
    "editorNote" TEXT,
    "publishedAt" TIMESTAMP(3),
    "updatedByUserAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeoPageOffer" (
    "id" TEXT NOT NULL,
    "seoPageId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPageOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeoPageFaqItem" (
    "id" TEXT NOT NULL,
    "seoPageId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPageFaqItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeoPage_slug_key" ON "SeoPage"("slug");
CREATE INDEX "SeoPage_status_idx" ON "SeoPage"("status");
CREATE INDEX "SeoPage_pageType_idx" ON "SeoPage"("pageType");
CREATE UNIQUE INDEX "SeoPageOffer_seoPageId_offerId_key" ON "SeoPageOffer"("seoPageId", "offerId");
CREATE INDEX "SeoPageOffer_seoPageId_position_idx" ON "SeoPageOffer"("seoPageId", "position");
CREATE INDEX "SeoPageOffer_offerId_idx" ON "SeoPageOffer"("offerId");
CREATE INDEX "SeoPageFaqItem_seoPageId_position_idx" ON "SeoPageFaqItem"("seoPageId", "position");

ALTER TABLE "SeoPageOffer" ADD CONSTRAINT "SeoPageOffer_seoPageId_fkey" FOREIGN KEY ("seoPageId") REFERENCES "SeoPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoPageOffer" ADD CONSTRAINT "SeoPageOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoPageFaqItem" ADD CONSTRAINT "SeoPageFaqItem_seoPageId_fkey" FOREIGN KEY ("seoPageId") REFERENCES "SeoPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
