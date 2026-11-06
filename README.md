# OpenSync

**One update. Everywhere your customers look.**

A Next.js application for independent businesses to manage regular hours, exceptions, announcements, and public website widgets. Real accounts use Supabase Auth and PostgreSQL. The separate `/demo` workspace persists example changes only in the visitor's browser and never contacts Google or Stripe.

## Quick start

Use Node.js 24 LTS and npm. The lockfile is checked in.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000` for the marketing site or `http://localhost:3000/demo` for the interactive café demo. No credentials are required for these routes. Account creation explicitly reports setup required until Supabase and the database are configured.

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if execution policy blocks npm's PowerShell shim. Do not change your system execution policy just to run this project.

```powershell
Copy-Item .env.example .env.local
npm.cmd run db:migrate
npm.cmd run dev
```

Fill `.env.local` before running migrations. Never commit it. The app has no fabricated credentials or preassigned paid subscriptions.

## What is implemented

- One-click, no-card 14-day Pro trials for workspace owners. Each workspace can claim once; expiry is enforced by server entitlement checks without a scheduled job. Trials never create a Stripe subscription or automatic charge, and active paid plans take precedence. The dashboard and billing page show the claim, welcome popup and expiry date. `/demo` previews the animation without creating a real trial.

Before deploying the trial feature, run `npm run db:migrate` against the intended environment to apply `005_pro_trials.sql`. The trial table is server-only (RLS enabled and direct client grants revoked). Existing paid subscriptions are not modified.

- Email/password registration, verification, sign-in, reset, logout, optional Google sign-in, cookie sessions, protected account routes, and account deletion.
- Resumable six-step onboarding; clean new accounts; independent locations and time zones.
- Weekly hours with split shifts, overnight periods, copy controls, overlap validation, one-time/date-range exceptions, and quick changes. Editing a day inside an exception splits the surrounding range safely.
- Editable announcements with optional links, enable/disable, business-local activation times, expiry, and website previews.
- Draft saving with optimistic concurrency; explicit review; immutable, versioned, idempotent publication.
- Public hours, status, and announcement widgets; responsive script/iframe snippets; multi-widget loading; safe text rendering; periodic refresh; automatic script-embed resizing and collapse of expired banners.
- Google OAuth state checks, encrypted tokens, refresh, account/location pagination, location selection, import confirmation, hours-only update masks, durable destination jobs, bounded retry/backoff, and honest accepted/failed results.
- Stripe Checkout, Billing Portal, raw-body webhook signatures, event deduplication, current subscription reconciliation, CAD price validation, checkout reuse, and server-side plan enforcement.
- History, in-app failure/subscription notifications, business settings, export, basic staff access grants, Instagram/Facebook post and story creation with PNG export, captions, browser-local drafts, and native sharing where supported, and saved support requests.
- Responsive marketing/help pages, explicit legal templates, metadata, sitemap, social image, PWA manifest/icons, and a network-only offline fallback that never caches private business pages.

See [launch readiness](docs/LAUNCH-CHECKLIST.md) for verification and remaining scope. This is runnable application code, **not an assertion that an unconfigured deployment is ready to accept paying customers**.

## Supabase setup

1. Create a **dedicated** Supabase project. Use the project's PostgreSQL connection string, preferably the transaction pooler for Vercel. The driver uses `prepare: false` for pooler compatibility. Require TLS in the production connection string, using the connection details supplied by Supabase.
2. Set `NEXT_PUBLIC_SUPABASE_URL` (the project base URL without `/rest/v1/`), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`), and server-only `DATABASE_URL` (a PostgreSQL connection string). This server connection must be permitted to run the migrations and application SQL. It is privileged; it must never be exposed to a browser.
3. Set server-only `SUPABASE_SECRET_KEY` (`sb_secret_...`) for account deletion. The normal app does not use it to authenticate users. Get both keys from Supabase Settings > API Keys. The old `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` variable names remain fallbacks during migration; the new names take precedence. Set the new variables in Vercel and redeploy when switching keys.
4. Run `npm run db:migrate`. The migration runner uses a transaction/advisory lock and records completed filenames. Use the same command for later deployments. Back up before applying schema changes.
5. In Authentication, enable email/password and **confirm email**. Configure a production SMTP provider, delivery limits, and password policy (at least 12 characters). The default Supabase mail service is unsuitable for a public production launch.
6. Set Supabase Site URL to your application origin. Add the exact allowed redirects:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/reset-password`
   - Production equivalents on your HTTPS domain.
