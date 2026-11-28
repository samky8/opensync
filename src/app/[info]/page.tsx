import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';

const infoPages = {
  help: {
    title: 'Help Centre',
    description:
      'Learn how to publish business hours, install OpenSync website widgets, and share updates.',
  },
  privacy: {
    title: 'Privacy Notice',
    description:
      'Learn how OpenSync handles account data, business schedules, and connected integrations.',
  },
  terms: {
    title: 'Terms of Service',
    description:
      'Read the terms for using OpenSync, connected publishing destinations, and subscriptions.',
  },
};

export function generateStaticParams() {
  return Object.keys(infoPages).map((info) => ({ info }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ info: string }>;
}): Promise<Metadata> {
  const { info } = await params;
  if (!Object.hasOwn(infoPages, info)) notFound();
  const page = infoPages[info as keyof typeof infoPages];
  return pageMetadata(`/${info}`, page.title, page.description);
}
export default async function Page({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  if (!['help', 'privacy', 'terms'].includes(info)) notFound();
  const privacyEmail = process.env.PRIVACY_EMAIL?.trim() || process.env.SUPPORT_EMAIL?.trim();
  return (
    <main className="document-page" id="main-content">
      <Link href="/" className="brand">
        <span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span>
      </Link>
      {info === 'help' ? (
        <>
          <span className="eyebrow">HELP CENTRE</span>
          <h1>A little help to get in sync.</h1>
          <h2>Your first update</h2>
          <ol>
            <li>Create an account and verify your email.</li>
            <li>Add a business and confirm its time zone.</li>
            <li>
              Set weekly hours. Use multiple periods for split shifts; closing before opening means
              overnight.
            </li>
            <li>Review and publish. Your public widgets are now ready.</li>
            <li>Copy a snippet from Add to your website into an HTML block on your website.</li>
          </ol>
          <h2>Installing on your website</h2>
          <p>
            WordPress: use Custom HTML. Squarespace: use a Code block. Shopify: use Custom Liquid.
            Wix: use Embed HTML; if scripts are restricted, use the iframe snippet. Add the OpenSync
            domain to frame-src and script-src if your site uses a restrictive content security
            policy.
          </p>
          <h2>Google sync is paused</h2>
          <p>
            Automatic Google delivery is currently paused. Website widgets continue to work. Queued
            Google updates need an active scheduler before they can be delivered.
          </p>
          <h2>Create a social post or story</h2>
          <p>
            Open Social posts in your dashboard. Choose Instagram or Facebook and a post or story,
            add your announcement or import draft hours, then connect Meta and select a destination.
            Review the image and caption before choosing Publish now. Facebook Pages and linked
            Instagram professional accounts are supported; Instagram stories require a Business
            account. If direct publishing needs setup, you can still download the image and copy the
            caption. Drafts can be saved on this browser. Pending publications can be continued from
            Social posts; unconfirmed outcomes should be checked in the destination app.
          </p>
          <h2>Google connection</h2>
          <p>
            Connection requires approved Business Profile API access, configured credentials, a
            selected location, and an eligible plan. In History, “accepted” means Google accepted
            your hours update; it does not confirm public visibility. Reconnect if permission was
            revoked.
          </p>
          <h2>Need a hand?</h2>
          <p>
            <Link href="/dashboard?tab=help">Sign in to submit a support request</Link>. Requests
            are saved for the service operator to review.
          </p>
        </>
      ) : info === 'privacy' ? (
        <>
          <h1>Privacy notice</h1>
          <p>
            This notice explains how OpenSync handles information on its website, in its iOS app,
            in website widgets, and through connected services.
          </p>
          <h2>Information we use</h2>
          <p>
            OpenSync stores your account email, organization membership, business profile,
            schedules, announcements, saved custom social backgrounds, publication history, support
            requests, account preferences, and subscription status. We use this information to run
            the service, manage access, publish updates you request, and respond to support requests.
            Authorized workspace members can access workspace data according to their role.
            Published schedules are public and may contain future or inactive announcements that
            the widget does not currently display.
          </p>
          <h2>Service providers</h2>
          <p>
            Vercel hosts the web service and processes request metadata. Supabase provides
            authentication and database hosting. Stripe processes subscription payments and
            receives your account email and billing identifiers. OpenSync does not store full card
            details. When notification email is enabled, Resend receives your email address and the
            notification content for delivery.
          </p>
          <p>
            For direct social publishing, Meta receives the image and caption you approve. OpenSync
            stores encrypted Page tokens, connected Facebook and Instagram identifiers and names,
            and publication history. Upload links expire after 24 hours. Expired image payloads
            are cleared by scheduled maintenance or when another social publication is created.
          </p>
          <h2>Google user data</h2>
          <p>
            If Google sign-in is available and you choose it, OpenSync uses your Google account
            identifier, email, and basic profile information made available through Supabase Auth
            to sign you in and associate your account.
            Google Business Profile is a separate optional connection. It requests the
            <code> business.manage</code> permission to find Business Profile accounts and
            locations you manage, show location names and hours, compare hours, and send regular
            or special hours updates when an authorized workspace user selects Google and confirms
            publication. OpenSync does not use this connection to access Gmail, Drive, or Contacts.
          </p>
          <p>
            OpenSync stores encrypted Business Profile access and refresh tokens and the linked
            location identifier to maintain the connection. Google hours are retrieved for live
            comparison without a persistent response cache or a draft import. Google's{' '}
            <a href="https://developers.google.com/my-business/content/policies">
              Business Profile API policies
            </a>{' '}
            limit permitted temporary caching to 30 calendar days. Historical schedules created
            using the former import feature may still contain Google-derived hours in drafts or
            publication history.
          </p>
          <p>
            OpenSync uses Google user data to provide these features. It does not sell that data
            or send it to Google Analytics, advertising systems, or AI training systems. For
            Google API data use and transfer, see the{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </a>, including its Limited Use requirements.
          </p>
          <p>
            To remove Business Profile access, use Disconnect under Connections or remove OpenSync
            in <a href="https://myaccount.google.com/connections">your Google Account connections</a>.
            Disconnect in OpenSync requests revocation at Google and removes the stored connection
            credentials and linked location identifier. Contact us for help with disassociation or
            historical Google-derived data. Disconnect cannot undo updates already sent to Google.
          </p>
          <h2 id="data-deletion">Access and deletion</h2>
          <p>
            You can export business schedules and revision history from Settings. Web account
            deletion requires prior cancellation of an active subscription. In the iOS app, Settings
            offers to cancel your active web subscription as part of deletion. Account deletion
            removes the sign-in account, owned workspaces, and associated records from the live
            database. Records in workspaces owned by others may remain. Provider-held payment
            records, backups, and content already published to external platforms follow separate
            retention and removal processes.
          </p>
          <p>
            Delete saved backgrounds individually in Social posts. Disconnect a Meta account there
            to remove its stored token for that location. Remove OpenSync from Facebook Business
            Integrations to revoke Meta access completely. Existing posts remain on Meta; delete
            them in Instagram or Facebook. Account deletion removes locally stored social tokens,
            uploads, and history for owned businesses.
          </p>
          <h2>Analytics, cookies, and widgets</h2>
          <p>
            Essential cookies support sign-in and connection security. Browser storage also saves
            your cookie choice, demo edits, social drafts and presets, and interface preferences.
            The iOS app saves its sign-in session in the device Keychain.
          </p>
          <p>
            If you accept analytics cookies, Google Analytics receives public pageview, browser,
            and device information and may store an identifier in a cookie. We use this to
            understand how people use the public website. OpenSync's pageview events omit URL query
            strings and referrers. You can decline or withdraw consent using Cookie settings at the
            bottom of this page. Read more about how Google handles this data in{' '}
            <a href="https://policies.google.com/technologies/partner-sites">
              Google's explanation of data from sites that use its services
            </a>.
          </p>
          <p>
            Embedded widgets do not load Google Analytics. Widget requests reach OpenSync's host,
            which receives request metadata such as IP addresses. OpenSync uses a hashed IP
            address to limit excessive widget requests.
          </p>
          <h2>Contact</h2>
          <p>
            For access, correction, deletion, or other privacy requests,{' '}
            {privacyEmail && <>email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> or </>}
            <Link href="/dashboard?tab=help">use the signed-in support form</Link>.
          </p>
        </>
      ) : (
        <>
          <h1>Terms of service</h1>
          <div className="notice">
            Deployment template requiring legal review and operator details before a public launch.
            This is not a completed legal agreement for a specific business.
          </div>
          <h2>Using OpenSync</h2>
          <p>
            You are responsible for accurate business details and authorization to manage connected
            destinations. Review changes before publishing. You must not use the service to publish
            unlawful content, impersonate another business, or disrupt the service.
          </p>
          <h2>External destinations</h2>
          <p>
            Google and other providers have separate terms and approval requirements. An accepted
            API request does not guarantee immediate public display. Direct social publishing
            requires eligible accounts and authorized Meta access. A network interruption can leave
            the outcome unconfirmed; review the destination account before posting again.
          </p>
          <h2>Subscriptions and cancellation</h2>
          <p>
            Displayed prices are in Canadian dollars per month. The configured Stripe checkout shows
            the amount charged. Manage cancellation in the billing portal. A downgrade preserves
            business data and export access while restricting premium actions. The operator must
            specify taxes, refund policy, and cancellation timing before launch.
          </p>
          <h2>Availability and responsibility</h2>
          <p>
            Keep an independent record of important business information. Service availability
            depends on hosting and connected providers. The operator must add appropriate
            warranties, liability limits, governing law, and dispute terms following legal review.
          </p>
        </>
      )}
      <p>
        <Link href="/">← Back to OpenSync</Link>
      </p>
    </main>
  );
}
