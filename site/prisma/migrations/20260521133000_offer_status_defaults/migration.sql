UPDATE "Offer"
SET "status" = 'PAUSED'
WHERE "status" = 'DRAFT';

ALTER TABLE "Offer"
ALTER COLUMN "status" SET DEFAULT 'PAUSED';

