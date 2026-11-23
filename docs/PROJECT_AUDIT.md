# ClosetAI application audit

Audit started 2026-11-14 (Asia/Kolkata). This file separates the **initial, read-only baseline** from later verified fixes. A passing unit test or a rendered page is not a production end-to-end pass. See `TEST_PLAN.md` and `DEPLOYMENT_READINESS.md` for procedures and release gates.

## Initial baseline, before audit fixes

- Git: clean `main` worktree at `a7568b7`; `origin` is a GitHub repository. No `.github/workflows` files or hosting configuration were present. No public deployment URL was configured or verified.
- Frontend: Next.js **15.5.18** (App Router), React 19, TypeScript, Tailwind, Zustand, TanStack Query. This is **not** the previously requested Vite frontend; preserve the existing working UI rather than silently migrating frameworks.
- Backend: Node.js, Express **4.22.2**, TypeScript, Zod, Helmet, CORS, `express-rate-limit`, Winston/Morgan. API routes are mounted at `/api/v1`. `GET /api/v1/health` checks PostgreSQL.
- Database: local PostgreSQL **16.13**, Prisma **6.19.3**. `prisma migrate status` reported 13 migrations and an up-to-date schema; `prisma validate` passed. The schema contains 29 models (including auth, wardrobe, outfits, inspiration, shopping, calendar, notifications, and chat). This does not establish that a clean migration replay or every foreign key has been tested.
- Identity: application-owned email/password auth with bcryptjs, hashed email codes/reset tokens/refresh tokens, HttpOnly cookies, access JWT, refresh rotation and Google OIDC code flow with PKCE/state. The email service uses Resend when configured, otherwise logs codes **only in development**. The configured local environment has no usable Resend or Google credentials. Google and production email delivery are therefore **BLOCKED** for live verification.
- AI: OpenAI-compatible backend provider or an explicitly selected development mock. The configured local environment has no usable AI key; live vision/chat/outfit generation is **BLOCKED**. A mock response must not be presented as real analysis.
- Images: Cloudinary wardrobe/production inspiration storage; development-only local inspiration storage is supported. The configured local environment has no usable Cloudinary credentials. Live permanent photo upload/retrieval/replacement is **BLOCKED** pending storage setup; browser previews are not persisted assets.
- Weather: optional Open-Meteo integration, disabled by default. Shopping offers require an authorized feed; no feed is configured. Sample products and any marketing imagery are not a live catalog.
- Frontend routes: landing, signup, verification, login, reset, dashboard, wardrobe/upload/detail, outfit generator, saved looks/detail, style-item, Pinterest inspiration, stylist chat, shopping/detail, profile, settings, insights, notifications, admin. Frontend API calls are centralized in `apps/web/lib/api-client.ts`.
- Backend routes: auth, profile, wardrobe, outfits, stylist, inspiration, shopping, insights, calendar, weather and admin. Most private routers apply `requireAuth` and an origin guard; notification writes in the insights router lacked the origin guard in the baseline.
- Tests: `npm test --workspace closetai-server -- --reporter=dot` passed **24 files / 121 tests**. These are predominantly mocked service/API tests, not a substitute for live PostgreSQL and browser verification. Both TypeScript checks passed. Server lint: **0 errors / 41 warnings**. Web lint: **0 errors / 21 warnings**. Both local app URLs were offline at baseline.

## Initial feature inventory

Status is conservative. **NOT TESTED** means code is present but the complete acceptance flow was not run. **BLOCKED** means the live dependency is missing. The automated-test column describes only tests actually observed in the baseline; see the test plan for required live journeys. `DB` means PostgreSQL/Prisma records, `object` means external image bytes, and `local` means transient browser state. All private operations require an authenticated owner unless otherwise noted.

