# ClosetAI

ClosetAI is a modern AI-powered fashion styling platform that helps users digitize their wardrobe, generate outfits from clothes they already own, recreate Pinterest-inspired looks, and receive AI-assisted shopping recommendations with price comparison.

## Stack

- Frontend: Next.js, React, Tailwind CSS, Framer Motion, Zustand
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma
- Auth: password sign-up with email verification, secure cookie sessions, password resets, and optional Google OAuth
- AI placeholders: outfit generation, wardrobe tagging, Pinterest matching, shopping recommendations

## Project Structure

```text
.
├── apps
│   ├── server
│   │   └── src
│   │       ├── config
│   │       ├── controllers
│   │       ├── data
│   │       ├── middleware
│   │       ├── models
│   │       ├── routes
│   │       ├── services
│   │       └── utils
│   └── web
│       ├── app
│       ├── components
│       ├── lib
│       ├── public
│       └── store
├── .env.example
└── package.json
```

## Features Included

- Premium landing page with animated hero, feature grid, carousel, testimonials, and footer
- Auth flows for sign up, six-digit email verification, login, password reset, logout, persistent sessions, and Google sign-in
- Digital wardrobe interface with search, favorites, upload/scan prompts, and item styling actions
- AI outfit generator with occasion, weather, anchor-item, and chat stylist interactions
- Pinterest-inspired outfit recreation studio with similarity matching and missing-piece suggestions
- AI shopping assistant with wardrobe gap notes and cross-store price comparison
- Personalized AI style profile with insights and visual analytics
- Weather-based styling endpoint placeholder
- Persistent saved outfits and user-named lookbooks, plus onboarding tutorial, notifications, and mobile bottom navigation
- Style-around-item panels with casual, elegant, office, and party alternatives
- Outfit rating, social sharing, saved image, and lookbook export controls
- Wardrobe analysis for clothing types, colors, patterns, aesthetics, gaps, and usage insights
- Fashion trend insights and seasonal recommendations matched to the user's style DNA
- Admin dashboard for analytics, moderation, and recommendation monitoring

## Environment Variables

Copy the root example file and update it. The backend reads its environment from `apps/server/.env`; the frontend reads `apps/web/.env.local`.

```bash
cp .env.example apps/server/.env
```

Required keys:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/closetai?schema=public
JWT_SECRET=replace-with-a-random-32-plus-character-secret
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

For local development, email verification and reset links are printed only to the server console when `NODE_ENV=development` and no Resend credentials are configured. In production, configure both `EMAIL_FROM` and `RESEND_API_KEY`; the API deliberately fails closed instead of pretending to send an email.

To enable Google, register the callback URL `http://localhost:4000/api/v1/auth/google/callback` with Google and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`. Production values must use your HTTPS application URLs. The authorization flow uses state and PKCE.

For PostgreSQL setup, migrations, development-only seed data, and the backend structure, see [Backend foundation](docs/backend-foundation.md).

## Getting Started

Install dependencies:

```bash
npm install --cache .npm-cache
npm run db:migrate --workspace closetai-server
```

Run the frontend and backend together:

```bash
npm run dev
```

Frontend:

- [http://localhost:3000](http://localhost:3000)

Backend:

- [http://localhost:4000](http://localhost:4000)
- [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

## Useful Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run seed
npm run test --workspace closetai-server
npm run lint --workspace closetai-server
```

## API Overview

Auth:

- `POST /api/v1/auth/signup` — creates an unverified account and sends a six-digit code
- `POST /api/v1/auth/verify-email` and `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/google` and `GET /api/v1/auth/google/callback`

Wardrobe:

- `GET /api/v1/wardrobe` — authenticated, paginated list with server-side search, filters, and sorting
- `POST /api/v1/wardrobe`, `GET/PATCH/DELETE /api/v1/wardrobe/:id`
- `POST /api/v1/wardrobe/:id/favorite` and `/archive`
- `GET /api/v1/wardrobe/summary` — real filter/dashboard counts
- `POST /api/v1/wardrobe/analyze-image`

Outfits:

- `POST /api/v1/outfits/generate` — rate-limited, authenticated generation from eligible non-archived wardrobe items
- `POST /api/v1/outfits/style-item` — authenticated, rate-limited looks around an owned anchor item; accepts optional `aesthetics` (up to four), `occasion`, and `season`
- `POST /api/v1/outfits` — explicitly saves a reviewed outfit; generation never saves it automatically
- `GET /api/v1/outfits/saved` — owned, paginated saved outfits with search, occasion/aesthetic/favorite/lookbook filters and saved-date/title/edit-date sorting
- `GET/PATCH/DELETE /api/v1/outfits/saved/:id` — owned details, name/personal-note/lookbook updates, and removal from saved looks
- `GET /api/v1/outfits/collections` — actual lookbook names and counts

## AI clothing analysis

The wardrobe upload screen sends the selected JPEG, PNG, or WebP to the backend, where its real bytes and dimensions are validated before it is sent to the configured vision provider. The browser never receives or uses an AI provider credential. ClosetAI validates the provider's JSON response with a strict schema, then presents it as editable suggestions; only the user's confirmed item details are saved.

