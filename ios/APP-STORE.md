# App Store submission draft

Do not submit until the native build, device checks, backend deployment, and legal/operator information are complete. Replace all account-specific values privately in App Store Connect.

**Name:** OpenSync

**Subtitle:** Business hours, kept in sync

**Primary category:** Business

**Keywords:** business,hours,opening,schedule,holiday,announcements,locations

**Description:**

Keep your business hours up to date wherever you are.

OpenSync helps you manage weekly opening times, holiday exceptions, and customer announcements from your iPhone or iPad. Review changes before publishing, keep your website widgets current, and track updates sent to an already connected Google Business Profile.

- Edit regular hours and special dates.
- Prepare customer announcements for your website widgets.
- Review and publish saved changes.
- Switch between your account's business locations.
- Check publishing activity and delivery status.
- Export your data and manage your account.

Sign in with your existing OpenSync email/password account, or explore a sample business in demo mode. An internet connection is required for live account operations. Available locations and publishing destinations depend on your existing account permissions and connected services. Google delivery may take time to appear publicly.

**Review notes draft:**

This is a native SwiftUI companion to the OpenSync business-hours service. The iOS app contains no purchases, prices, subscription checkout, or external upgrade calls to action. It honors existing account permissions and subscriptions. Please assess its eligibility as a free companion under guideline 3.1.3(f); we do not claim preapproval.

Tap “Explore demo” on the sign-in screen to inspect native hours editing, announcements, and publication review without credentials. Demo actions do not change a real business. Provide a separate verified email/password review account below for live backend testing; demo mode does not replace full reviewer access.

Account deletion is under Settings → Delete account. It explicitly warns that active web subscriptions will be canceled and owned business records removed. It requires typing DELETE and a final destructive action.

**Still required from the operator:**

- Apple team, registered bundle ID, App Store Connect app record, seller/contact details.
- Dedicated live review credentials (enter in App Store Connect, never in this file).
- Public support URL and final privacy-policy URL on the deployed domain.
- Genuine iPhone/iPad screenshots from the compiled app, with correct current size requirements.
- Privacy questionnaire based on actual production data collection, including hosting/Supabase/provider logs; age rating and encryption/export compliance answers.
- Tested signed archive, successful App Store validation, and a completed TestFlight pass.

**Suggested screenshot sequence:** Today and publication status; weekly hours; holiday exception editor; announcement editor; publication review. Use the sample business and exclude real customer credentials or private data.
