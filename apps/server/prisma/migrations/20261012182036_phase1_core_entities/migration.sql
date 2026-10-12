-- AlterTable
ALTER TABLE "ShoppingRecommendation" ADD COLUMN     "productId" TEXT;

-- CreateTable
CREATE TABLE "ClothingImage" (
    "id" TEXT NOT NULL,
    "clothingItemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "providerAssetId" TEXT,
    "altText" VARCHAR(240),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClothingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "source" VARCHAR(80) NOT NULL DEFAULT 'catalog',
    "sourceProductId" VARCHAR(200),
    "name" VARCHAR(160) NOT NULL,
    "brand" VARCHAR(100),
    "category" VARCHAR(80),
    "description" VARCHAR(2000),
    "imageUrl" TEXT,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOffer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "retailer" VARCHAR(100) NOT NULL,
    "retailerSku" VARCHAR(200),
    "productUrl" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "availability" VARCHAR(80),
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outfitId" TEXT,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "location" VARCHAR(240),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClothingImage_clothingItemId_createdAt_idx" ON "ClothingImage"("clothingItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClothingImage_clothingItemId_sortOrder_key" ON "ClothingImage"("clothingItemId", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_brand_category_idx" ON "Product"("brand", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Product_source_sourceProductId_key" ON "Product"("source", "sourceProductId");

-- CreateIndex
CREATE INDEX "ProductOffer_productId_price_idx" ON "ProductOffer"("productId", "price");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOffer_productId_retailer_productUrl_key" ON "ProductOffer"("productId", "retailer", "productUrl");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startsAt_idx" ON "CalendarEvent"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_outfitId_idx" ON "CalendarEvent"("outfitId");

-- CreateIndex
CREATE INDEX "ShoppingRecommendation_productId_idx" ON "ShoppingRecommendation"("productId");

-- AddForeignKey
ALTER TABLE "ClothingImage" ADD CONSTRAINT "ClothingImage_clothingItemId_fkey" FOREIGN KEY ("clothingItemId") REFERENCES "ClothingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspirationMatch" ADD CONSTRAINT "InspirationMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingRecommendation" ADD CONSTRAINT "ShoppingRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
