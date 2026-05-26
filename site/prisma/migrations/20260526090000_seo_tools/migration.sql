CREATE TYPE "SeoToolStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

CREATE TYPE "SeoToolType" AS ENUM ('OVERPAYMENT_CALCULATOR', 'APPLICATION_CHECKLIST', 'MINI_OFFER_PICKER', 'LOAN_TYPE_QUIZ', 'COMPARISON');

CREATE TYPE "SeoToolVariant" AS ENUM ('FULL', 'COMPACT', 'INLINE');

CREATE TYPE "SeoPageIntent" AS ENUM ('COMMERCIAL', 'INFORMATIONAL', 'SERVICE', 'MIXED');

ALTER TABLE "SeoPage" ADD COLUMN "intent" "SeoPageIntent";
ALTER TABLE "SeoPage" ADD COLUMN "contentBlocks" JSONB;

ALTER TABLE "SeoPageOffer" ADD COLUMN "badge" TEXT;
ALTER TABLE "SeoPageOffer" ADD COLUMN "note" TEXT;
ALTER TABLE "SeoPageOffer" ADD COLUMN "ctaText" TEXT;
ALTER TABLE "SeoPageOffer" ADD COLUMN "highlight" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SeoTool" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "SeoToolType" NOT NULL,
    "status" "SeoToolStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "defaultBlock" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoTool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeoPageTool" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 100,
    "blockId" TEXT,
    "variant" "SeoToolVariant" NOT NULL DEFAULT 'FULL',
    "title" TEXT,
    "intro" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPageTool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeoTool_slug_key" ON "SeoTool"("slug");
CREATE INDEX "SeoTool_type_idx" ON "SeoTool"("type");
CREATE INDEX "SeoTool_status_idx" ON "SeoTool"("status");
CREATE INDEX "SeoPageTool_pageId_position_idx" ON "SeoPageTool"("pageId", "position");
CREATE INDEX "SeoPageTool_toolId_idx" ON "SeoPageTool"("toolId");
CREATE UNIQUE INDEX "SeoPageTool_pageId_blockId_key" ON "SeoPageTool"("pageId", "blockId");

ALTER TABLE "SeoPageTool" ADD CONSTRAINT "SeoPageTool_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SeoPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoPageTool" ADD CONSTRAINT "SeoPageTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "SeoTool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
