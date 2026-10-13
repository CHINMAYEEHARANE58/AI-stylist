-- AlterTable
ALTER TABLE "ClothingItem" ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "fit" VARCHAR(80),
ADD COLUMN     "silhouette" VARCHAR(80);

-- CreateTable
CREATE TABLE "ClothingAnalysisCache" (
    "id" TEXT NOT NULL,
    "imageHash" CHAR(64) NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "analysis" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClothingAnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClothingAnalysisCache_expiresAt_idx" ON "ClothingAnalysisCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClothingAnalysisCache_imageHash_provider_model_key" ON "ClothingAnalysisCache"("imageHash", "provider", "model");
