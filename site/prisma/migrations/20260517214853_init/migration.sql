-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AffiliateNetwork" AS ENUM ('LEADS_SU', 'LEADGID', 'DIRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalTone" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "brandName" TEXT NOT NULL,
    "legalName" TEXT,
    "logoText" TEXT,
    "logoUrl" TEXT,
    "officialSite" TEXT,
    "shortDescription" TEXT,
    "badge" TEXT,
    "rating" DECIMAL(3,2),
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "minAmount" INTEGER,
    "maxAmount" INTEGER,
    "minTermDays" INTEGER,
    "maxTermDays" INTEGER,
    "dailyRateFrom" DECIMAL(5,2),
    "dailyRateTo" DECIMAL(5,2),
    "pskFrom" DECIMAL(6,2),
    "pskTo" DECIMAL(6,2),
    "approvalLabel" TEXT,
    "approvalTone" "ApprovalTone" NOT NULL DEFAULT 'MEDIUM',
    "decisionTime" TEXT,
    "payoutMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "repaymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "advantages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "legalDisclosure" TEXT,
    "updatedByUserAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateOffer" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "network" "AffiliateNetwork" NOT NULL,
    "networkOfferId" TEXT,
    "targetAction" TEXT,
    "payoutAmount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "holdDays" INTEGER,
    "reconciliationPeriod" TEXT,
    "geoIncluded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "geoExcluded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dailyCap" INTEGER,
    "monthlyCap" INTEGER,
    "allowedTrafficTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forbiddenTrafficTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trackingBaseUrl" TEXT NOT NULL,
    "trackingParamsTemplate" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Click" (
    "id" TEXT NOT NULL,
    "clickId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "affiliateOfferId" TEXT,
    "pageUrl" TEXT,
    "pageType" TEXT,
    "categorySlug" TEXT,
    "cardPosition" INTEGER,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "redirectUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_slug_key" ON "Offer"("slug");

-- CreateIndex
CREATE INDEX "AffiliateOffer_offerId_idx" ON "AffiliateOffer"("offerId");

-- CreateIndex
CREATE INDEX "AffiliateOffer_network_idx" ON "AffiliateOffer"("network");

-- CreateIndex
CREATE INDEX "AffiliateOffer_isActive_idx" ON "AffiliateOffer"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Click_clickId_key" ON "Click"("clickId");

-- CreateIndex
CREATE INDEX "Click_offerId_idx" ON "Click"("offerId");

-- CreateIndex
CREATE INDEX "Click_affiliateOfferId_idx" ON "Click"("affiliateOfferId");

-- CreateIndex
CREATE INDEX "Click_createdAt_idx" ON "Click"("createdAt");

-- CreateIndex
CREATE INDEX "Click_categorySlug_idx" ON "Click"("categorySlug");

-- AddForeignKey
ALTER TABLE "AffiliateOffer" ADD CONSTRAINT "AffiliateOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_affiliateOfferId_fkey" FOREIGN KEY ("affiliateOfferId") REFERENCES "AffiliateOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