7. Keep the standard confirmation URL/PKCE email link flow, which returns a code to `/auth/callback`. Test verification and recovery using real delivered emails before launch.
8. For Google **account sign-in**, configure Google's provider in Supabase and set `NEXT_PUBLIC_GOOGLE_SIGN_IN=true`. This is distinct from the Business Profile OAuth connection below.

The application verifies the session with `auth.getUser()`. Server mutations derive membership from the authenticated user, never a submitted organization ID. RLS additionally protects authenticated direct reads. Anonymous table access and direct client writes are denied. Connection tokens and subscription tables are not readable by clients. Public widgets use a deliberately limited server endpoint.

Account deletion first requires cancellation of an active subscription and attempts Google token revocation. Deleting `auth.users` invokes a database trigger that removes owned organizations and their cascading data atomically. Staff lose access to deleted organizations. Provider-held payment and legal records follow provider retention policies.

## Google Business Profile

Website features do not depend on Google.

1. Obtain Google Business Profile API access/approval for your Cloud project. A client ID alone does not imply approval or usable quota.
2. Enable the **My Business Account Management API** and **My Business Business Information API**. Configure the OAuth consent screen, authorized domains, privacy policy, terms, and appropriate verification/testing users.
3. Create a Web OAuth client with redirect URI `https://YOUR_DOMAIN/api/google/callback` (and your localhost URI for development).
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_BUSINESS_PROFILE_APPROVED=true`, and a 32-byte encryption key encoded as 64 hex characters in `TOKEN_ENCRYPTION_KEY`. Generate a unique random key locally; store it in a secret manager. Do not rotate it without a token migration or reconnect plan.
5. Enable Pro or Business through a verified Stripe subscription. For **development only**, `DEV_PAID_FEATURES=true` unlocks paid actions. This override is explicitly ignored in production.
6. Connect in Integrations, select a location, compare the imported hours, and explicitly confirm import if desired. Import changes the draft only. Review before publishing.
7. Configure the job runner described below. Publish and inspect History.

Only `regularHours,specialHours` are patched. OpenSync never changes `openInfo`, permanently/temporarily closed status, address, category, or unrelated profile fields. Announcements are website-only. Unsupported imports must be reviewed manually; this release does not model 24-hour/full-week intervals. Google processing is reported as **accepted**, never as verified public Search/Maps visibility.

References: [location fields](https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations), [updating location data](https://developers.google.com/my-business/content/location-data), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Stripe billing

1. Create two active recurring prices in **CAD**, billed every **one month**: Pro `900` cents and Business `1900` cents. Set `STRIPE_PRO_PRICE_ID` and `STRIPE_BUSINESS_PRICE_ID`.
2. Set `STRIPE_SECRET_KEY`. Configure the Billing Portal to allow plan changes, payment updates, and cancellation for these prices.
3. Add `https://YOUR_DOMAIN/api/billing/webhook` as a webhook endpoint for `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Set its `STRIPE_WEBHOOK_SECRET`.
4. Test with Stripe test-mode keys and test cards first. Locally, use Stripe CLI forwarding to `/api/billing/webhook` and its generated signing secret.
5. A Checkout redirect never grants access. Only a signed webhook followed by current Stripe subscription lookup updates entitlements. Active/trialing subscriptions with the recognized CAD price qualify. Past-due/cancelled subscriptions restrict premium actions while preserving existing data and export.
6. Confirm business/tax settings and the legal refund/cancellation policy before accepting live payments. Taxes are not automatically calculated by this implementation.

The webhook serializes reconciliation per customer and deduplicates event IDs. Checkout creation is serialized and reuses a pending checkout; existing provider subscriptions go to the portal. The app uses Stripe's [raw-body signature verification](https://docs.stripe.com/webhooks/signature).

## Publication, scheduling, and job recovery

