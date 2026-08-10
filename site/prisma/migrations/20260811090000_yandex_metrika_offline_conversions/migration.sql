-- Store the consented Yandex Metrika visitor identifier only on the internal click.
ALTER TABLE "OfferClick" ADD COLUMN "metrikaClientId" TEXT;

CREATE TYPE "MetrikaOfflineConversionStatus" AS ENUM (
  'PENDING',
  'UPLOADED',
  'PROCESSED',
  'SKIPPED',
  'FAILED'
);

CREATE TABLE "MetrikaOfflineConversion" (
  "id" TEXT NOT NULL,
  "affiliateConversionId" TEXT NOT NULL,
  "offerClickId" TEXT NOT NULL,
  "clientId" TEXT,
  "target" TEXT NOT NULL,
  "eventAt" TIMESTAMP(3) NOT NULL,
  "price" DECIMAL(12,2),
  "currency" TEXT,
  "status" "MetrikaOfflineConversionStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "uploadId" TEXT,
  "sentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MetrikaOfflineConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetrikaOfflineConversion_affiliateConversionId_target_key"
ON "MetrikaOfflineConversion"("affiliateConversionId", "target");
CREATE INDEX "MetrikaOfflineConversion_status_nextAttemptAt_idx"
ON "MetrikaOfflineConversion"("status", "nextAttemptAt");
CREATE INDEX "MetrikaOfflineConversion_uploadId_idx"
ON "MetrikaOfflineConversion"("uploadId");
CREATE INDEX "MetrikaOfflineConversion_eventAt_idx"
ON "MetrikaOfflineConversion"("eventAt");

ALTER TABLE "MetrikaOfflineConversion"
ADD CONSTRAINT "MetrikaOfflineConversion_affiliateConversionId_fkey"
FOREIGN KEY ("affiliateConversionId") REFERENCES "AffiliateConversion"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MetrikaOfflineConversion"
ADD CONSTRAINT "MetrikaOfflineConversion_offerClickId_fkey"
FOREIGN KEY ("offerClickId") REFERENCES "OfferClick"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
