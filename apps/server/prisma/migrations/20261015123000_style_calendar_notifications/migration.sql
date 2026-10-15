ALTER TABLE "UserPreference"
  ADD COLUMN "preferredCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "preferredOccasions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "fitPreferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "preferredSeasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "styleDislikes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "budgetCurrency" CHAR(3),
  ADD COLUMN "budgetMax" DECIMAL(10,2),
  ADD COLUMN "weatherCity" VARCHAR(120);

ALTER TABLE "CalendarEvent"
  ADD COLUMN "eventType" VARCHAR(80),
  ADD COLUMN "timeZone" VARCHAR(80) NOT NULL DEFAULT 'UTC';

CREATE INDEX "CalendarEvent_userId_endsAt_idx" ON "CalendarEvent"("userId", "endsAt");

ALTER TABLE "Notification" ADD COLUMN "dedupeKey" VARCHAR(160);
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");
