ALTER TABLE "InspirationImage"
  ADD COLUMN "storageProvider" VARCHAR(20),
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "contentType" VARCHAR(40),
  ADD COLUMN "byteSize" INTEGER,
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER,
  ADD COLUMN "imageHash" CHAR(64);

ALTER TABLE "InspirationMatch"
  ADD COLUMN "matchMethod" VARCHAR(40) NOT NULL DEFAULT 'attribute-v1';