The canonical model is a versioned `Schedule` validated by Zod. Locations keep a mutable draft and concurrency version. Publishing locks the location, inserts one immutable revision per idempotency key, updates the public revision pointer, and inserts destination jobs in a single transaction.

Weekly periods, exceptions, announcements, and widget settings are typed JSONB inside drafts/revisions. This deliberate aggregate design keeps publication snapshots atomic; organizations, memberships, locations, revisions, jobs, connections, subscriptions, notifications, and activity are relational with foreign keys and indexes.

Website activation/expiry is calculated from the published revision and current business-local time **on the server at every request**. A browser timer is only a display refresh. No cron run, owner session, or open browser is required for a new visitor to receive the correct status. Holidays & exceptions automatically revert to weekly hours after their date range. Existing embedded pages refresh about every 30 seconds; public edge cache lifetime is at most 15 seconds. Browser throttling/background tabs can delay visual refresh.

Google special dates are submitted when a revision is published; Google applies its own scheduled special hours. External jobs remain in PostgreSQL until processed:

- `/api/cron` requires `Authorization: Bearer CRON_SECRET`.
- Automatic Google delivery is paused: `vercel.json` currently has no cron schedule. The worker and queued jobs are retained. Restore a minute-level Vercel cron on a supported plan or an authenticated external scheduler to resume delivery.
- A run processes one job, bounded to fit the 60-second function budget. Increase worker capacity deliberately if backlog grows; monitor queue age.
- Workers use `FOR UPDATE SKIP LOCKED` and a location lock. They skip superseded revisions, serialize publication against delivery, and retry transient errors at 30, 60, 120… seconds up to six attempts.
- A process crash rolls back the database transaction so work remains recoverable. Repeating the same hours PATCH is idempotent. Provider-side timing after an ambiguous network failure cannot prove public ordering; inspect/reconcile the latest state if Google reports unexpected data.
- A failed job creates an in-app notification. Reconnect if necessary, then publish the current draft again to queue the latest version. History offers refresh and destination outcomes.

## Website installation

Copy a real snippet from Add to your website after creating your location:

```html
<div data-opensync="YOUR_LOCATION_UUID" data-type="hours"></div>
<script src="https://YOUR_DOMAIN/embed.js" defer></script>
```

Types: `hours`, `banner`, `status`. Multiple containers are supported. If custom scripts are blocked, use the iframe alternative shown in the configurator. The script adjusts frame heights; the plain iframe alternative uses a chosen fixed height.

- WordPress: Custom HTML block.
- Squarespace: Code block on an eligible plan.
- Shopify: Custom Liquid section.
- Wix: Embed HTML, often with the iframe alternative.
- Restrictive CSP: allow the OpenSync origin in `frame-src` and, for the loader, `script-src`.
- Top/floating presentation: install the container above your site's header or in a fixed-position host element, as explained in the configurator.

The configurator can open the public widget to test availability. It **does not claim to verify installation on another website**. Public responses contain the published business schedule, including future published exceptions/announcements; do not publish confidential future content.

## Demo and development data

`/demo` uses `localStorage` key `opensync-demo-v1`. Settings → Reset demo restores the café example. All demo controls are isolated from real accounts. Clear browser storage to reset it manually.

For a dedicated database development fixture, create a verified Supabase test user and set `DEMO_USER_ID` along with `DATABASE_URL`, then run `npm run db:seed`. The seed creates a separate organization; it never mixes sample data into ordinary sign-ups. Delete that dedicated organization through the test account or remove the test project when finished. Never seed production.

## Commands and validation

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

Unit/contract tests cover schedules, overnight carry, DST, exception precedence, expiry, plan gates, OAuth state, authenticated token encryption, Google request mapping/errors, Stripe signatures/prices, and escaped widget output.

Database tests run real PostgreSQL semantics in PGlite with a minimal test-only `auth` schema. They apply the migrations and exercise the actual management/public/worker route handlers: tenant authorization, RLS, immutable revisions, concurrent-edit rejection, publication idempotency, superseded jobs, retry/recovery, and account cleanup. The Supabase identity boundary and external providers are mocked. These tests are not a substitute for staging verification against hosted Supabase and providers.

