# Direct Instagram and Facebook publishing

Social posts publishes image posts and photo stories on demand. There is no social scheduling or cron requirement. Facebook destinations are Pages, not personal profiles. Instagram must be a professional account linked to an authorized Page; the Facebook Login API supports stories for Business accounts.

## Deployment setup

Run `npm run meta:check` first. It loads Next.js environment files and reports missing or malformed settings without printing credentials. To check production file precedence, set `NODE_ENV=production`. This is a local configuration check, not a check of deployed settings or Meta approval.

1. Run `npm run db:migrate` against the deployment database to apply `004_social_publishing.sql`.
2. Create/configure a Meta app for Facebook Login and the Pages/Instagram APIs. Set the valid OAuth redirect URI to `https://YOUR_DOMAIN/api/social/callback` (exact match).
3. Set `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION` (default `v25.0`), `NEXT_PUBLIC_APP_URL` (the public HTTPS origin), and `TOKEN_ENCRYPTION_KEY` (64 hexadecimal characters). Keep the existing encryption key if Google or Meta tokens are already stored.
4. Configure the app's website domain, privacy-policy URL and data-deletion instructions URL (`/privacy`, after completing the operator details). Follow Meta's current business verification and App Review requirements before connecting accounts outside app roles/test accounts. Request `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, and `instagram_content_publish` for this Facebook Login flow. Do not substitute Instagram Login permission names.
5. Ensure `/api/social/media/*` is reachable by Meta without deployment protection, browser authentication, or a bot challenge. URLs contain a random capability and expire after 24 hours. Never expose a Vercel bypass token in a media URL.
6. Sign in to OpenSync, open Social posts, and choose Connect / reconnect Meta. Select the Pages to authorize and grant the publishing permissions. Select a destination, then Review & publish. The confirmation shows the captured image, destination, format and caption.
7. Test all four paths on controlled accounts: Facebook post, Facebook story, Instagram post, Instagram story. Verify the returned provider ID and the actual account. The local automated tests mock Meta; they do not prove live app approval or publishing access.

## Facebook Login for Business

If your Meta app uses Facebook Login for Business, create a configuration in that product's dashboard and set `META_LOGIN_CONFIG_ID` on the server. Choose **User access token**: this implementation exchanges a user token for a long-lived user token and discovers Pages through `me/accounts`. System-user token configurations are not supported by this exchange flow. Include the five permissions below in the saved configuration and the appropriate Page/Instagram assets. The authorization URL uses `config_id` instead of `scope` when configured. Without it, existing classic Facebook Login apps retain the explicit scope flow.

Register the exact HTTPS callback from `npm run meta:check` in Valid OAuth Redirect URIs. Enable web/client OAuth as required by the dashboard. Use a stable production domain; a local HTTP development server cannot complete this application's secure-cookie flow or serve images to Meta.

## Public launch and App Review checklist

One operator-owned Meta app serves all OpenSync customers. Customers authorize their own eligible assets; they do not need to create developer apps. Development-mode success with an app administrator does not establish access for ordinary customers.

1. In Meta for Developers, create/select the app with the Facebook Pages and Instagram publishing use cases. Associate the operator's business portfolio, complete the business verification required by the dashboard, and complete any access verification requested for serving other businesses. These actions require the operator's Meta account and business records.
2. Complete the public `/privacy` and `/terms` templates with the real operator identity, contact, retention policy and applicable terms. Configure those URLs in App settings. The existing `/privacy` page includes data-deletion instructions; choose the **instructions URL** option, not a deletion callback URL. The app does not implement a Meta signed-request deletion callback. Ensure people who cannot sign in have a public contact for deletion requests.
3. Request Advanced Access/App Review for each permission used by the selected flow. Verify the exact requirements in the app dashboard; product labels and verification requirements can change.

| Permission                  | Reason to provide in review                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pages_show_list`           | Let the signed-in customer discover and select Pages they can manage.                                    |
| `pages_read_engagement`     | Read Page metadata required by the Pages/linked Instagram integration.                                   |
| `pages_manage_posts`        | Publish the image post or photo story explicitly approved by the customer to their selected Page.        |
| `instagram_basic`           | Identify the professional Instagram account linked to the selected Page.                                 |
| `instagram_content_publish` | Publish the customer's approved image post or eligible Business-account story to that Instagram account. |

4. Prepare an accessible OpenSync reviewer login and a screencast of the real flow: sign in, select a location, open Social posts, connect Meta, grant permissions/select assets, choose destination, review image/caption, publish, and show the resulting post in Facebook/Instagram. Demonstrate disconnect and deletion instructions. Supply clear test steps and any fixtures requested by Meta. Do not use the demo as evidence of live publishing or share your personal account password.
5. Obtain approval, confirm Advanced Access for the required permissions, and switch the app to Live/published mode as presented by Meta. Test with an authorized customer who has **no app role**; confirm they see only their authorized assets and can publish to them.
6. Maintain Meta's recurring data-use checks and any required verification. Reconnection is necessary when a customer revokes access or Meta invalidates their token.

### Settings to copy into Meta

| Setting                        | Value                                                   |
| ------------------------------ | ------------------------------------------------------- |
| Website URL                    | `https://YOUR_DOMAIN`                                   |
| App domain                     | `YOUR_DOMAIN`                                           |
| Valid OAuth Redirect URI       | `https://YOUR_DOMAIN/api/social/callback`               |
| Privacy policy URL             | `https://YOUR_DOMAIN/privacy` (complete template first) |
| Terms URL                      | `https://YOUR_DOMAIN/terms` (complete template first)   |
| Data deletion instructions URL | `https://YOUR_DOMAIN/privacy`                           |

### Environment and key handling

Set `META_APP_ID`, `META_APP_SECRET`, optional `META_LOGIN_CONFIG_ID`, `META_GRAPH_VERSION`, `TOKEN_ENCRYPTION_KEY`, and `NEXT_PUBLIC_APP_URL` in the deployment environment, then redeploy. The Meta secret and encryption key must never use a `NEXT_PUBLIC_` prefix or be pasted into chat. For a new installation only, generate a key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and store it securely. If this deployment already has encrypted integrations, retrieve and preserve its existing key; generating a replacement makes stored tokens unreadable.

Review pending migrations before running `npm run db:migrate`: that command applies **all** pending files, not only migration 004. Do not assume the deployed schema matches the local files.

### Current scope

Facebook personal timelines and consumer Instagram accounts cannot publish through this integration. Instagram professionals must link their account to a Facebook Page for this login path. An Instagram-only flow without a Page would require a separate Instagram Login implementation and its own permissions. OpenSync currently publishes images, not Reels/videos, and the browser must remain open during initial processing or the customer must later resume from publication history.

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
