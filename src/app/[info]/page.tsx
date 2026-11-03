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
          <h2>Google needs attention?</h2>
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
          <h2>Your choices</h2>
          <p>
            Export business data from Settings. Disconnect Google to revoke its token. Delete your
            account to remove owned organizations and publications after cancelling active
            subscriptions. Regulatory and payment records held by providers may have separate
            retention requirements.
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
            API request does not guarantee immediate public display. Social media publishing is not
            currently available.
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
