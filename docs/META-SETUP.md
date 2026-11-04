# Direct Instagram and Facebook publishing

Social studio publishes image posts and photo stories on demand. There is no social scheduling or cron requirement. Facebook destinations are Pages, not personal profiles. Instagram must be a professional account linked to an authorized Page; the Facebook Login API supports stories for Business accounts.

## Deployment setup

1. Run `npm run db:migrate` against the deployment database to apply `004_social_publishing.sql`.
2. Create/configure a Meta app for Facebook Login and the Pages/Instagram APIs. Set the valid OAuth redirect URI to `https://YOUR_DOMAIN/api/social/callback` (exact match).
3. Set `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION` (default `v25.0`), `NEXT_PUBLIC_APP_URL` (the public HTTPS origin), and `TOKEN_ENCRYPTION_KEY` (64 hexadecimal characters). Keep the existing encryption key if Google or Meta tokens are already stored.
4. Configure the app's website domain, privacy-policy URL and data-deletion instructions URL (`/privacy`, after completing the operator details). Follow Meta's current business verification and App Review requirements before connecting accounts outside app roles/test accounts. Request `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, and `instagram_content_publish` for this Facebook Login flow. Do not substitute Instagram Login permission names.
5. Ensure `/api/social/media/*` is reachable by Meta without deployment protection, browser authentication, or a bot challenge. URLs contain a random capability and expire after 24 hours. Never expose a Vercel bypass token in a media URL.
6. Sign in to OpenSync, open Social studio, and choose Connect / reconnect Meta. Select the Pages to authorize and grant the publishing permissions. Select a destination, then Review & publish. The confirmation shows the captured image, destination, format and caption.
7. Test all four paths on controlled accounts: Facebook post, Facebook story, Instagram post, Instagram story. Verify the returned provider ID and the actual account. The local automated tests mock Meta; they do not prove live app approval or publishing access.

## Delivery and recovery

- A browser-generated JPEG is decoded, dimensions-checked and re-encoded by the server. The maximum request is 2.9 MB and image input is 2 MB. Only 1080 x 1080 posts and 1080 x 1920 stories are accepted. PNG downloads are independent.
- Media preparation is recorded before calling Meta. Facebook photos are initially unpublished. Instagram containers are checked for `FINISHED` before publishing. Story captions are not submitted; text is already on the image.
- The final publishing state is committed before the provider request. Request IDs and payload hashes prevent repeated submissions of the same request; concurrent finalization is claimed atomically. A timeout during final publication is marked unconfirmed, never automatically retried. Check the destination account before creating another request.
- Instagram processing is checked once per minute, up to five times while the composer stays open. Closing the tab pauses continuation. Return to Recent publications and choose Continue publishing; uploads expire after 24 hours. This is on-demand publishing, not unattended delivery.
- Page tokens stay encrypted in PostgreSQL and never reach the browser. Expired/revoked permission errors require reconnecting. Disconnect removes the token from this location; remove OpenSync from Facebook Business Integrations to revoke authorization completely. Local disconnect does not delete existing remote posts.
- Image capability URLs expire even while the app is idle. Expired database image payloads are nulled on the next create-publication request. Publication metadata remains until account/location deletion. Ownership cascades remove connections, uploaded images, OAuth state and publication history with the business. Backups follow the database operator's retention policy.
- The three new tables have RLS enabled and no browser role grants. Migrations must run with the trusted server database role. No changes to Supabase browser policies are needed.

## References

- [Meta's Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/)
- [Facebook Page posts](https://developers.facebook.com/docs/pages-api/posts/)
- [Facebook Page Stories API](https://developers.facebook.com/docs/page-stories-api/)
- [Long-lived access tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/)
