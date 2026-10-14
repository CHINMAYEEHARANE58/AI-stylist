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

`POST /api/v1/outfits/style-item` uses the same authentication, origin guard, and generation rate limit. Request JSON: `{ "itemId": "...", "aesthetics": ["Casual"], "occasion": "Office", "season": "Summer" }`, with the latter three fields optional. The anchor must be a non-archived item owned by the authenticated user; no user ID is accepted from the client. Compatible same-user companions are filtered by season and occasion before inference. The provider returns strictly validated looks with exact clothing IDs and a styling explanation. The server queries current records again, requires the anchor exactly once, and rejects any complete look containing an unavailable, invented, or foreign ID. Successful generation records validated history but does not save an outfit; `POST /api/v1/outfits` saves only when requested. An empty eligible set returns a helpful empty response without calling AI.

Successful, validated generations are written to `AIStylingHistory`. They are not automatically saved as outfits. A separate explicit `POST /api/v1/outfits` call writes `Outfit`, `OutfitItem`, and `SavedOutfit`, after verifying every selected item belongs to the caller and remains available.

## Saved outfits and lookbooks

Saving is transactional: the authenticated user must still own every non-archived clothing item, then the API writes `Outfit`, ordered `OutfitItem` rows, and one `SavedOutfit` row together. The client never supplies an owner ID. `GET /api/v1/outfits/saved` supports validated pagination, title/explanation/personal-note/item-name search, collection/occasion/aesthetic/favorite filters, and saved-date/title/edit-date sorting. `GET /api/v1/outfits/saved/:id`, `PATCH /api/v1/outfits/saved/:id`, and `DELETE /api/v1/outfits/saved/:id` all scope the lookup to the authenticated user; the patch permits only title, personal notes, and lookbook name. `GET /api/v1/outfits/collections` groups the caller's saved records into named lookbooks. Browser storage is not used as a saved-outfit source of truth.

Deletion policy: each `OutfitItem` records its clothing name and category at save time. A migration backfills existing joins, makes `clothingItemId` nullable, and uses `ON DELETE SET NULL`. Deleting a wardrobe item therefore leaves a readable historical outfit with an unavailable-piece label and no dangling foreign key. Cloud image cleanup still follows the wardrobe deletion flow; the outfit does not retain an image URL that might become invalid. Removing a saved outfit removes only its `SavedOutfit` association, leaving the underlying `Outfit` for other references such as calendar events. Use `npm run db:migrate --workspace closetai-server` in development or `npm run db:deploy --workspace closetai-server` in deployment before starting the updated backend.

## AI Chat Stylist

`POST /api/v1/stylist/chat` accepts a trimmed `message` of 1–1000 characters and an optional owned `conversationId`. Client-supplied history, user IDs, and unknown fields are rejected. The route has a 16 KB body cap, a per-user 10-request/minute limiter, and a durable 100-successful-reply rolling-24-hour limit. The existing `AI_REQUEST_TIMEOUT_MS` controls provider timeouts. The backend loads only the authenticated user's non-archived wardrobe and saved color/aesthetic preferences, ranks relevant items, sends at most 60 item summaries and the most recent 12 stored messages to the server-side provider, and never sends another user's wardrobe. The provider must return strict structured JSON: a short reply, at most three outfits with actual item IDs, optional generic shopping ideas, and follow-up prompts. Every ID is validated against the submitted context and then re-queried for ownership/availability before any answer is stored. Invented, foreign, archived, duplicate, or deleted references fail safely. Shopping ideas are explicitly separate from owned items and are not fake catalog offers.

`StylistConversation` and `StylistMessage` store private, user-owned chat with timestamps. `GET /api/v1/stylist/conversations` lists up to 50 recent conversations; `GET /api/v1/stylist/conversations/:id` returns the most recent 100 messages and resolves saved item references against current owned wardrobe records, labeling removed pieces unavailable. `DELETE /api/v1/stylist/conversations/:id` permanently deletes the conversation and cascades its messages. A conversation is capped at 200 messages; start a new one after that. Chats are retained until the user deletes them or deletes the account—there is no undisclosed automatic expiry. `AIStylingHistory` stores only usage metadata (conversation ID and counts), never raw prompts or replies; it remains after a conversation is deleted so deletion cannot reset the daily usage limit. Account deletion cascades both chat content and usage metadata. Avoid logging chat bodies and provider output. Only an explicitly selected development mock can reply without a real key, and it is visibly labeled; otherwise an unconfigured provider returns 503.

