ALTER TABLE "Offer" ADD COLUMN "replacementOfferId" TEXT;

CREATE INDEX "Offer_replacementOfferId_idx" ON "Offer"("replacementOfferId");

ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_replacementOfferId_fkey"
  FOREIGN KEY ("replacementOfferId") REFERENCES "Offer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