Playwright covers demo publishing/persistence, widget previews, navigation, credential gates, and horizontal overflow on desktop and a mobile viewport. The live account test is credential-gated. To run it, set `E2E_EMAIL`, `E2E_PASSWORD`, and optionally `E2E_BASE_URL`, using a **fresh, dedicated verified account with no locations**, and run:

```sh
npx playwright test e2e/account.spec.ts --project=desktop
```

Reset the dedicated fixture before rerunning; it intentionally creates persistent data. Email verification delivery, real Google authorization/publication, real Stripe Checkout/webhooks, and account deletion should also be tested on staging.

Dependency notes: production audit was clean at verification. Development-only tooling has upstream moderate advisories. Next's bundled ESLint guidance explicitly supports ESLint 10 but notes older peer declarations in some bundled plugins; npm emits warnings, while clean-install resolution and lint pass. Do not use a forced audit downgrade or expose the development server publicly.

## Deploy on Vercel

1. Configure and migrate Supabase; test authentication locally.
2. Import this repository into Vercel using the Next.js preset and Node.js 24. Use `npm ci` and `npm run build`.
3. Add production environment variables in Vercel. Set `NEXT_PUBLIC_APP_URL` to the exact HTTPS origin, without a trailing slash. Public variables are baked into the build; rebuild after changing them.
4. Add the domain and HTTPS, then update Supabase redirects, Google OAuth redirect, and the Stripe webhook URL to match. Preview deployments must use their own matching app URL/redirect allowlist; writes from an unmatched origin are rejected.
5. Set a long random `CRON_SECRET` and verify authenticated minute-level invocations. Vercel sends the bearer secret to its cron endpoint.
6. Configure provider approval, SMTP, billing products/portal, and production quotas. Leave unconfigured providers disabled.
7. Finish legal/operator details, support operations, monitoring, backups/restore testing, data retention, and a staging acceptance pass.
8. Verify a real public embed from another origin without being logged in. Publish a change and confirm it updates. Only then invite customers.

There is no deployed URL or connected production service included in this workspace.

## Project map

| Path                                                       | Responsibility                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `src/lib/domain.ts`                                        | Validation, timezone/DST schedule evaluation, feature gates |
| `src/db/`, `migrations/`                                   | Drizzle schema, PostgreSQL constraints, RLS, cleanup        |
| `src/lib/supabase.ts`, `src/proxy.ts`                      | Authentication/session handling                             |
| `src/app/api/manage/`                                      | Authorized drafts, publication, accounts, team/support      |
| `src/lib/google.ts`, `src/app/api/google/`                 | OAuth/token lifecycle and Google API                        |
| `src/app/api/cron/`                                        | Durable destination worker                                  |
| `src/lib/stripe.ts`, `src/app/api/billing/`                | Verified billing and checkout                               |
| `src/components/`                                          | Dashboard, editors, reusable widget and UI components       |
| `src/app/embed/`, `src/app/api/public/`, `public/embed.js` | Public embedding surface                                    |
| `tests/`, `e2e/`                                           | Domain, SQL, provider-contract and browser tests            |

See [architecture and operational limits](docs/ARCHITECTURE.md) before extending the app.

# Native iOS companion

The SwiftUI iPhone/iPad project is in [`ios/`](ios/README.md). It reuses the existing backend and accounts. The native source, App Store configuration, signing scripts, and macOS test workflow are included; a signed IPA still requires Xcode, live service configuration, and an Apple Developer account. See the iOS README for the exact validation status and build instructions.

## Social posts

Create Instagram/Facebook posts and stories from hours or custom announcements. Download PNGs and captions, or connect Meta to publish directly to Facebook Pages and linked Instagram professional accounts (Business accounts for Instagram stories). Review the exact image and destination before publishing. Requests and provider outcomes are saved, with duplicate protection and explicit unconfirmed results after ambiguous failures. No cron is required. Browser drafts stay local; direct publishing uploads are retained temporarily on the server.

Apply migration 004 and configure the Meta app before enabling connections. See [Meta setup and publishing recovery](docs/META-SETUP.md) for credentials, permissions, callback URLs, account requirements and live verification. Social scheduling is not included.
