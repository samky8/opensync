# OpenSync privacy and data-handling audit

**Audit date:** 2026-11-28  
**Scope:** Next.js web application and API, PostgreSQL migrations, Supabase authentication, public widgets, iOS application, browser storage, Google Business Profile, Google sign-in, Meta, Stripe, Resend, Google Analytics, and deployment configuration present in this repository.  
**Status:** Findings only. No application or privacy-policy change was made.

## Executive summary

The codebase contains meaningful privacy and tenant-isolation safeguards: server-side membership checks, defence-in-depth PostgreSQL RLS for direct client reads, no client write grants, AES-256-GCM encryption of Google and Meta tokens, origin checks on browser mutations, one-time OAuth state, explicit Google publishing review, iOS Keychain storage, and cascading primary-database deletion for owned workspaces. The automated suite passed: 19 test files and 145 tests.

The proposed policy must not be published yet. The most important blockers are:

1. Google Analytics is enabled by a hard-coded fallback and loads in the root layout on marketing pages, authenticated pages, authentication pages, and third-party website widget iframes. There is no consent or preference mechanism. Widget visitors therefore reach Google Analytics, contrary to the draft's incomplete tracking disclosure and the current page's implication that widgets collect only operationally necessary data.
2. Google-originated hours imported into an OpenSync draft are not reliably distinguishable from user-entered data and can be retained indefinitely. Weekly-hour provenance is lost; some special hours retain only a human-readable label. No 30-day purge exists. The proposed statements about separation and 30-day caching are not supported.
3. Authentication rate limiting stores the normalized email address in `rate_limits.key`. Cleanup is probabilistic (a 1% chance on later rate-limit calls), so email addresses, user IDs, and hashed IP keys may remain indefinitely and are not removed by account deletion.
4. Meta disconnect removes the local encrypted Page token but does not revoke authorization at Meta. Full account deletion likewise deletes the local token before any provider revocation. The UI correctly tells users to remove OpenSync through Facebook Business Integrations, but the proposed policy is too broad if it implies OpenSync revokes Meta access itself.
5. The data export is incomplete for a privacy access request. It omits support requests, social connections and publications, saved background images, activity/jobs/notifications, interests, notification delivery records, billing/trial records, and most authentication/provider metadata.
6. Backup retention, production regions, infrastructure log retention, staff access controls, incident processes, and provider contract settings cannot be established from source code. Those facts must be supplied before publication.

The local environment is not a production configuration: its app URL is a Vercel preview domain; Google Business Profile approval and Google sign-in are disabled; Stripe and Resend are unconfigured; Meta credentials are present; and no Google Analytics environment variable is set, which causes the hard-coded Analytics ID to be used.

## 1. Confirmed data-handling practices

### 1.1 Providers and integrations

| Function | Provider or system | Confirmed implementation | Configuration status visible locally |
|---|---|---|---|
| Web hosting, server functions, scheduler, request edge | Vercel | `vercel.json` defines a Vercel cron; code trusts `x-vercel-forwarded-for`; deployment documentation targets Vercel | App URL points to a `vercel.app` preview; production project settings and region not verified |
| Database | PostgreSQL, documented as Supabase-hosted | Drizzle/postgres-js uses server-only `DATABASE_URL`; migrations create all product tables | Exact Supabase project, database region, plan, backups, PITR, and log settings not verified |
| Authentication | Supabase Auth | Email/password, email verification, reset, cookie sessions, optional Google sign-in, bearer validation for iOS | Supabase URL/key present; Google sign-in disabled locally |
| Web analytics | Google Analytics 4 | `@next/third-parties/google`; global root-layout loading; custom events | Always enabled because of hard-coded fallback `G-YEWELHFR22` even without an env value |
| Payments | Stripe | Customer creation, Checkout, Billing Portal, signed webhooks, subscription cancellation | Code implemented; local keys absent |
| Application email | Resend | Notification worker sends account email, subject, plain text and HTML | Code implemented; local key/from address absent. Supabase Auth email provider is separate and unknown |
| Google business integration | Google OAuth 2.0, Business Profile Account Management API, Business Information API | Account/location discovery, hour import, periodic comparison, hours PATCH, token refresh/revocation | Disabled locally because approval flag is false |
| Google account login | Google through Supabase Auth | `signInWithOAuth({provider: 'google'})` | Disabled locally; exact consent-screen/provider configuration cannot be verified from code |
| Social integration | Meta Facebook Login/Graph API, Facebook Pages, Instagram professional accounts | Page discovery, account metadata, photo/container creation, Facebook/Instagram publication | Meta credentials and a Facebook Login for Business config ID are present locally; live approval/grants not verified |
| iOS distribution | Apple App Store | Native SwiftUI client uses the same Supabase Auth and Next.js APIs | App Store Connect disclosures and submitted build not available |

