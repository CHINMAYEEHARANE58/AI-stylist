# Backend foundation

The API lives in `apps/server` and uses Express, TypeScript, Zod, Prisma, and PostgreSQL. Routes are versioned below `/api/v1`; controllers validate and coordinate requests, services contain reusable domain operations, and Prisma is the persistence boundary. New feature repositories should be added under `src/repositories` when they need reusable query patterns.

## PostgreSQL and environment

Create a local PostgreSQL database, then set `apps/server/.env` from the root `.env.example`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/closetai?schema=public"
```

`DATABASE_URL` is required for database-backed routes. It must never be committed. The health endpoint reports only `connected` or `unavailable`; it never returns the URL, credentials, or driver errors.

## Commands

From the repository root:

```bash
npm run db:generate --workspace closetai-server
npm run db:migrate --workspace closetai-server
npm run db:seed --workspace closetai-server
npm run dev --workspace closetai-server
npm run dev --workspace web
```

`db:migrate` creates/applies additive development migrations. Production deployments should run `npm run db:deploy --workspace closetai-server`. Never use `prisma migrate reset` against a database containing user data.

The seed command refuses every environment other than `NODE_ENV=development`. It creates the clearly marked `phase1.seed@closetai.test` account and sample wardrobe records, never real users or production data.

## Data ownership

Every private record has a `userId` relation with cascading deletion: wardrobe items, outfits, saved outfits, AI history/recommendations, inspirations/matches, shopping recommendations/wishlist entries, calendar events, notifications, profile/preferences, and future auth/session records. `OutfitItem` and `ClothingImage` belong to their parent private records. Catalog `Product` and `ProductOffer` records are shared and contain metadata/URLs only—image binaries are stored externally.

The schema uses explicit join models such as `OutfitItem`, `SavedOutfit`, and `WishlistItem`, unique constraints for provider accounts and product offers, indexed ownership/time query paths, `Decimal(10,2)` for money, and UTC `DateTime` fields throughout.

## Profile and account settings

All profile endpoints resolve ownership from the authenticated session; none accepts a user ID as authorization. Profile updates use strict Zod schemas so unknown fields are rejected. Profile and Settings load `GET /api/v1/profile` and may update basic details, style preferences, notification settings, and privacy settings through their allowlisted endpoints.

Password changes require the current password and revoke all refresh sessions. Email changes are intentionally separate from normal profile updates: a password-confirmed request creates a hashed, six-digit code for the proposed address; only a successful confirmation applies the address and then revokes sessions. Codes expire after 10 minutes, are rate-limited on resend, and allow five failed attempts. Account deletion requires both the current password and the literal `DELETE` confirmation before cascade deletion.

Avatar and wardrobe files are validated and sent to Cloudinary when `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are available. PostgreSQL retains only the resulting URL and metadata; uploads fail closed when storage is unavailable.

## Secure wardrobe image storage

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `apps/server/.env`; these credentials remain server-only. Wardrobe files are uploaded by the API using a server-generated random storage key—never a browser-provided path or unrestricted client credential. The API accepts only JPEG, PNG, and WebP after inspecting the actual file bytes, limits files to 10 MB, verifies safe dimensions, and rate-limits multipart upload requests.

Each primary image stores its provider asset ID, storage key, URL, MIME type, byte size, and dimensions in `ClothingImage`. Replacing an image writes the replacement first and only then removes the old provider asset; a failed upload leaves the item unchanged. Removing an image deletes its tracked primary asset and restores the local wardrobe placeholder. `IMAGE_STORAGE_VISIBILITY=private` deliberately fails closed until a signed private-delivery endpoint is configured, preventing accidental private-asset exposure.

## AI clothing analysis

`POST /api/v1/wardrobe/analyze-image` is authenticated and upload-rate-limited. It validates the actual image bytes before creating a server-side data URL for the configured vision provider. Responses are accepted only when they satisfy the strict Zod clothing-analysis schema, which does not allow identifiers, URLs, or ownership fields. Transient provider failures receive one bounded retry; timeouts, rate limits, malformed output, and unavailable configuration receive safe API errors.

Set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and a vision-capable `AI_VISION_MODEL` (for example, `gpt-4o`). `OPENAI_BASE_URL` can point to an OpenAI-compatible gateway. `AI_PROVIDER=mock` is development-only and must be selected explicitly. Validated non-sensitive analysis is cached by image SHA-256 plus provider/model for `AI_ANALYSIS_CACHE_MINUTES`; the original image is never put in this cache.

## AI outfit generation

`POST /api/v1/outfits/generate` is authenticated, origin-guarded, and rate-limited to 12 generation requests per 15 minutes. It loads only the caller's non-archived wardrobe items, applies selected season, occasion, aesthetic, and colour filters, and does not invoke the provider when fewer than two eligible items remain. The provider receives only clothing summaries and must return strict structured JSON. Each candidate is checked against a fresh ownership and availability query; any candidate containing an invented, foreign, deleted, or archived clothing ID is discarded whole.

Successful, validated generations are written to `AIStylingHistory`. They are not automatically saved as outfits. A separate explicit `POST /api/v1/outfits` call writes `Outfit`, `OutfitItem`, and `SavedOutfit`, after verifying every selected item belongs to the caller and remains available.

## Digital wardrobe

`ClothingItem` belongs to both its owner and that owner's wardrobe. Every list, read, update, archive, favorite, and delete operation scopes its Prisma query to the authenticated `userId`; guessing another item ID returns `404`. Item data includes category/subcategory, colours, material, pattern, seasons, occasions, aesthetics, brand, notes, image URL/provider reference, and timestamps. Associated `ClothingImage` records support additional external image references without storing binaries in PostgreSQL.

The wardrobe list validates pagination and sort fields, supports server-side search across name, brand, and notes, and filters by category, subcategory, colour, season, occasion, and aesthetics. The summary endpoint returns real counts for filter controls. Ownership/date/category indexes support the common list and summary paths.

## Health

`GET /api/v1/health` performs a safe `SELECT 1` readiness probe. It returns `200` and `database: "connected"` when PostgreSQL is reachable, or `503` and `database: "unavailable"` without exposing internal details when it is not.
