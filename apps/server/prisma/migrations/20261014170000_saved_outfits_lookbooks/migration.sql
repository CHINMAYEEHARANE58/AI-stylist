-- Preserve a readable outfit item even if its source clothing item is removed.
-- Backfill existing relationships before requiring the saved snapshot fields.
ALTER TABLE "OutfitItem"
  ADD COLUMN "snapshotName" VARCHAR(160),
  ADD COLUMN "snapshotCategory" VARCHAR(80);

UPDATE "OutfitItem" AS oi
SET "snapshotName" = ci."name",
    "snapshotCategory" = ci."category"
FROM "ClothingItem" AS ci
WHERE oi."clothingItemId" = ci."id";

ALTER TABLE "OutfitItem"
  ALTER COLUMN "snapshotName" SET NOT NULL,
  ALTER COLUMN "snapshotCategory" SET NOT NULL,
  ALTER COLUMN "clothingItemId" DROP NOT NULL;

ALTER TABLE "OutfitItem" DROP CONSTRAINT "OutfitItem_clothingItemId_fkey";
ALTER TABLE "OutfitItem"
  ADD CONSTRAINT "OutfitItem_clothingItemId_fkey"
  FOREIGN KEY ("clothingItemId") REFERENCES "ClothingItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SavedOutfit" ADD COLUMN "notes" VARCHAR(1000);
