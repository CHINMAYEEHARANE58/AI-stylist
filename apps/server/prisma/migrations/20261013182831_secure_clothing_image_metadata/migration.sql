-- AlterTable
ALTER TABLE "ClothingImage" ADD COLUMN     "byteSize" INTEGER,
ADD COLUMN     "contentType" VARCHAR(40),
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "width" INTEGER;
