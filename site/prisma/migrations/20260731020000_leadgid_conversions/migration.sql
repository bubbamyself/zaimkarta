-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('NEW', 'PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConversionEventType" AS ENUM ('NEW', 'STATUS_UPDATE', 'PAYOUT_UPDATE', 'STATUS_AND_PAYOUT_UPDATE');

-- CreateTable
CREATE TABLE "AffiliateConversion" (
    "id" TEXT NOT NULL,
    "network" "AffiliateNetwork" NOT NULL DEFAULT 'LEADGID',
    "externalConversionId" TEXT NOT NULL,
    "networkTransactionId" TEXT,
    "offerClickId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "networkOfferId" TEXT,
    "rawStatus" TEXT NOT NULL,
    "normalizedStatus" "ConversionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "payoutAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateConversionEvent" (
    "id" TEXT NOT NULL,
    "conversionId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "eventType" "ConversionEventType" NOT NULL,
    "rawStatus" TEXT NOT NULL,
    "normalizedStatus" "ConversionStatus" NOT NULL,
    "payoutAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateConversion_network_externalConversionId_key" ON "AffiliateConversion"("network", "externalConversionId");

-- CreateIndex
CREATE INDEX "AffiliateConversion_offerClickId_idx" ON "AffiliateConversion"("offerClickId");

-- CreateIndex
CREATE INDEX "AffiliateConversion_offerId_createdAt_idx" ON "AffiliateConversion"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateConversion_normalizedStatus_createdAt_idx" ON "AffiliateConversion"("normalizedStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateConversionEvent_eventKey_key" ON "AffiliateConversionEvent"("eventKey");

-- CreateIndex
CREATE INDEX "AffiliateConversionEvent_conversionId_receivedAt_idx" ON "AffiliateConversionEvent"("conversionId", "receivedAt");

-- CreateIndex
CREATE INDEX "AffiliateConversionEvent_receivedAt_idx" ON "AffiliateConversionEvent"("receivedAt");

-- AddForeignKey
ALTER TABLE "AffiliateConversion" ADD CONSTRAINT "AffiliateConversion_offerClickId_fkey" FOREIGN KEY ("offerClickId") REFERENCES "OfferClick"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateConversion" ADD CONSTRAINT "AffiliateConversion_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateConversionEvent" ADD CONSTRAINT "AffiliateConversionEvent_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "AffiliateConversion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
