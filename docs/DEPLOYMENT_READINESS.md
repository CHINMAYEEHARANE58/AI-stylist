# ClosetAI deployment readiness

Updated 2026-11-14. **Decision: not ready for real-user deployment.** A successful local build and API test do not establish production email, image storage, AI, OAuth, mobile-device behavior or security. No hosting platform, public domain, credentials or HTTPS URLs are configured in this repository, and no deployment was performed.

## Proposed architecture, subject to platform selection

- Host the existing Next.js frontend on a supported Node/Next hosting service at `https://app.example.com` and the Express API at `https://api.example.com`. Use the **same registrable site** for both so the current `SameSite=Lax` HttpOnly cookies work; configure `Secure` cookies and restricted CORS. Separate unrelated domains require a deliberate cookie/CSRF redesign before deployment.
- Use managed PostgreSQL with backups and an independent staging database. The app uses Prisma migrations; deployment runs `prisma migrate deploy` through a controlled pre-release step on a direct database connection after testing the migration on staging. Never use `migrate reset` or seed sample users in production.
- Configure Cloudinary for wardrobe/avatar images and authenticated inspiration delivery, a verified Resend sender/domain for email, Google OAuth redirect/consent configuration, and a server-only AI provider key. Shopping live offers require a licensed catalog/feed and allowed merchant domains. Open-Meteo production use requires an appropriate commercial plan/key.
- Put both services behind HTTPS and a health-aware load balancer. Restrict database networking and use secret-manager environment injection. Configure logs/alerts without logging OTPs, tokens, chat content or image bytes.

## Release gate checklist

| Gate | Current result | Next action |
|---|---|---|
| Local database and migrations | PASS — PostgreSQL 16.13 connected; 13 applied; clean disposable replay passed | Repeat on staging backup/branch before production |
| Locked dependency install | PARTIAL — `package-lock.json` now included, local install worked | Run first GitHub CI `npm ci` and confirm lockfile is committed |
| Unit/API tests and builds | PASS locally — 130 backend, 1 frontend, both builds | Require green CI on a protected branch |
| Live core persistence | PASS against a disposable local DB through the API | Add committed browser E2E and production smoke |
| Authentication email | BLOCKED — local development log fallback only | Verify Resend API key, sender/domain, delivery and bounces |
| Google OAuth | BLOCKED — credentials absent | Configure authorized origins/redirects and test signup/linking/cancel |
| Image upload | BLOCKED — Cloudinary credentials absent | Test real upload, retrieval, replacement, cleanup, privacy and mobile picker |
| AI features | BLOCKED — real provider key absent | Test model output validation and failure/usage behavior with real provider |
| Live shopping/price data | BLOCKED — no authorized feed | Obtain legal feed and validate provenance/staleness; retain sample labels |
| Weather | PARTIAL — implementation exists but disabled locally | Configure commercial provider access if used publicly; test failures |
| Dependency security | BLOCKED — local production audit still reports **7 high, 0 critical** advisories | Review/upgrade Prisma, Cloudinary, PostCSS/Next transitive, sharp and Zod without force-breaking APIs; rerun all tests |
| Mobile browser emulation | PARTIAL — 66 viewport checks, no overflow/errors captured | Run full journeys and physical iOS/Android checklist |
| CI | PARTIAL — workflow added, never executed on GitHub | Push/PR and inspect the first run; security gate is expected to fail until advisories are resolved |
| CD and public HTTPS | BLOCKED — hosting target/domain/secrets absent | Select platforms and configure a gated deployment workflow; do not migrate production automatically yet |
| Backups/rollback | NOT TESTED | Configure PITR/backups and verify a restore; keep prior app artifact for rollback |

## Required environment variables

The source of truth for names and examples is `.env.example`. **Server-only**: `DATABASE_URL`, a unique 32+ character `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, `PORT`; `RESEND_API_KEY`/`EMAIL_FROM` for email; `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` for Google; `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, image visibility/storage settings; `AI_PROVIDER`, `OPENAI_API_KEY`, `AI_VISION_MODEL`; optional weather and shopping provider variables. **Frontend-public**: only `NEXT_PUBLIC_API_URL`, pointing to the HTTPS `/api/v1` API. Never put server secrets in `NEXT_PUBLIC_*` variables, Git, CI artifacts, or browser configuration.

The backend now refuses production startup when `DATABASE_URL`, a strong non-default JWT secret, HTTPS `FRONTEND_URL`, or matching HTTPS allowed origins are missing. Cookie `Secure` is automatically enabled for `NODE_ENV=production`. This does not verify that a chosen host's proxy headers, cookie domain, CORS and OAuth redirects are correct; test them on staging.

## Controlled deployment sequence (not executed)

1. Select hosting, domain and staging environment; provision managed PostgreSQL, storage, email and secret manager. Configure backups/PITR and an application rollback artifact.
2. Set staging server/frontend variables separately. Use `npm ci`, `npm run db:generate --workspace closetai-server`, then apply migrations to staging with `npm run db:deploy --workspace closetai-server` using a direct DB connection. Verify `/api/v1/health` and run the test plan.
3. Require a green GitHub CI check, resolved dependency audit, real-provider smoke tests, browser E2E and physical-phone checklist. Freeze schema changes and take a fresh recoverable database backup/branch before production migration.
4. In a manually approved release job, deploy the backend and frontend artifacts, run `prisma migrate deploy` exactly once as a controlled step, verify HTTPS URLs, cookies, CORS, email, OAuth, uploads, AI, database persistence and logs. Do not run `migrate reset` or development seed.
5. On failure, roll back application artifacts; use a tested database restore/forward-fix plan because Prisma migrations are not automatically reversible. Keep the API unhealthy/out of rotation rather than serving misleading success responses.

There is intentionally **no `deploy.yml` with fake credentials or a migration-only production step**. CD automation must be adapted to the selected host, secrets, approval environment and backup/rollback procedure. Until those are selected and verified, there is no phone-ready public URL to report.