No Sentry, ad network, AI model provider, data broker, or external customer-support platform was found in the runtime dependencies or application calls. This does not prove that none is configured outside the repository.

### 1.2 Where information is stored or processed

- **Supabase Auth:** email address, password verifier/authentication records, verification and reset state, sessions/refresh tokens, provider identities and provider metadata created by enabled social login. Exact Supabase Auth logs and SMTP delivery provider are not visible in code.
- **PostgreSQL:** organizations and memberships; business profiles; drafts and immutable publication revisions; hours, exceptions, announcements, addresses, websites, time zones, logos and widget settings; activity and job results; Google connections; Meta connections and publication history; saved social images; support messages and social-interest records; preferences and queued notification bodies; billing identifiers/status; trial state; webhook event IDs; OAuth state; rate-limit keys.
- **Browser cookies:** Supabase SSR session cookies (names and lifetime are library/config dependent); `google_oauth` containing OAuth state and a location UUID for 10 minutes; `meta_oauth` containing OAuth state for 10 minutes; Google Analytics cookies/identifiers when GA runs. Google, Meta and Stripe may also set first-party cookies on their own sites during redirects.
- **Browser local storage:** `opensync-demo-v1`; `opensync-sidebar-collapsed`; `opensync-social-v1:<locationId>` and platform-specific variants containing social design/caption/image state; `opensync-social-presets-v1:<locationId>`; demo saved-background keys.
- **Browser session storage:** `opensync-home-setup-dismissed`; publish idempotency keys containing location/version/scope data; `analytics-checkout-<Stripe checkout session ID>`.
- **Service worker:** registered in production, but deliberately does not populate Cache Storage with pages, sessions, or API data.
- **iOS device:** Supabase access and refresh token JSON in a generic-password Keychain item using `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`; live API data in application memory; exported JSON may be handed to a user-selected share destination.
- **Vercel:** requests and responses are executed on Vercel and request metadata may appear in platform logs/observability according to project settings. Retention and regions are not in the repo.
- **Google Analytics:** page and device/request data generated everywhere the root layout runs, plus custom events including signup method, checkout start, purchase plan/value and Stripe Checkout session ID, and widget creation.
- **Stripe:** account email and OpenSync account UUID in Customer metadata; checkout/subscription/payment and billing portal data.
- **Resend:** recipient email, notification subject/body, sender, and idempotency key when notification email is configured.
- **Google:** OAuth client data and tokens; accounts, locations, names/titles, regular and special hours read by OpenSync; regular/special hours sent by PATCH after user publication.
- **Meta:** OAuth/client data and tokens; Page IDs/names/tasks and linked Instagram ID/username/account type read by OpenSync; approved image/caption and publication calls sent to Facebook or Instagram.
- **Public Internet/customer websites:** a published schedule can be read through a UUID public API/embed. It includes business name, category, address, website, logo, time zone, regular/special hours, announcement records, widget configuration, and future/disabled entries within the published snapshot. The endpoint is intentionally CORS-public and `noindex`, but a location UUID is not an access-control secret.

### 1.3 Personal and business information inventory

Confirmed or potentially personal information includes:

