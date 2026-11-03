# OpenSync native iOS

This is a SwiftUI iPhone/iPad companion to the existing OpenSync service, targeting iOS 17 and later. It uses native navigation, forms, date pickers, Keychain authentication, haptics, and the iOS share sheet. It does not embed the website.

**Build status:** source and XcodeGen project specification prepared on Windows. Xcode compilation, simulator tests, device testing, signing, and App Store submission have **not** run here. No IPA or signed archive has been produced. The repository includes a macOS CI workflow to build and test the app without signing credentials.

## What is shared

- Existing Supabase accounts and verified email/password sign-in. Native sessions use HTTPS Auth REST endpoints and device-only Keychain storage, with coordinated refresh token rotation.
- Existing location permissions, draft version checks, immutable publications, website updates, connected Google queues, and subscription entitlements.
- Existing API schedule format, including overnight periods, exceptions, announcements, and preserved widget settings. The server remains authoritative for validation and live status.
- Existing OpenSync logo and demo business, exported by `npx tsx scripts/ios-assets.ts`. The demo never contacts the backend and resets when exited.

The app supports selecting existing locations, creating a first location, editing business details, weekly/special hours and announcements, reviewing/publishing saved drafts, viewing delivery/activity, sending support requests, sharing a data export, signing out, and deleting the account. Deletion explicitly cancels active web subscriptions before removing the account. Existing Google connections work; connecting new Google profiles, team administration, widget customization, account registration/password recovery, and billing remain web features. No purchases or upgrade links are included in the native app.

Unsaved edits live in memory. Save before closing the app or signing out. Refresh, location switching, and publication are blocked while an editor is dirty. If two editors/devices modify the same draft, the server rejects the outdated version; discard and reapply the intended edit. There is no offline publication queue or background synchronization.

## Open and test on a Mac

Install a current stable **Xcode 26 or later**, select it with `xcode-select`, complete its first-launch setup, and install an iOS simulator. Apple's current upload requirement is Xcode 26+ with the iOS 26 SDK; the deployment target can remain iOS 17. See [Apple's requirements](https://developer.apple.com/news/upcoming-requirements/).

```bash
brew install xcodegen
cd ios
xcodegen generate
open OpenSync.xcodeproj
```

`project.yml` is the source of truth. Generated Xcode project files are ignored; regenerate after changing it. There are no third-party native packages to resolve. The demo can run immediately without server configuration.

Run native unit and UI tests:

```bash
bash scripts/build.sh test
```

The script selects an available iPhone simulator, builds the app, runs the schedule contract/time-zone tests and the demo UI smoke test, and saves an `.xcresult` bundle including a screenshot under `build/`. Set `SIMULATOR_ID` to test a specific device. Also run on an iPad and the oldest supported iOS simulator before release. The GitHub workflow `.github/workflows/ios.yml` runs the same script and uploads results; it does not deploy anything.

## Connect the existing backend

Deploy this repository's backend and finish its Supabase/PostgreSQL setup first. Native bearer support is in `src/lib/supabase.ts`, the location list is `/api/mobile/bootstrap`, and existing `/api/manage` and `/api/export` are reused. Browser mutation endpoints retain origin enforcement; manage only opts out when an explicit bearer credential is present and independently validated by Supabase. A malformed/revoked token never falls back to a cookie.

Create the ignored `ios/Config/Local.xcconfig`:

```xcconfig
OPENSYNC_API_URL = https:/$()/your-real-domain.example
SUPABASE_URL = https:/$()/your-project.supabase.co
SUPABASE_ANON_KEY = your-public-anon-key
PRODUCT_BUNDLE_IDENTIFIER = your.company.opensync
DEVELOPMENT_TEAM = YOUR_APPLE_TEAM_ID
```

The unusual slash syntax is required because `//` starts an xcconfig comment. These values are public client configuration. **Never include Supabase service-role, Stripe, Google client secrets, or encryption keys in the iOS bundle.** Configure those only on the server. The API and auth URLs must be HTTPS and must not redirect. Use the final canonical domain.

If you change the bundle identifier, also replace `PRODUCT_BUNDLE_IDENTIFIER` in `project.yml`: target settings override xcconfig settings. Choose an identifier belonging to your Apple developer account. Sign in with a verified existing email/password account. Google-only users need to establish a password using the web account recovery flow first. No Google sign-in is included in this native version.

## Signed archive and App Store export

Sign in to Xcode with your Apple Developer account, register the bundle identifier, and create the corresponding App Store Connect app. Use your own team and identifier. No credentials or certificates are checked into this repository.

```bash
cd ios
export DEVELOPMENT_TEAM=YOUR_APPLE_TEAM_ID
bash scripts/build.sh archive
bash scripts/build.sh export
```

Archive runs a configuration check to reject placeholder URLs and keys. Xcode handles automatic provisioning. Outputs are `build/OpenSync.xcarchive` and `build/export/`. Export uses `app-store-connect`, and does not upload. Alternatively use Xcode **Product → Archive**, then Organizer **Distribute App** to validate/upload to TestFlight. Resolve any compiler, signing, or validation errors before treating the build as release-ready.

## Release checks

1. Run native tests in Xcode/CI and on physical iPhone/iPad; test VoiceOver, large text, dark appearance, rotation, and keyboard behavior. Inspect the screenshots generated from the actual app.
2. Use a dedicated live reviewer account to test verified login, token refresh, role restrictions, concurrency conflicts, save/publish, connected Google delivery, and network failures. Confirm the real website reflects publications.
3. Test account deletion on a disposable account, including an active test Stripe subscription. Confirm cancellation, Google token revocation, account deletion, and organization cleanup. The backend needs its service-role key and appropriate provider configuration.
4. Finalize real privacy/terms/support pages. Complete App Store privacy declarations after reviewing the deployed server and its providers. The bundled privacy manifest declares email, user ID, user content, and support content; it contains no tracking or required-reason API entries because this native client does not use those APIs. Reassess if dependencies or behavior change.
5. Complete the metadata in `APP-STORE.md`, supply reviewer credentials privately in App Store Connect, capture genuine screenshots, answer age-rating/export-compliance questions, and test through TestFlight.
6. Confirm the free companion distribution model with App Review. Apple decides whether this product qualifies under [guideline 3.1.3(f)](https://developer.apple.com/app-store/review/guidelines/). No StoreKit purchases are implemented; if review requires them, implement and validate them before submission.

No claim of App Store approval or native build success is made until those external checks have actually passed.