Set these variables in `apps/server/.env` to enable real analysis:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
AI_VISION_MODEL=gpt-4o
# Optional: an OpenAI-compatible server-side endpoint, such as a configured gateway
OPENAI_BASE_URL=https://api.openai.com/v1
```

`AI_PROVIDER=mock` is intentionally limited to development and visibly represents non-real analysis. Without a provider key, analysis returns a safe configuration error rather than fabricated labels. Results are cached by a SHA-256 hash of the validated image for `AI_ANALYSIS_CACHE_MINUTES` (24 hours by default); images themselves are not stored in this cache.

Outfit generation uses the same server-only provider configuration. The API submits only the requesting user's eligible, non-archived clothing summaries. Provider output must satisfy a strict schema, and each proposed item ID is checked again against the user's current database records before it can be shown. A candidate containing a foreign, deleted, archived, or invented ID is discarded as a whole. Generation history is retained in `AIStylingHistory`; `Outfit`, `OutfitItem`, and `SavedOutfit` records are created only after the user chooses **Save**.

Style This Item follows the same provider setup. Open an item from Wardrobe, select aesthetics and optionally an occasion or season, then regenerate to apply those filters. The API verifies the anchor belongs to the caller, excludes archived items, and sends only eligible same-user items to the provider. Each returned look must include the anchor exactly once, contain at least one companion, and use currently owned/available IDs. Invalid whole looks are rejected; generation history stores only validated looks. Save writes the selected look to PostgreSQL, where it appears on Saved Outfits after refresh. When filters leave no companion pieces, the UI offers an adjustment/retry state. Without `OPENAI_API_KEY`, use `AI_PROVIDER=mock` only for clearly labeled development testing; it is not real AI styling.

Saved Outfits and Lookbooks use PostgreSQL, not browser storage. Save is explicit and writes `Outfit`, ordered `OutfitItem` relationships, and `SavedOutfit` atomically. Open a saved card to inspect its pieces, rename it, add personal notes, mark it as a favorite, or enter a lookbook name. The list supports search, filters, sorting, and pagination; lookbook cards show live collection counts. Removing a saved look deletes its `SavedOutfit` association; the underlying `Outfit` remains available to other references such as calendar events.

Deletion policy: deleting a wardrobe item does **not** delete or corrupt a saved outfit. Each `OutfitItem` stores the item name and category at save time. Its live `clothingItemId` is set to `NULL` by the database when the wardrobe item is deleted, and the details screen labels that piece “Removed from wardrobe.” The removed item cannot be used for new generations or saves. Existing records were backfilled by the migration before the foreign key changed to `ON DELETE SET NULL`.

Outfits:

- `GET /api/outfits`
- `POST /api/outfits/generate`
- `POST /api/outfits/style-item`
- `GET /api/outfits/weather?city=Mumbai`

AI stylist:

- `POST /api/v1/stylist/chat` — authenticated `{ "message": "...", "conversationId": "optional-existing-id" }`; server-owned context, never client-submitted history
- `GET /api/v1/stylist/conversations` — recent conversation list
- `GET /api/v1/stylist/conversations/:id` — owned messages and current owned-item availability
- `DELETE /api/v1/stylist/conversations/:id` — permanently delete private messages

Open **AI Chat Stylist** from dashboard quick actions (or the desktop sidebar). Replies show owned wardrobe pieces as links and generic, optional shopping ideas in a separate section. Chats persist in PostgreSQL through refresh and re-login. The configured server-side provider is required; without `OPENAI_API_KEY`, the endpoint returns a configuration error. `AI_PROVIDER=mock` is an explicitly labeled development fixture, not real AI styling. See [backend setup](docs/backend-foundation.md) for privacy, validation, limits, and retention behavior.

Pinterest inspiration:

- `POST /api/v1/inspiration/analyze` — authenticated multipart upload with an `image` field; analyzes and saves the inspiration.
- `GET /api/v1/inspiration?page=1` — saved inspirations.
- `GET /api/v1/inspiration/:id` — analysis, owned matches, and missing pieces.
- `GET /api/v1/inspiration/:id/image` — owner-checked private image delivery.
- `DELETE /api/v1/inspiration/:id` — removes the saved analysis and stored image.

Only uploaded JPEG, PNG, and WebP images are accepted. Pinterest URL/board import is disabled until official API access is available; the app does not scrape Pinterest. The vision provider extracts visible garment attributes, then the backend computes an **approximate attribute match** against the signed-in user's wardrobe. The displayed percentage is not image-embedding or exact visual similarity. Analysis is saved when the user presses **Analyse outfit**, and can be revisited from the saved inspirations panel. The **Save recreated look** action explicitly saves currently available owned pieces to Saved Outfits.

Shopping:

- `GET /api/shopping/recommendations`
- `GET /api/shopping/compare?product=Neutral%20Leather%20Sneakers`

Insights:

- `GET /api/insights/wardrobe`
- `GET /api/insights/trends`
- `GET /api/insights/notifications`

Profile and Admin:

- `GET /api/v1/profile` and `PATCH /api/v1/profile/profile` — authenticated user's own profile only
- `PATCH /api/v1/profile/preferences` and `PATCH /api/v1/profile/settings` — allowlisted preference/account settings
- `POST /api/v1/profile/password` — requires the current password and revokes all sessions
- `POST /api/v1/profile/email-change/request` then `/confirm` — password-confirmed new-email verification; never updates email directly
- `POST /api/v1/profile/delete-account` — requires current password and an explicit `DELETE` confirmation
- `GET /api/admin/overview`

## Notes

- Authentication cookies are `HttpOnly` and `SameSite=Lax`; refresh-token records store only SHA-256 hashes. Browser-origin checks and CORS allow only configured origins in production.
- OTP codes expire after 10 minutes, are resend-rate-limited for 60 seconds, are single-use, and allow at most five invalid attempts.
- Database migrations are additive. Do not use Prisma reset against an environment that contains user data.
- Wardrobe uploads are server-to-Cloudinary only when all three `CLOUDINARY_*` variables are configured. They validate bytes and dimensions server-side, store only provider metadata in PostgreSQL, and fail closed when storage is unavailable—there is no mock upload fallback.

## Validation

Verified locally:

```bash
npm run typecheck
npm run build
```
