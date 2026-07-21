ALTER TABLE "SeoPageFaqItem" ADD COLUMN "linkedSeoPageId" TEXT;

CREATE INDEX "SeoPageFaqItem_linkedSeoPageId_idx" ON "SeoPageFaqItem"("linkedSeoPageId");

ALTER TABLE "SeoPageFaqItem"
  ADD CONSTRAINT "SeoPageFaqItem_linkedSeoPageId_fkey"
  FOREIGN KEY ("linkedSeoPageId") REFERENCES "SeoPage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
