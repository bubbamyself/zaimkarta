CREATE TYPE "OfferDisplayVariant" AS ENUM ('standard', 'promo_zero');

ALTER TABLE "Offer"
ADD COLUMN "promoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promoTitle" TEXT,
ADD COLUMN "promoDailyRate" DECIMAL(5,2),
ADD COLUMN "promoPsk" DECIMAL(6,2),
ADD COLUMN "promoMinAmount" INTEGER,
ADD COLUMN "promoMaxAmount" INTEGER,
ADD COLUMN "promoZeroTermDays" INTEGER,
ADD COLUMN "promoNewClientsOnly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "promoConditions" TEXT,
ADD COLUMN "promoLateConsequences" TEXT,
ADD COLUMN "promoPaidServices" TEXT,
ADD COLUMN "promoSourceUrl" TEXT,
ADD COLUMN "promoCheckedAt" TIMESTAMP(3);

ALTER TABLE "SeoPageOffer"
ADD COLUMN "usePromo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OfferClick"
ADD COLUMN "displayVariant" "OfferDisplayVariant" NOT NULL DEFAULT 'standard';

CREATE INDEX "OfferClick_displayVariant_createdAt_idx"
ON "OfferClick"("displayVariant", "createdAt");
