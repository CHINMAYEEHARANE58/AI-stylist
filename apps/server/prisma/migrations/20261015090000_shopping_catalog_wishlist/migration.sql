-- Preserve legacy recommendations while linking new recommendations to canonical products.
ALTER TABLE "Product" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ShoppingRecommendation" ADD COLUMN "signals" JSONB;

CREATE UNIQUE INDEX "ShoppingRecommendation_userId_productId_key"
  ON "ShoppingRecommendation"("userId", "productId");
CREATE UNIQUE INDEX "ShoppingRecommendation_id_userId_key"
  ON "ShoppingRecommendation"("id", "userId");

-- A wishlist row can only reference a recommendation owned by that same user.
ALTER TABLE "WishlistItem" DROP CONSTRAINT "WishlistItem_shoppingRecommendationId_fkey";
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_shoppingRecommendationId_userId_fkey"
  FOREIGN KEY ("shoppingRecommendationId", "userId")
  REFERENCES "ShoppingRecommendation"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
