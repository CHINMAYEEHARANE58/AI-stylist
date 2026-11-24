# ClosetAI test plan and executed evidence

Updated 2026-11-24. Never use production credentials or a production database for these tests. `PASS` below means the specific test named passed, not that the entire feature is production-ready.

## Local setup and commands

From the repository root, start the local PostgreSQL 16 service on this Mac with `brew services start postgresql@16` if it is stopped. Configure a **development-only** database URL and other required values in `apps/server/.env` from `.env.example`; configure `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` in `apps/web/.env.local`. For the audited frontend port 3001, set backend `FRONTEND_URL=http://localhost:3001` and `ALLOWED_ORIGINS=http://localhost:3001`.

```bash
npm ci --cache .npm-cache
npm run db:generate --workspace closetai-server
npm run db:deploy --workspace closetai-server
npm run dev --workspace closetai-server
# In a second terminal:
npm run dev --workspace web -- --port 3001
```

Check `http://localhost:4000/api/v1/health` and `http://localhost:3001/login`. Run verification from the repository root, after building the backend for the isolated live smoke test:

```bash
npm run lint --workspace closetai-server
npm run lint --workspace web
npm run typecheck --workspace closetai-server
npm run typecheck --workspace web
npm test --workspace closetai-server -- --reporter=dot
npm test --workspace web
npm run build
npm run test:migrations:clean --workspace closetai-server
npm run test:integration:isolated --workspace closetai-server
npm audit --omit=dev
```

The last command currently reports unresolved advisories and is a release gate, not a passing check. `db:deploy` applies migrations to the configured database without resetting it; review the target URL before running it.

## Safe test environments

- Unit and mocked API tests use Vitest/Supertest. They do not connect to an application database.
- `npm run test:migrations:clean --workspace closetai-server` creates a randomly named `closetai_audit_*` database **only on localhost**, replays migrations, checks schema objects, then drops only that database. It refuses an ambiguous or non-local configured database.
- `npm run test:integration:isolated --workspace closetai-server` likewise creates its own local audit database, launches the built API on port 4100, tests synthetic accounts and records, then stops the API and drops only that database. It forces the development email-log fallback and disables real email delivery. It prints neither OTPs nor passwords. Run `npm run build --workspace closetai-server` first. If cleanup fails, inspect the exact named disposable database before removing it; never run a broad database reset.
- GitHub CI uses its own PostgreSQL 16 service and `closetai_ci` database. It never receives a production `DATABASE_URL`. The current CI workflow is unverified until a GitHub run executes.

## Executed automated checks

| Check | Command / method | Result |
|---|---|---|
| Backend unit and mocked API routes | `npm test --workspace closetai-server -- --reporter=dot` | 32 files, 161 tests passed; 0 failed, including wardrobe bulk-action ownership and validation tests |
| Frontend safe-return-path test | `npm test --workspace web` | 1 test passed; 0 failed |
| Backend/frontend TypeScript | `npm run typecheck --workspace closetai-server` and `... web` | Both passed |
| Backend/frontend lint | `npm run lint --workspace closetai-server` and `... web` | 0 errors; 41 backend and 21 frontend warnings remain |
| Production builds | `npm run build` | Both passed on Next.js 15.5.29; frontend largest listed first-load route was Wardrobe detail, 216 kB in the build output |
| Existing database | `npx prisma migrate status` and `npx prisma validate` from `apps/server` | 13 applied migrations, up to date; schema valid; local PostgreSQL reachable |
| Clean migration replay | `npm run test:migrations:clean --workspace closetai-server` | Passed: 30 tables, 33 foreign keys, 20 non-primary unique indexes; disposable DB removed |
| Isolated core API journey | `npm run test:integration:isolated --workspace closetai-server` | Passed; disposable DB removed |
| Isolated style/calendar/dashboard/notification journey | Included in isolated integration command | Passed; real AI/weather calls unavailable and explicitly reported |
| Browser viewport checks | In-app browser emulation, 11 authenticated pages × 320/375/390/430/768/1280 px | 66 page/size checks: no page-level horizontal overflow; no captured console errors; mobile Wardrobe nav opened |
| Local startup | `npm run dev --workspace closetai-server` and `npm run dev --workspace web -- --port 3001` | `/login` and `/api/v1/health` returned HTTP 200 after fixes |

