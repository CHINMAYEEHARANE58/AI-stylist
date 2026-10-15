ALTER TABLE "ProductOffer" ADD COLUMN "provider" VARCHAR(80) NOT NULL DEFAULT 'legacy';
ALTER TABLE "ProductOffer" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "ProductOffer_productId_observedAt_idx"
  ON "ProductOffer"("productId", "observedAt");
