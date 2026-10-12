-- CreateIndex
CREATE INDEX "ClothingItem_userId_archived_updatedAt_idx" ON "ClothingItem"("userId", "archived", "updatedAt");

-- CreateIndex
CREATE INDEX "ClothingItem_userId_archived_category_idx" ON "ClothingItem"("userId", "archived", "category");
