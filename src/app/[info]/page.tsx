import Link from 'next/link';
import { notFound } from 'next/navigation';
export function generateStaticParams() {
  return ['help', 'privacy', 'terms'].map((info) => ({ info }));
}
export default async function Page({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  if (!['help', 'privacy', 'terms'].includes(info)) notFound();
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
            <li>Copy a snippet from Website widgets into an HTML block on your website.</li>
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
            Open Social studio in your dashboard. Choose Instagram or Facebook and a post or story,
            add your announcement or import draft hours, then connect Meta and select a destination.
            Review the image and caption before choosing Publish now. Facebook Pages and linked
            Instagram professional accounts are supported; Instagram stories require a Business
            account. If direct publishing needs setup, you can still download the image and copy the
            caption. Drafts can be saved on this browser. Pending publications can be continued from
            Social studio; unconfirmed outcomes should be checked in the destination app.
          </p>
          <h2>Google connection</h2>
          <p>
            Connection requires approved Business Profile API access, configured credentials, a
            selected location, and an eligible plan. In Activity, “accepted” means Google accepted
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
          <div className="notice">
            Deployment template. The service operator must add their legal identity, contact
            address, retention schedule, and applicable jurisdiction before opening registration to
            the public.
          </div>
          <h2>Information we use</h2>
          <p>
            OpenSync stores your account email, organization membership, business profile,
            schedules, announcements, publication history, support requests, and subscription
            status. Public widgets expose only the business information in your published schedule.
            Integration tokens are encrypted on the server.
          </p>
          <h2>Service providers</h2>
          <p>
            Supabase provides authentication and database hosting. Stripe processes subscription
            payments; OpenSync does not store card numbers. Google receives authorized
            business-hours changes when you connect a profile. Hosting providers process request
            metadata for operation and abuse prevention.
          </p>
          <p>
            For direct social publishing, Meta receives the image and caption you approve. OpenSync
            stores encrypted Page tokens, connected account identifiers, and publication results.
            Upload links expire after 24 hours; expired image data is purged when another social
            publication is created.
          </p>
          <h2>Your choices</h2>
          <p>
            Export business data from Settings. Disconnect Google to revoke its token. Delete your
            account to remove owned organizations and publications after cancelling active
            subscriptions. Regulatory and payment records held by providers may have separate
            retention requirements.
          </p>
          <p>
            Disconnect a Meta account in Social studio to remove its stored token for that location.
            Remove OpenSync from Facebook Business Integrations to revoke Meta access completely.
            Existing posts remain on Meta; delete them in Instagram or Facebook. Account deletion
            removes locally stored social tokens, uploads, and history for owned businesses.
          </p>
          <h2>Cookies and demo storage</h2>
          <p>
            Essential cookies maintain secure sessions and OAuth authorization state. The clearly
            labeled demo saves example changes in your browser’s local storage; Reset demo clears
            them. No advertising trackers are included.
          </p>
          <h2>Contact</h2>
          <p>
            Use the signed-in support form for data requests. The operator must provide a public
            privacy contact before launch.
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