## Pinterest inspiration

`POST /api/v1/inspiration/analyze` accepts one authenticated multipart `image` (JPEG, PNG, or WebP, maximum 10 MB). Upload and AI requests are rate-limited. The server checks file bytes and dimensions, fully decodes the image with Sharp, auto-rotates it, strips source metadata, and stores a bounded WebP copy. The vision provider receives only a server-created image data URL and must return strict Zod-validated garment categories, colors, patterns, silhouettes, layers, accessories, and aesthetic. The provider receives no wardrobe IDs and cannot choose matches. Provider failures or malformed output do not persist the image. If database persistence fails after storage, the new asset is cleaned up.

The backend then queries only the current authenticated user's non-archived `ClothingItem` records and applies deterministic category/color/pattern/silhouette/aesthetic weights. The resulting `attribute-v1` score is an approximate attribute-coverage heuristic, **not** an embedding or exact visual-similarity score. Missing garment categories are listed separately. `InspirationImage` stores only the storage reference/metadata and validated analysis; `InspirationMatch` stores the score, matched item IDs with name snapshots, missing pieces, and recreation explanation. Detail reads re-check item ownership and current availability, so deleted or archived pieces are labeled unavailable. The browser never supplies an owner ID.

Set `INSPIRATION_STORAGE_PROVIDER=local` only for single-machine development. Private files are written under `apps/server/.local-uploads` by default (or `INSPIRATION_LOCAL_DIR`), with server-generated keys and owner-checked `GET /api/v1/inspiration/:id/image`; the directory is Git-ignored and should not be exposed by a static file server. Production should use `INSPIRATION_STORAGE_PROVIDER=cloudinary` with all three `CLOUDINARY_*` credentials. Inspiration uploads use Cloudinary's **authenticated** delivery type; the owner-checked image endpoint issues a short-lived signed delivery URL. This setting is separate from wardrobe/avatar `IMAGE_STORAGE_VISIBILITY`. No Cloudinary or real AI credentials are present in the development environment, so local testing uses private disk storage and the explicitly labeled `AI_PROVIDER=mock` fixture. Configure `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and a vision-capable `AI_VISION_MODEL` for real image understanding. Private image bytes are transmitted to that configured provider for analysis.

`GET /api/v1/inspiration?page=1` lists saved records, `GET /api/v1/inspiration/:id` returns a saved analysis, and `DELETE /api/v1/inspiration/:id` removes the record and its asset. All routes require authentication; mutation routes enforce the configured browser origin. Raw Pinterest URL import is intentionally rejected until an authorized official integration is available. Existing legacy URL-only rows remain in the database but must be re-uploaded to use owner-checked image delivery and the new validated analysis shape.

## Digital wardrobe

`ClothingItem` belongs to both its owner and that owner's wardrobe. Every list, read, update, archive, favorite, and delete operation scopes its Prisma query to the authenticated `userId`; guessing another item ID returns `404`. Item data includes category/subcategory, colours, material, pattern, seasons, occasions, aesthetics, brand, notes, image URL/provider reference, and timestamps. Associated `ClothingImage` records support additional external image references without storing binaries in PostgreSQL.

The wardrobe list validates pagination and sort fields, supports server-side search across name, brand, and notes, and filters by category, subcategory, colour, season, occasion, and aesthetics. The summary endpoint returns real counts for filter controls. Ownership/date/category indexes support the common list and summary paths.

## Health

`GET /api/v1/health` performs a safe `SELECT 1` readiness probe. It returns `200` and `database: "connected"` when PostgreSQL is reachable, or `503` and `database: "unavailable"` without exposing internal details when it is not.