- Account UUID; email address; password submitted to Supabase Auth; email verification and recovery state; Supabase session/access/refresh tokens.
- When Google sign-in is enabled, provider identity/profile metadata made available by the Supabase Google provider. The exact scopes and stored fields are not specified in application code.
- Organization membership and role (`owner`, `admin`, `editor`, `viewer`); invited staff email lookup; actor UUIDs and activity history.
- Business name, category, street address, website, logo/monogram, time zone, opening hours, special dates and labels, announcements, CTA text/URL, branding and widget preferences.
- Support messages and requested social-feature interests.
- Notification choices, alert messages, email subject/body, send status and provider error.
- Stripe customer, subscription and checkout session IDs, plan/status, account UUID metadata and account email. Full card data is not handled by OpenSync code.
- Google OAuth tokens, Google account/location resource IDs, business location titles and hours, connection state, API errors and publication job history.
- Meta Page and Instagram identifiers/names/types, encrypted Page access token, social caption, generated/uploaded image, saved background image, provider container/post IDs, publication status and error.
- Raw normalized email in authentication rate-limit keys; account UUIDs in authenticated rate-limit keys; hashed IP addresses for public API/embed rate limiting. The IP hash is unsalted and should be treated as pseudonymous personal information.
- GA identifiers, page locations/referrers, browser/device/network-derived data, events, plan/value, and Stripe Checkout session ID. Exact GA collection, Signals, retention, User-ID, advertising features, and consent-mode settings require the Analytics property configuration.
- Vercel, Supabase, Google, Meta, Stripe, Resend and Apple diagnostic/security logs may contain IP address, device/browser data, request IDs and account/provider identifiers according to their dashboards and contracts; these are not knowable from source alone.

### 1.4 Authentication and token lifecycle

**Web/Supabase**

- Server routes call Supabase `getUser`, not unverified local JWT claims.
- Browser sessions are maintained by the Supabase SSR cookie adapter and refreshed by the Next.js proxy.
- Browser logout calls Supabase `signOut()` with its default scope.
- Admin account deletion calls `auth.admin.deleteUser`. The code does not explicitly revoke all sessions before deletion; an already-issued JWT may remain cryptographically valid until expiry even though `getUser` should reject a deleted identity. JWT expiry/session configuration is not in the repo.

**iOS/Supabase**

- Access and refresh tokens are held only in memory and a This-Device-Only, When-Unlocked Keychain item.
- Refresh is serialized so concurrent requests share one rotation.
- An ephemeral `URLSession` disables cookie storage and URL caching, and authentication redirects are rejected.
- Sign-out calls Supabase logout with `scope=local`, then clears memory and Keychain. This logs out the current session/device, not all sessions.

**Google Business Profile**

- The sole requested scope is `https://www.googleapis.com/auth/business.manage`.
- OAuth uses a 256-bit random state stored in a ten-minute HttpOnly, SameSite=Lax cookie; callback state is compared in constant time and the callback rechecks signed-in write access.
- Access and refresh tokens are encrypted with AES-256-GCM using a server environment key and stored in PostgreSQL. Tokens do not reach the browser.
- Expired access tokens are refreshed server-side and the encrypted bundle is replaced.
- Disconnect revokes the refresh token (or access token fallback) at Google's revocation endpoint and only then deletes the local connection. A Google revocation failure blocks local disconnect/account deletion, except Google's `400` response is accepted as already invalid.
- There is no key versioning or automated encryption-key rotation path.

**Meta**

