# Launch readiness

## Working locally

- [x] Marketing, help, legal templates, credential setup states.
- [x] Browser-persistent, isolated café demo and reset/export.
- [x] Typed schedule editor, special hours, announcement management, widget previews.
- [x] PostgreSQL migration/route tests with real SQL and mocked identity/providers.
- [x] Desktop/mobile demo publishing and navigation browser tests.
- [x] TypeScript, lint, automated tests, and a production build have passed during implementation. Rerun after configuration or code changes.

## Prepared for deployment, not yet live

- [x] Next.js/Vercel build, environment template, migration runner, locked dependencies.
- [x] RLS, tenant authorization, protected mutations, encrypted Google tokens.
- [x] Immutable revisions, idempotency, stale-job protection, retry worker.
- [x] Stripe signature verification and server-side entitlement enforcement.
- [x] PWA manifest, generated icons, safe offline fallback, SEO metadata.
- [ ] Deploy to a staging HTTPS origin and complete the real-account acceptance journey.
- [ ] Verify provider configuration, rate limits, monitoring, error reporting, backups, and recovery.
- [ ] Load-test the public widget endpoint and job backlog under expected traffic.
- [ ] Perform a security/accessibility review for the production configuration.

## External credentials required

- [ ] Supabase URL, anon key, PostgreSQL connection, and deletion service-role key.
- [ ] Production SMTP for verification and recovery messages; tested deliverability.
- [ ] Stripe keys, signed endpoint, exact CAD prices, configured Billing Portal.
- [ ] Google OAuth client, encryption key, consent settings, scopes, selected business location.
- [ ] Authenticated minute-level scheduler and secret.
- [ ] Run credential-gated browser onboarding/public-embed test. It is skipped without a dedicated verified test account.
- [ ] Test real payments, cancellations, duplicate/out-of-order webhooks, OAuth refresh/revocation, and live Google API requests.

## Google approval required

- [ ] Business Profile API project approval and usable quota.
- [ ] Account Management and Business Information APIs enabled.
- [ ] OAuth verification/consent review as applicable to the production audience.
- [ ] Verify submitted hours in the provider response and separately inspect public visibility. Do not convert accepted API responses into claims of confirmed Maps visibility.

## Domain, legal, and business configuration required

- [ ] Production domain, HTTPS, exact app origin, callback URLs, and webhook destination.
- [ ] Replace legal templates with reviewed terms/privacy identifying the actual operator.
- [ ] Define taxes, refunds, cancellation timing, jurisdiction, retention, and privacy contact.
- [ ] Establish support ownership and review the persisted `support` table. The form saves requests; it does not silently email an unconfigured address.
- [ ] Establish a process for saved social waitlist interests before announcing availability.

## Product scope still to extend

- Social publishing remains deliberately **coming soon**, with a persisted interest list.
- Application email notifications have no delivery provider/worker yet. Supabase auth email is separate. Notifications currently appear in-app.
- Full application dark mode is not implemented; widget dark styling is implemented.
- General delayed publication of arbitrary draft revisions is not implemented. Published future special dates and timed announcements are supported and resolve without owner/browser activity.
- The staff UI grants/changes roles for existing verified users; invitation email flows and a complete team removal/management console remain to be added.
- Widget installation is tested through the public endpoint, not verified by crawling a customer's website.
- Website-managed top/floating placement is documented; automatic host-page positioning controls are not provided.
- Full-day 24-hour/week-long Google periods are rejected for manual review; the local interval model represents distinct opening/closing times with at most one overnight boundary.
- Support priority routing, advanced management analytics, email campaign/waitlist delivery, and future communication features are not implemented or marketed as live functionality.

No external credentials, API approvals, live sync results, or deployed URL were fabricated.