| Feature | Frontend | Backend/API | Data | Baseline test evidence | Status / issue |
|---|---|---|---|---|---|
| Landing/navigation | Present | Not required | Static/marketing mock | None | NOT TESTED — browser/mobile review pending |
| Create account | Present | `POST /auth/signup` | DB | Mocked auth-route tests | NOT TESTED — live registration pending |
| Email verification/resend | Present | `/auth/verify-email`, `/auth/resend-verification` | DB challenge | Mocked auth-route tests | PARTIAL — development log only; real delivery BLOCKED |
| Email/password login | Present | `POST /auth/login` | DB/session | Mocked auth-route tests | NOT TESTED — browser/session journey pending |
| Google signup/login | Present | `/auth/google`, callback | DB/account | Mocked auth-route tests | BLOCKED — Google credentials absent |
| Session restore/logout | Present | `/auth/me`, `/auth/refresh`, `/auth/logout` | DB/session + cookie | Mocked session/auth tests | NOT TESTED — browser expiry/reopen pending |
| Forgot/reset password | Present | `/auth/forgot-password`, `/auth/reset-password` | DB token | Mocked auth-route tests | PARTIAL — production email delivery BLOCKED |
| Protected routes | Middleware and auth bootstrap | `requireAuth` | Cookie/JWT | Mocked route tests | PARTIAL — access-cookie-only middleware can reject refresh-only sessions |
| Profile/settings | Present | `/profile/*` | DB | Mocked profile-route tests | NOT TESTED — live persistence pending |
| Wardrobe CRUD/search/filter/sort | Present | `/wardrobe/*` | DB | Mocked wardrobe-route tests | NOT TESTED — live persistence pending |
| Clothing upload/image storage | Present | multipart `/wardrobe/*` | object + DB reference | Mocked image tests | BLOCKED — Cloudinary absent |
| AI clothing analysis | Present | `/wardrobe/analyze-image` | AI/cache/DB | Mocked provider tests | BLOCKED — real AI and image provider absent |
| AI outfit generation / generated details | Present | `/outfits/generate` | AI/history | Mocked outfit-route tests | BLOCKED — real AI key absent |
| Style This Item | Present | `/outfits/style-item` | AI/history | Mocked outfit-route tests | BLOCKED — real AI key absent |
| Saved outfits/lookbook | Present | `/outfits/saved*`, `POST /outfits` | DB | Mocked saved-outfit tests | NOT TESTED — live refresh/login persistence pending |
| Pinterest inspiration | Present | `/inspiration/*` | object + DB | Mocked route/storage/match tests | BLOCKED — live image/AI providers absent |
| AI chat stylist | Present | `/stylist/*` | DB conversation + AI | Mocked chat tests | BLOCKED — real AI key absent |
| Shopping recommendations | Present | `/shopping`, `/shopping/refresh` | DB/sample catalog | Mocked shopping tests | PARTIAL — no authorized live catalog/feed |
| Product detail/price comparison | Present | `/shopping/products/:id`, `/compare/:id` | DB offers | Mocked offer tests | PARTIAL — no live offer feed; sample data is labeled |
| Wishlist | Present | `/shopping/wishlist` | DB | Mocked shopping tests | NOT TESTED — live persistence pending |
| Dashboard/Style DNA | Present | `/insights/dashboard`, profile prefs | DB | Mocked insights/preference tests | NOT TESTED — browser/data assertions pending |
| Weather/calendar | Present | `/weather`, `/calendar/*` | provider + DB | Mocked weather/calendar tests | PARTIAL — weather disabled; event CRUD not live-tested |
| Fashion insights | Present | `/insights/wardrobe`, `/trends` | DB | Mocked insights tests | NOT TESTED — derived numbers pending live assertion |
| Notifications | Present | `/insights/notifications*` | DB | Mocked insights tests | PARTIAL — write endpoints lacked origin guard |
| Admin | Present | `/admin/*` | DB | No targeted baseline test found | NOT TESTED — authorization/browser review pending |
| Responsive navigation/mobile | Present | Not required | UI | No viewport run at baseline | NOT TESTED — emulation and phone pending |
| Dark mode | `next-themes` present | Not required | Browser setting | No viewport/contrast run | NOT TESTED |
| Loading/error/empty states | Implemented on many pages | API error shapes | UI | No full browser failure journey | NOT TESTED |
| Legacy dashboard panels | Components use `lib/mock-data` | None | Static mock | None | PARTIAL — do not treat these panels as live data |

