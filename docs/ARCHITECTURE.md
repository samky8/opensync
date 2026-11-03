# Architecture and operational notes

## Trust boundaries

The Next.js server is the only writer. Browser inputs pass Zod validation and explicit membership checks before privileged SQL. RLS is defense in depth for direct authenticated reads. Service credentials remain server-only. `locationAccess` derives the organization through membership and the target location; submitted organization IDs never grant authority.

Public endpoints expose only a published `Schedule` and computed status. They never expose draft versions, memberships, billing records, OAuth tokens, user email, or activity. Published future announcements are public data by design. The iframe isolates CSS and scripts from host sites, and its resize listener checks origin, frame source, location ID, and height bounds.

Sessions are verified against Supabase, refreshed through Proxy, and handled using the SSR cookie adapter. Mutation routes require an exact configured origin. Google uses a ten-minute HttpOnly/SameSite OAuth state cookie and constant-time state comparison. Stripe and cron use their own signature/bearer authentication rather than origin checks.

## Schedule semantics

- Monday-first normalized `HH:mm` intervals; a closing time before opening means next-day closing.
- Equal opening/closing times are rejected, not guessed to mean 24 hours.
- Multiple intervals may touch but not overlap, including across week boundaries.
- Exceptions override the weekly schedule for each date in their inclusive range. An explicit next-day exception truncates previous-day overnight carry at midnight.
- Business time is evaluated using Temporal/IANA time zones. Weekly DST gaps use compatible disambiguation; explicit scheduled announcement input rejects nonexistent/ambiguous local instants so the owner can choose a clear time.
- Announcement windows are start-inclusive/end-exclusive. Disabled/expired messages do not render. If several are active, the latest start wins; an older still-active message can become visible after the newer one expires.
- Announcement instants are stored in UTC. Changing the business time zone does not move previously scheduled instants.

## Publication consistency

A location row lock serializes draft/version updates and publication. Duplicate idempotency keys return the existing revision. A database trigger prevents snapshot changes. Only actor anonymization is permitted during account deletion.

The external worker locks the job and location; it rechecks the public version before sending. An outdated queued revision is superseded. Writes arriving while an external request is running wait for that location lock. Network failures can be ambiguous at the provider, so the system retries an idempotent hours replacement and reports accepted requests conservatively. It cannot prove public Google ordering/visibility after provider-side asynchronous processing.

This implementation holds a transaction across a bounded external request. It is suitable for a small initial deployment, but it consumes a database connection during delivery. At higher throughput, replace it with a dedicated worker/lease design and provider reconciliation, while preserving per-location ordering and immutable revision references. Monitor queue depth and age before scaling customer count.

## Billing

Only recognized CAD monthly prices and active/trialing provider subscriptions grant paid actions. Webhooks validate the unmodified request body, serialize by customer, fetch current Stripe state, and deduplicate event IDs. Checkout redirects are informational. Pending sessions are reused, and active provider subscriptions are directed to the portal even if a webhook has not yet arrived.

Changes after downgrade retain existing data. New premium scheduling/branding actions and Google jobs require entitlement. Existing published timed announcements continue to expire correctly; expiration must not strand a banner just because billing changed.

## Operations

- Keep database/pooler credentials restricted; use a dedicated project. Migrations revoke client write access.
- The distributed rate limiter is PostgreSQL-backed. It uses hashed request IPs for public endpoints and per-user keys for authenticated mutations. On Vercel, trusted forwarding headers are available; a self-hosted reverse proxy must sanitize forwarding headers. Add edge/WAF protection for significant public traffic.
- Public data edge caching is short-lived. Do not add stale-while-revalidate or offline caching to business status without revisiting expiry correctness.
- Retain the token encryption key securely. Rotation requires decrypt/re-encrypt or a reconnect migration.
- Inspect failed destination jobs and webhook delivery failures. Resend failed Stripe events through Stripe after resolving connectivity. Publish the latest business revision after reconnecting Google.
- Support requests and social interest records are persisted for the operator. No background email delivery is implied.
- Expand monitoring, retention cleanup, audit actor display, per-user notification read state, and operational dashboards before a larger multi-staff rollout.
- Never add an arbitrary-URL “verify website” fetch without SSRF protections, DNS/private-network checks, redirect limits, and response-size/time limits.

## Test boundaries

PGlite tests run actual migration SQL, RLS, constraints, transactions, and route-level mutations in an embedded PostgreSQL engine. They do not verify the Supabase email/session infrastructure or multi-process production network/pooler behavior. Browser tests use the explicitly local demo unless dedicated account credentials are supplied. Google network calls are mocked in worker tests; Stripe signatures use the real SDK against local test fixtures. Production provider acceptance remains a staging requirement.