The integration test exercises invalid/duplicate registration, hashed password and OTP database assertions, unverified login denial, invalid and reused OTP denial, successful verification, wrong-password denial, HttpOnly/SameSite cookies, current-user endpoint, profile persistence, two wardrobe items, a manual outfit, logout/session revocation, login persistence, item deletion with historical outfit snapshots, cross-user wardrobe read/edit denial, and cross-user saved-outfit isolation. The style test covers preference save/reset, event CRUD/ownership, notification creation/read/ownership, dashboard and insights counts, and a provider-unavailable event suggestion.

The Google follow-up tests verify that missing or example credentials produce an unavailable status and a frontend redirect, and that a configured test client produces a stateful PKCE redirect to Google. The live backend status and redirect were checked at ports 4000/3001, and both auth pages returned HTTP 200. The real Google chooser/callback was **not** tested because no OAuth client credentials are configured. Chrome automation was unavailable in this environment; the signed-in in-app browser could not exercise the logged-out button without altering its session.

## Automated coverage still needed

Wardrobe management follow-up (2026-11-24): the isolated PostgreSQL smoke flow passed bulk favorite/unfavorite, archive/restore, favorites and archive list retrieval, name sorting, and transaction rollback for both missing IDs and a batch mixing two users' records. Cleanup removed only the generated disposable database. Both production builds, both type checks, and lint passed; CI now includes the isolated integration command. The browser session was signed out, so no completed authenticated browser interaction or physical-phone pass is claimed for these new controls.

1. Repeatable browser E2E journeys for signup, login/refresh/logout, wardrobe editing, saved looks, and failures. The repository currently has **no Playwright project suite**; mobile checks used the in-app browser, not committed browser automation.
2. Production email delivery, Google OAuth callback/consent, Cloudinary upload/replacement/deletion, real AI vision/chat/outfits, authorized shopping feed, and paid weather provider. These require external credentials and must be run as opt-in integration tests; mocks are not evidence of provider success.
3. Dedicated tests for expired OTP, resend supersession/cooldown and rate limits against a live isolated server; session-expiry/reopen behavior in a browser; all private-resource IDOR paths (inspiration, images, chat, wishlist and notifications); and database-outage/retry UI behavior.
4. Physical iPhone Safari and Android Chrome testing, including camera/gallery upload and Google redirect. Browser emulation does not cover device permissions, OS file pickers, keyboard occlusion or mobile cookie policy.
5. Lighthouse/accessibility audit. No Lighthouse score, contrast measurement, or real-network performance budget was measured.

## Manual physical-phone checklist

Use a **verified public HTTPS URL** only after deployment. Do not expose the local development server to the public internet.

1. Open the public frontend in Safari on an iPhone and Chrome on an Android phone; check the address bar uses HTTPS and the page fits without side-scrolling at portrait width.
2. Create a disposable account using a real inbox; receive and enter the code; resend once; test an incorrect code; sign out and back in. Repeat Google sign-in only after the provider is configured and consent/redirects are reviewed.
3. Refresh and close/reopen the browser. Confirm the session restores, then log out and confirm protected pages no longer expose content.
4. Use the phone camera/gallery to upload a permitted clothing photo. Wait for the backend-confirmed upload, reopen the item and image after refresh and a later login, then replace/delete the test photo. A preview alone is not proof of storage.
5. Search/filter the wardrobe; edit and delete a disposable item; save an outfit and confirm it survives navigation and login. Verify a deleted item appears as unavailable in a historical outfit.
6. Open mobile navigation, forms, verification-code inputs, dialogs, and keyboard; ensure buttons are tappable and no input is hidden. Check dark mode, browser back/forward, offline/API-failure messages and retry controls.
7. Test Pinterest inspiration, chat, shopping offers and weather only when the corresponding real providers are configured; confirm sample data is visibly labeled.
8. Check browser console/network and backend logs for errors without copying private tokens, OTPs, or personal data into a bug report.

## CI and cleanup

CI performs `npm ci`, Prisma generation/validation/migration on an isolated service, lint, type checks, unit/API tests, both builds, live style smoke and a failing high-severity dependency audit gate. The CI job has not been run on GitHub yet. If a CI test fails, retain only sanitized output; never upload API logs containing development verification codes as an artifact. Test accounts are scoped to CI/disposable databases; no cleanup command targets the application database.
