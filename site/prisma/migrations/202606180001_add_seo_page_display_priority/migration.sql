ALTER TABLE "SeoPage" ADD COLUMN "displayPriority" INTEGER NOT NULL DEFAULT 100;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "pageType"
      ORDER BY COALESCE("publishedAt", "createdAt") ASC, "createdAt" ASC
    ) AS position
  FROM "SeoPage"
)
UPDATE "SeoPage"
SET "displayPriority" = ranked.position
FROM ranked
WHERE "SeoPage".id = ranked.id;