- OAuth state is stored as a SHA-256 hash in PostgreSQL and the raw value in a ten-minute secure HttpOnly SameSite=Lax cookie. State is consumed once and bound to the initiating user/location.
- With `META_LOGIN_CONFIG_ID`, the authorization request uses the saved Meta configuration rather than the five fallback code scopes. The actual requested permissions must therefore be verified in the Meta dashboard. The fallback list is `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
- A short-lived user token is exchanged for a long-lived user token, Pages are discovered, and per-Page access tokens are encrypted with the same AES-256-GCM mechanism. Tokens do not reach the browser.
- Disconnect deletes the local `social_accounts` row/token. It deliberately keeps publication history and does not call Meta to revoke authorization.

### 1.5 Google and Meta data/API calls

**Google Business Profile reads**

- `accounts.list` requests account resource identifiers.
- `locations.list` requests `name,title,regularHours,specialHours`.
- A daily discrepancy check may read `regularHours,specialHours` for a connected location.
- There are no Gmail, Drive, Contacts, Calendar, Photos, or other Google-service calls in this integration.

**Google writes and authorization**

- Only `regularHours,specialHours` are sent with the update mask. Address, category, open/closed status and announcements are not patched.
- A user with owner/admin/editor workspace write access must connect the Google account, select a location, open a publish review, and choose whether Google is included. A queued worker performs the previously authorized hours PATCH and checks entitlement and current connection again.
- The UI requires confirmation before replacing a local draft with Google hours and requires the normal save/publish flow afterward.
- The code does not automatically revert Google changes.

**Google 30-day content rule**

Google's current [Business Profile API policies](https://developers.google.com/my-business/content/policies) allow only limited temporary storage of API Content for performance, for no more than 30 calendar days, securely and without manipulation/aggregation. They also require prior specific and express consent for listing edits and require disassociation/removal of management permissions within seven business days after the end-client relationship ends.

- Direct fetches use `cache: 'no-store'`, and discovery responses are returned to the browser rather than written wholesale to a cache table.
- The selected Google location resource ID is stored until disconnect/deletion.
- Imported Google weekly/special hours can be saved inside ordinary `locations.draft` and later immutable `revisions.snapshot` rows indefinitely.
- Weekly imported hours have no provenance marker. Special exceptions get labels such as “Imported from Google,” but labels are editable and are not retention metadata.
- There is no `source`, `obtained_at`, `expires_at`, refresh, or 30-day purge mechanism for imported Google content. OpenSync and Google-origin information therefore cannot be reliably separated.
- The periodic discrepancy check stores only a short hash of normalized Google hours in a notification dedupe key, not the hours themselves.

**Meta reads/writes**

- Reads `me/accounts` fields `id,name,access_token,tasks,instagram_business_account{id}`, then linked Instagram `id,username,account_type`.
- Retains only Pages with `CREATE_CONTENT` or `MANAGE` task.
- Creates unpublished Facebook photos, Facebook feed posts or photo stories; creates Instagram media containers, checks container status, then publishes.
- Each publication request is tied to a location and connected account, is origin checked, membership checked, rate limited, payload hashed for idempotency, and explicitly initiated from the UI. Ambiguous outcomes are not automatically retried.

### 1.6 Deletion, disconnect, retention and orphans

**Primary account deletion**

- Web deletion requires typing `DELETE`; an active subscription must first be cancelled in the Billing Portal.
- iOS deletion requires typing `DELETE` and explicitly requests immediate Stripe cancellation before deletion.
- Account deletion attempts to revoke every Google connection in every owned location, then deletes the Supabase Auth user.
- A `BEFORE DELETE` database trigger deletes every organization for which the user is owner. Foreign-key cascades remove memberships, locations, revisions, jobs, connections, social OAuth/account/publication/background rows, notifications/checks/deliveries, and current account billing/trial/webhook rows. Personal interests, support and preferences also reference the Auth user with cascade.
- Activity/revision actor UUIDs belonging to a deleted non-owner are nulled; business records remain for the organization.
- The real-SQL tests confirm primary-table cleanup for owned locations/revisions and account billing/trial rows. Supabase, Stripe, Google and Meta are mocked in these tests.

**Known retained or orphanable data**

- `rate_limits` has no user foreign key. Authentication keys contain raw email, and authenticated keys contain UUIDs. Cleanup is probabilistic, so old rows have no guaranteed deletion time and survive account deletion.
- Meta authorization is not remotely revoked. Existing Meta posts remain. Local publication history intentionally remains after a connection-only disconnect, with `account_id` set to null and account name/provider IDs retained; it is removed when the owned location/account is deleted.
- Meta OAuth state expires after ten minutes but expired rows are removed only when another connection begins. Cascades remove them on user/location deletion.
- Social publication image access expires after 24 hours, but the base64 image is nulled only when another publication is created. It can remain in PostgreSQL indefinitely if no later publication occurs. Captions, hashes, account names, IDs, result/error and other publication metadata remain until location/account deletion.
- Saved custom background images remain until individually removed or location/account deletion.
- Immutable schedule revisions, jobs and activity have no ordinary retention limit and last for the workspace lifetime.
- Stripe customer/payment/legal records, Google/Meta provider logs/content, GA data, Vercel logs, Supabase logs/backups, Resend email records and Apple records follow provider/operator settings that are not in this repo.
- The database backup retention period and restore-copy deletion behavior are unverified. No code can erase already-created backups.

### 1.7 Organization permissions and isolation

- Every server read/write begins from the signed-in user and target location, then joins membership; client-supplied organization IDs do not grant access.
- Owners, admins and editors can write schedules and connect/disconnect/publish to Google and Meta. Viewers are read-only for normal schedule/publication operations.
- Only owner can manage team roles or claim a workspace trial. Owner/admin can add locations. The team UI can add/change existing verified users but has no complete member-removal/invitation workflow.
- Direct browser database writes are revoked. Selected tables allow authenticated reads protected by membership-based RLS; token, billing, support, social and notification-delivery tables have client grants revoked.
- Tests exercise cross-tenant denial and direct RLS denial for another user.
- **Permission defect:** `op='read'` is permitted to viewers and updates `read_at` for all organization notifications. Notification read state is global to the organization, so one viewer can mark every member's notifications read.
- All members who can read a workspace can see business data, up to 30 activity/job records, organization notifications, Google connection state/remote ID, and social account/publication metadata. The policy should describe organization-admin/team access in these terms.

### 1.8 Diagnostics and credentials

- Normal API error logging emits only event/type for unexpected application errors.
- Google errors are reduced to status-derived messages; tokens are not logged.
- Meta callback logging records start/success/Page count and logs the caught error object. Present error classes contain codes/messages, not tokens, but logging raw unknown errors is avoidable risk.
- Meta logs Instagram account type but not username/token.
- Activity history stores Meta remote publication IDs and account names; Google jobs store provider result/error text and revision/location context.
- Notification failures store provider status/error text. Stripe webhook payloads are not logged by application code.
- Repository-local `.log` files are ignored and the sampled logs contained framework/browser diagnostics rather than credentials. A pattern scan found only deliberate test fixture tokens. This is not a production log review.
- `.env.local`, iOS local xcconfig and common credential files are ignored by Git. The checked worktree contained no tracked secrets found by the targeted scan.

### 1.9 Third-party website widget visitors

- The embed script creates an OpenSync iframe and sends host font family/size through `postMessage`. It does not read form values, cookies, DOM content, or host analytics.
- The iframe request discloses request metadata to OpenSync/Vercel, including IP and the embedding site's origin through the referrer policy. OpenSync stores a hash of the IP in PostgreSQL for rate limiting.
- The public widget API is fetched every 60 seconds while visible. Public edge caching is 15 seconds.
- Because the iframe uses the global root layout, it also loads GA and registers the service worker on the OpenSync origin. GA may receive visitor/referrer/device data and set/read Analytics identifiers subject to browser third-party-cookie rules.
- There is no widget-specific consent signal, Global Privacy Control handling, host consent API, or analytics-free embed layout.
- Private account, billing and token data are not returned by the public endpoints. However, the full published snapshot exposes future/disabled announcements and other future schedule content, not only the content currently rendered.

### 1.10 iOS privacy and account deletion

- The native app contains no advertising or analytics SDK and declares tracking false.
- Its privacy manifest declares linked email address, user ID, other user content and customer-support data for app functionality. This is directionally consistent with the native flows, but the actual App Store Connect privacy label and provider-side diagnostics must be checked separately.
- Apple requires disclosure of data collected by the app and third-party partners in App Store Connect, and a public privacy URL. See [App privacy details](https://developer.apple.com/app-store/app-privacy-details/).
- Account deletion is easy to find in Settings, deletes the whole account rather than only deactivating it, explains subscription cancellation and permanence, and completes through the API. This meets the structural requirement of Apple's [Guideline 5.1.1(v)](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/), subject to live end-to-end verification.
- The deletion UI says stored connections are deleted; Google is revoked before deletion, but Meta is only locally deleted. The statement should distinguish provider revocation.
- The app does not implement Sign in with Apple, in-app purchases, ATT permission, location, camera, microphone or contacts access.

## 2. Proposed privacy-policy statements that are inaccurate or unverified

### Inaccurate or materially incomplete

1. **“Information entered independently by users into OpenSync is retained separately” (Google section):** false for imported weekly hours and not reliable for special hours. Google data is merged into the same schedule/revision schema.
2. **Google API content cached no longer than 30 days:** not enforced for imported hours. A policy promise would be false until provenance/expiry or a policy-approved redesign is implemented.
3. **Widget visitors generate only limited technical information necessary to deliver and secure widgets:** incomplete because GA is not necessary to deliver/secure a widget and is loaded globally.
4. **Cookies/local storage placeholder:** must enumerate GA and application storage. Current implementation includes real-account social drafts/presets, not only demo storage.
5. **Meta users may disconnect/revoke through OpenSync:** local disconnect is implemented, remote Meta revocation is not. Users must separately remove the Business Integration unless code is added.
6. **Account data list says “name”:** email/password signup does not ask for a person's name. Google sign-in may supply profile metadata if enabled, but exact fields are configuration-dependent.
7. **Business “contact information”:** address and website are collected; no business phone field was found.
8. **Data export implication:** current export is not a complete copy of personal information.
9. **Diagnostic information description:** the app also stores raw email in rate-limit keys, hashed IP keys, provider IDs/outcomes, notification bodies and GA events. These need explicit treatment.
10. **Current on-site statement “No advertising trackers are included”:** GA is analytics, not an ad SDK, but the wording obscures material third-party tracking/measurement and is unsuitable without a clear GA disclosure and configuration review.

### Configuration-dependent or cannot be verified from code

1. Legal operator name, business address, privacy email, effective date and responsible privacy officer.
2. Whether PIPEDA and/or provincial private-sector privacy statutes apply to the operator and customers; legal review is required.
3. Production countries/regions for Vercel compute/logs, Supabase Auth/database/backups/logs, Google Analytics, Stripe, Resend, Google, Meta and Apple.
4. Backup types, backup retention, point-in-time recovery, restore testing and deletion from backups.
5. Vercel/Supabase/provider diagnostic-log contents and retention.
6. Human access controls, personnel authorization, support access, audit logs, training, confidentiality agreements and incident-response practices.
7. Contractual assurances that providers do not use data for advertising, brokerage, or AI training. No application code sends data to an AI service, but contracts/operations are required to make the broader promise.
8. GA property configuration: data retention, Signals, advertising features, User-ID, enhanced measurement, consent mode, data sharing and deletion controls.
9. Exact Supabase Google sign-in scopes and provider metadata; code supplies no explicit scopes.
10. Exact Meta permissions/assets in the configured Facebook Login for Business configuration; the local app uses `config_id`, so the code fallback list is not authoritative.
11. Whether Google Business Profile API approval/quota and Meta App Review approvals are active in production. The local Google approval flag is false.
12. Production Stripe and Resend use. They are implemented but not locally configured.
13. Supabase Auth's outbound email/SMTP provider and retention.
14. Operational ability to complete Google management disassociation requests within seven business days when self-service fails.
15. Retention periods for accounts, revisions, activity, support, interests, notifications, social metadata, billing identifiers and provider-held records.
16. Children's-data operational knowledge and age controls. The business-oriented product is not directed to children, but there is no age gate.
17. Whether `opensync.ca` is the final production origin. Local configuration still uses a Vercel preview URL.

## 3. Missing privacy and security functionality

### Critical/high

- Google-origin provenance and 30-day retention enforcement for imported Business Profile content.
- Analytics-free widgets and authenticated/authentication surfaces, or a lawful consent/preference design before GA loads; elimination of the hard-coded GA fallback.
- Deterministic rate-limit expiry and account deletion cleanup; authentication identifiers should be keyed with HMAC rather than raw email.
- Remote Meta authorization revocation on disconnect/account deletion, or an explicitly manual, verified deletion flow with accurate disclosures.
- Complete privacy access/export response covering all user-linked tables and relevant auth/provider metadata.

### Medium

- Scheduled cleanup for expired social image payloads and expired Meta OAuth state.
- Explicit all-session revocation during account deletion; a user-facing “sign out all devices” option; verification of short JWT lifetime/session policies.
- Per-user notification read state and viewer-safe mutation authorization.
- Data-minimized public widget payload. Future/disabled announcements and unused schedule fields should not be exposed merely because a snapshot was published, unless this is a deliberate and clearly explained product rule.
- A public privacy contact and deletion path usable by people who cannot sign in.
- Defined retention schedule implemented with jobs/constraints and legal-hold exceptions.
- Token encryption-key versioning/rotation procedure.
- Production privacy/security log review and redaction standard; avoid logging raw unknown error objects.
- Complete team removal/invitation administration and clearer role capability descriptions.

### Operational evidence missing

- Production asset/data-flow inventory approved by an owner.
- Provider DPAs/terms and subprocessor list.
- Backup/restore evidence and backup deletion statement.
- Access-control roster and periodic review.
- Incident/breach response and privacy request procedure.
- Staging evidence for account deletion, Google revoke, Meta disconnect/revoke, Stripe cancellation, Supabase cleanup and iOS flow.
- App Store Connect privacy answers matching the production build and providers.

## 4. Recommended code changes, prioritized

### P0 — resolve before publishing the policy or enabling affected integrations

1. **Remove global unconditional GA.** Require an explicit analytics ID with no fallback; do not render GA on `/embed`, `/dashboard`, `/auth`, login/signup/reset, API, or privacy-sensitive callback pages. If analytics remains on marketing pages, add consent/preference and region-appropriate controls before loading it. Do not send Stripe Checkout session IDs to GA; strip sensitive query parameters from page URLs/events.
2. **Fix Google data provenance/retention.** Do not persist imported Google API Content as ordinary indefinite data unless counsel/Google approval confirms the transformation and end-client action makes it independently supplied. Safer design: store `source='google'`, `source_obtained_at`, a source object/version, and enforce deletion/refresh by day 30, while requiring the user to re-enter/affirm data that should become independent OpenSync content. Purge or migrate existing imported data identified by labels, recognizing weekly imports cannot currently be identified reliably.
3. **Fix rate-limit personal data.** Replace `auth:<raw email>` with an HMAC using a dedicated server secret; HMAC user IDs/IPs consistently; add a deterministic scheduled delete for expired buckets; delete user-keyed rows during account deletion. Do not rely on a 1% opportunistic cleanup.
4. **Implement Meta revocation semantics.** Verify the appropriate current Meta endpoint/product flow, revoke/remove authorization on disconnect and deletion where supported, and handle failure/retry before deleting the only local credential. If provider revocation must remain manual, make the UI and policy unambiguous and preserve an auditable completion path.
5. **Expand export.** Include account/auth metadata that can safely be exported, organizations/memberships, schedules/revisions, activity/jobs/notifications, support/interests/preferences, social accounts/publications/backgrounds, billing/trial identifiers/status, and retention/exclusion notes. Never export access/refresh tokens, secrets or password verifiers.

### P1 — complete before general production launch

6. Add daily cleanup for expired `social_publications.image` and `social_oauth`, plus explicit retention policies for activity/jobs/notification deliveries/support/interests/webhook events.
7. Revoke all Supabase sessions before user deletion, then delete the Auth user; test that all old web/iOS access tokens fail immediately or document the bounded JWT window.
8. Make notification read state per user, and require an authorized role for any organization-wide mutation.
9. Return widget-specific public DTOs rather than the entire schedule snapshot. Exclude disabled/future announcements until intended display, internal IDs, unused style data and fields not needed for the requested widget.
10. Add a privacy-request endpoint/contact available without authentication, with abuse protection and identity-verification workflow.
11. Add token ciphertext version/key ID and a rotation migration procedure; separate Google/Meta token keys if operationally appropriate.
12. Redact/log structured provider codes only in the Meta callback; define log retention and access controls.
13. Add tests for raw-email absence in rate-limit rows, deterministic cleanup, Google 30-day expiry/provenance, Meta revoke-before-delete, comprehensive export, old-session invalidation, viewer notification isolation and minimized widget payloads.

### P2 — hardening and governance

14. Add a documented privacy data map/retention matrix maintained with schema migrations.
15. Add complete team removal, membership audit history and owner-transfer/offboarding rules.
16. Add CSP appropriate to each surface, especially a minimal embed policy; verify HSTS and other platform headers in production.
17. Add automated checks preventing GA/third-party scripts from entering embed/authenticated layouts.
18. Add a production deletion verification job/process for provider and backup lifecycle, with user confirmation where deletion is asynchronous.

## 5. Information required from the owner before publication

Please provide or confirm all of the following:

1. Legal operator name, legal form, Ontario mailing address (or approved contact address), privacy officer/contact name, public privacy email and support email.
2. Intended effective date and jurisdictions/customer markets at launch; legal counsel's determination of applicable Canadian/provincial and any non-Canadian privacy laws.
3. Final production domain and whether preview/staging systems may contain real customer data.
4. Vercel project plan, compute/functions regions, log/analytics products enabled, log retention and staff access.
5. Supabase project region and plan; database backup/PITR schedule and retention; Auth/audit/log retention; SMTP/email provider; JWT lifetime and session controls; staff access and deletion behavior for backups.
6. Google Cloud project/consent-screen configuration, approved status, production OAuth scopes, test/production users, data-access review, and whether imported hours are intended to be retained as user-adopted data or only temporary API content.
7. Meta App ID configuration evidence: Facebook Login for Business permissions/assets, App Review status, data-use check status, token/revocation behavior, and chosen public data-deletion instructions/callback process.
8. Google Analytics property settings: measurement ID, property/account owner, retention period, Signals, advertising features, enhanced measurement, User-ID, consent mode, data sharing, internal traffic filters and deletion process. Also decide whether analytics is needed at all on authenticated surfaces.
9. Stripe production status, merchant legal name, tax/refund/cancellation rules, record-retention obligations and who can access Stripe data.
10. Resend production status, sending region/retention/recipient data handling and sender address. Separately identify the Supabase Auth email provider.
11. Written retention periods and legal bases/purposes for each category: active account, deleted account, support, interests, revisions/activity/jobs, notifications/deliveries, social media/images, billing IDs/webhook events, rate limits, logs and backups.
12. Staff/contractor access model, access review cadence, encryption/secret management process, incident-response/breach procedure, privacy-request verification and response process.
13. Whether provider data may be used for product analytics, marketing, AI/model training, or only service delivery; supporting contract/setting evidence for any “never” statement.
14. Whether the service accepts minors or will remain business-only without an age gate.
15. App Store Connect privacy-label answers, final privacy URL, distribution countries, submitted build/version and a live deletion test account.
16. Decision on public data semantics: should published future/disabled announcements and future schedule entries be retrievable before display, or should public endpoints minimize them?
17. Decision on organization role semantics: confirm that editors may connect/disconnect Google and Meta and publish externally, and that all members may see provider/activity metadata.
18. Evidence from staging/live tests for Supabase deletion/session revocation, Stripe cancellation, Google revoke/disassociate, Meta revoke/manual removal, database cascades, and restoration/backups.

## Publication gate

Do not replace or publish the privacy page solely from this audit. First resolve or explicitly accept the P0 issues, supply the operational facts above, and have the final policy reviewed for the operator's actual legal obligations. After approval, the policy can be drafted from verified facts, added to `/privacy`, linked consistently in the marketing footer/auth/iOS surfaces, and tested in the deployed production configuration.

## Evidence index

- Global GA and fallback ID: `src/app/layout.tsx:8`, `src/app/layout.tsx:42`
- GA purchase/session identifier: `src/components/dashboard.tsx:712-720`
- Auth rate-limit email and probabilistic cleanup: `src/app/auth/route.ts:34`, `migrations/001_initial.sql:24`
- Google scope and API fields: `src/app/api/google/connect/route.ts:27`, `src/app/api/google/locations/route.ts:13-20`, `src/app/api/cron/route.ts:63`
- Google token encryption/revocation: `src/lib/google.ts:9-29`, `src/lib/google.ts:126-141`
- Google import provenance: `src/lib/google-import.ts:19-75`, `src/components/dashboard.tsx:3348-3387`
- Meta permissions/config and token storage: `src/lib/meta-config.ts:40-55`, `src/app/api/social/callback/route.ts:42-65`
- Meta local-only disconnect: `src/app/api/social/accounts/route.ts:50-77`
- Social image expiry/cleanup: `src/lib/social-publishing.ts:106-124`
- Tenant checks and viewer notification mutation: `src/lib/server.ts:25-41`, `src/app/api/manage/route.ts:178-199`
- RLS/grants and account cleanup trigger: `migrations/001_initial.sql:45-65`
- Account deletion route: `src/app/api/manage/route.ts:134-176`
- Public full-snapshot endpoint/embed rate limits: `src/app/api/public/[id]/route.ts:8-42`, `src/app/embed/[id]/page.tsx:14-51`
- Browser storage: `src/components/dashboard.tsx:691-720`, `src/components/dashboard.tsx:728-771`, `src/components/dashboard.tsx:962-979`, `src/components/social-composer.tsx:254-364`, `src/lib/social-presets.ts:105-151`
- iOS token protection/sign-out: `ios/OpenSync/API.swift:40-68`, `ios/OpenSync/API.swift:136-145`
- iOS deletion: `ios/OpenSync/SettingsView.swift:24-53`, `ios/OpenSync/AppModel.swift:124-136`
- iOS privacy manifest: `ios/OpenSync/PrivacyInfo.xcprivacy:4-12`
- Current privacy template: `src/app/[info]/page.tsx:96-148`
- Operational limitations already acknowledged by the repo: `docs/ARCHITECTURE.md`, `docs/LAUNCH-CHECKLIST.md`