## Initial risks to verify or fix

1. No CI/CD or deployment target exists, so there is no automated release gate or verified public HTTPS URL.
2. Tracked `.js` files live alongside `.ts` source in `apps/server/src`; module resolution may select stale JavaScript outside the configured development command. Remove them only after proving they are legacy and preserving the TypeScript runtime/build.
3. Next middleware checks only the short-lived access cookie; a valid refresh cookie alone cannot reach a protected page to restore the session.
4. Notification mutation routes lacked the existing origin guard. Review CSRF for every cookie-authenticated write.
5. Production environment validation has permissive development defaults and must fail closed before deployment.
6. Browser, physical-phone, external-provider and clean-database tests have not been run. Do not infer readiness from the 121 unit/API tests.

## Post-baseline findings and fixes

The baseline above remains unchanged as a record of the pre-fix state. The following is the verified state after controlled fixes.

### Architecture, database and security evidence

- PostgreSQL 16.13 remained reachable. Prisma schema validation, client generation (during the local build/test setup), and migration status passed. A separate randomly named local database replayed all 13 migrations successfully: **30 tables including Prisma's migration table, 33 foreign keys, 20 non-primary unique indexes**. That disposable database was removed. No reset or destructive migration touched the application database.
- Read-only ownership checks of the existing database found **zero** mismatches among clothing/wardrobe, outfit/clothing, saved outfit/outfit, inspiration match/inspiration, calendar event/outfit, and wishlist/recommendation pairs. The database does **not** enforce a composite owner foreign key on several of these pairs, so future buggy server code could still create inconsistent links. Existing API code checks ownership; a future additive constraint migration should be staged after a full integrity scan.
- Isolated API integration tests used a separate disposable database and synthetic users. They verified hashed password/OTP persistence, verification state, profile/wardrobe/outfit persistence across logout/login, `ON DELETE SET NULL` outfit-item behavior, and actual cross-user wardrobe denial. The database was removed after the test.
- Fixed: notification mutation routes now use the existing origin guard; CORS rejects untrusted origins with 403 rather than a misleading 500; refresh rotation uses a conditional revocation update so simultaneous refreshes cannot both succeed; Next middleware allows refresh-only sessions to reach the session-restoration code; login return paths are restricted to internal URLs; production startup rejects missing/insecure core settings.
- Removed **34 verified-unused legacy source files**: 29 stale `.js` copies under `apps/server/src`, three obsolete Mongoose models, one mock data file and one fake AI service. Removed the unused Mongoose and `multer-storage-cloudinary` packages. These were version-controlled code files, not database records or user uploads; Git can recover them if needed. Active TypeScript API tests, build, and local startup passed afterward.
- Updated Next.js 15 within its major line and nonbreaking transitive dependencies. Current `npm audit --omit=dev` still reports **7 high, 3 moderate, 0 critical** advisories. The high items include Prisma/deepmerge-ts, Cloudinary, PostCSS, sharp and Zod. No blanket forced major upgrade was attempted. [Next.js security advisories](https://github.com/vercel/next.js/security/advisories) and `npm audit` must be reviewed again before release.
- `package-lock.json` was previously ignored, making reproducible `npm ci` impossible in CI. It is now included with the repository changes. The new GitHub workflow uses an isolated PostgreSQL service and a failing high-severity audit gate; it has **not** run on GitHub yet. There is no deployment workflow or public URL because no host/domain/secrets were supplied.
- Runtime logs and frontend code search found no server API keys in frontend environment variables; only `NEXT_PUBLIC_API_URL` is intentionally public. The frontend still has old unused components that import marketing/demo data; live shopping cards are explicitly labeled sample. A full secret scan of Git history and deployed artifacts was **not** performed.

### Final feature-status matrix

The table evaluates the complete feature, not just whether a route exists. `API live` means the endpoint was exercised against disposable PostgreSQL; `mocked` means Vitest/Supertest used mocked dependencies. Browser mobile results are emulated only. **No physical device or public HTTPS deployment was tested.**

| Feature | Frontend | Backend / endpoint | DB or storage | Automated evidence | Mobile evidence | Final status | Remaining issue |
|---|---|---|---|---|---|---|---|
| Landing/navigation | Present | n/a | Static | Build only | No overflow at tested size | PARTIAL | Full link/accessibility audit pending |
| Signup | Present | `/auth/signup` | User/profile/wardrobe | API live | Form rendered at 320 px | PARTIAL | Browser signup journey and production email pending |
| Verification/resend | Present | `/auth/verify-email`, `/resend-verification` | Hashed DB challenge | Verification/invalid/reuse API live; resend mocked | OTP mobile not exercised | PARTIAL | Real delivery, expired/resend live cases pending |
| Email/password login | Present | `/auth/login` | DB/session | API live, wrong password live | Login rendered at six widths | PARTIAL | Browser login/reopen journey pending |
| Google signup/login | Present | `/auth/google`, callback | AuthAccount | Mocked routes | Not exercised | BLOCKED | Google credentials/redirect consent absent |
| Session restore | AuthBootstrap + middleware | `/auth/me`, `/auth/refresh` | Cookie/DB | Rotation mocked; refresh-only middleware HTTP checked | Not exercised after real browser expiry | PARTIAL | Full browser reopen/expiry test pending |
| Logout | Present | `/auth/logout` | DB session | API live; old refresh denied | Not exercised | PARTIAL | Browser cookie/UI state test pending |
| Forgot/reset password | Present | `/auth/forgot-password`, `/reset-password` | DB token | Mocked route tests | Not exercised | BLOCKED | Real email provider absent |
| Protected pages | Middleware/AuthGate | `requireAuth` | Cookie/JWT | API 401 and middleware HTTP checks | Protected pages emulated while signed in | PARTIAL | Full IDOR matrix and browser redirect test pending |
| Current user/profile | Present | `/auth/me`, `/profile` | DB | API live; relogin persistence | Profile page checked | PARTIAL | Avatar live storage blocked |
| Settings/password/email change/deletion | Present | `/profile/*` | DB + email | Mocked profile tests | Settings page checked | PARTIAL | Live recovery/email/deletion not run; no destructive account test |
| Wardrobe add/list/detail/edit/delete | Present | `/wardrobe/*` | DB | API live add/detail/delete; edit cross-user denial | Wardrobe grid/nav checked | PARTIAL | Full browser edit journey pending |
| Wardrobe search/filter/sort | Present | `GET /wardrobe` | DB | Mocked route tests | Controls rendered | NOT TESTED | Live filter/sort permutations pending |
| Clothing image upload/retrieval | Present | Multipart wardrobe endpoints | Cloudinary bytes + DB metadata | Mocked image tests only | Phone file picker not tested | BLOCKED | Cloudinary credentials absent |
| AI clothing analysis | Present | `/wardrobe/analyze-image` | Provider/cache/DB | Malformed-output mocked tests | Not tested | BLOCKED | Real AI/storage absent |
| AI outfit generation/details | Present | `/outfits/generate` | Provider/history | Mocked output/ownership tests; provider unavailable live | Outfits page checked | BLOCKED | Real AI key absent |
| Style This Item | Present | `/outfits/style-item` | Provider/history | Mocked output/ownership tests | Route checked at widths | BLOCKED | Real AI key absent |
| Save/retrieve/remove outfits | Present | `/outfits`, `/outfits/saved*` | Outfit/OutfitItem/SavedOutfit | Save/retrieve/relogin/delete-item snapshot API live | Saved page checked | PARTIAL | Browser full journey and remove action pending |
| Pinterest inspiration | Present | `/inspiration/*` | Private object + DB | Mocked route/storage/matching tests | Page checked | BLOCKED | Real storage/vision providers absent |
| AI chat stylist | Present | `/stylist/*` | DB conversation + provider | Mocked tests | Page checked | BLOCKED | Real provider key absent |
| Shopping recommendations | Present | `/shopping` | DB/sample catalog | Mocked scoring/routes | Page checked | PARTIAL | No authorized live feed; sample items only |
| Product detail/comparison | Present | `/shopping/products/:id`, `/compare/:id` | DB offers | Mocked provider/offer tests | Product page not in 66-page set | PARTIAL | Live merchants/prices unavailable |
| Wishlist | Present | `/shopping/wishlist` | DB | Mocked route tests | Shopping page checked | NOT TESTED | Live login persistence pending |
| Dashboard metrics | Present | `/insights/dashboard` | DB aggregates | Isolated API live counts | Dashboard checked | PARTIAL | Full browser data reconciliation pending |
| Style preferences/Style DNA | Present | `/profile/preferences` | DB | Isolated API live save/reset | Profile checked | PARTIAL | Browser editing and all downstream effects pending |
| Weather | Present | `/weather` | Provider (no stored forecast) | Disabled/unavailable behavior API live; unit tests | Dashboard checked | BLOCKED | Production provider key/plan absent |
| Calendar | Present | `/calendar/*` | DB | Isolated API live CRUD/ownership | Outfits page checked | PARTIAL | Browser timezone/event journey pending |
| Fashion insights | Present | `/insights/wardrobe`, `/trends` | DB aggregates | Isolated API live count; mocked distributions | Insights page checked | PARTIAL | Full numeric reconciliation pending |
| Notifications | Present | `/insights/notifications*` | DB | Isolated API live creation/read/ownership | Page checked | PARTIAL | Browser pagination/read-all pending |
| Admin | Present | `/admin/*` | DB | No targeted live test | Not exercised | NOT TESTED | Privilege boundary/manual review pending |
| Responsive nav/mobile | Present | n/a | UI | No committed browser E2E | 66 viewport checks, Wardrobe nav passed | PARTIAL | Physical Safari/Chrome and touch/keyboard pending |
| Dark mode | Present (`next-themes`) | n/a | Browser setting | None | Not toggled | NOT TESTED | Contrast and persistence pending |
| Loading/error/empty states | Present on major pages | Error middleware | UI | Selected mocked failures | Loading Wardrobe observed | PARTIAL | Offline/provider-failure browser journeys pending |
| Legacy marketing/demo panels | Present in source | No live API | Static mock | None | Not exercised | PARTIAL | Must remain labeled/demo; do not count as live features |

### Unresolved risks, priority order

- **P0:** No production rollout while high-severity dependency advisories, missing provider credentials and untested production cookie/OAuth/upload flows remain. No known data-loss bug was verified, but that is not proof of absence.
- **P1:** Complete browser E2E and physical-device testing; configure and verify Resend/Google/Cloudinary/AI; choose a host/domain and test HTTPS cookie/CORS behavior; add composite owner constraints or a checked migration for cross-owner relationships; execute CI and resolve its security gate.
- **P2:** Add live expired/resend/rate-limit tests; test all private-resource IDs across two users; address avatar/image cleanup failure paths; improve distributed rate limiting for multi-instance deployment; add measured performance/accessibility and error-state testing.
- **P3:** Resolve lint warnings, optimize unoptimized inspiration images, review unused frontend demo panels, and verify dark-mode polish.

Local environment and deployment commands are in `TEST_PLAN.md` and `DEPLOYMENT_READINESS.md`. There is no verified public phone URL.

## Google sign-in follow-up, 2026-11-15

Manual testing exposed a confusing failure: clicking **Continue with Google** without an OAuth client navigated to a raw backend JSON error. The local backend has no Google client ID or secret, so the account chooser cannot yet run. Both auth pages now check a non-sensitive availability endpoint on click and show a nearby, accessible error message when the integration is unavailable. Direct requests to `/auth/google` redirect back to the frontend login page with an error instead of displaying JSON. Local `FRONTEND_URL` was corrected from port 3000 to the running port 3001. The configured branch still creates a Google authorization redirect with state, PKCE, and `prompt=select_account`; three new API tests passed. The Google-hosted chooser, callback, account linking, and session cannot be marked tested until a real OAuth Web application client is added and a test account completes the flow. Setup instructions are in `GOOGLE_SIGN_IN.md`.
