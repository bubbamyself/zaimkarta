/*
  Warnings:

  - You are about to drop the `Click` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Click" DROP CONSTRAINT "Click_affiliateOfferId_fkey";

-- DropForeignKey
ALTER TABLE "Click" DROP CONSTRAINT "Click_offerId_fkey";

-- DropTable
DROP TABLE "Click";

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "landingPageUrl" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferClick" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "affiliateOfferId" TEXT,
    "pageUrl" TEXT,
    "pageType" TEXT,
    "categorySlug" TEXT,
    "cardPosition" INTEGER,
    "redirectUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadId_key" ON "Lead"("leadId");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_leadId_idx" ON "Lead"("leadId");

-- CreateIndex
CREATE INDEX "OfferClick_leadId_idx" ON "OfferClick"("leadId");

-- CreateIndex
CREATE INDEX "OfferClick_offerId_idx" ON "OfferClick"("offerId");

-- CreateIndex
CREATE INDEX "OfferClick_affiliateOfferId_idx" ON "OfferClick"("affiliateOfferId");

-- CreateIndex
CREATE INDEX "OfferClick_createdAt_idx" ON "OfferClick"("createdAt");

-- CreateIndex
CREATE INDEX "OfferClick_categorySlug_idx" ON "OfferClick"("categorySlug");

-- AddForeignKey
ALTER TABLE "OfferClick" ADD CONSTRAINT "OfferClick_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferClick" ADD CONSTRAINT "OfferClick_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferClick" ADD CONSTRAINT "OfferClick_affiliateOfferId_fkey" FOREIGN KEY ("affiliateOfferId") REFERENCES "AffiliateOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
