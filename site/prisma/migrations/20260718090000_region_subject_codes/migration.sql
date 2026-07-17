UPDATE "Offer"
SET "restrictedRegionCodes" = array_replace(
  array_replace("restrictedRegionCodes", '95', '20'),
  '82',
  '91'
)
WHERE "restrictedRegionCodes" && ARRAY['95', '82']::TEXT[];
