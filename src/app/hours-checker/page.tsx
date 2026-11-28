import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Globe2,
  MapPin,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkBusinessHours, type CheckFinding } from '@/lib/hours-checker';
import { pageMetadata } from '@/lib/seo';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = pageMetadata('/hours-checker');

const breadcrumbData = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'OpenSync', item: siteUrl('/') },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Business hours checker',
      item: siteUrl('/hours-checker'),
    },
  ],
};

function FindingIcon({ source }: { source: CheckFinding['source'] }) {
  if (source === 'google') return <MapPin size={20} aria-hidden="true" />;
  if (source === 'website') return <Globe2 size={20} aria-hidden="true" />;
  if (source === 'hours') return <CalendarDays size={20} aria-hidden="true" />;
  return <Clock3 size={20} aria-hidden="true" />;
}

export default async function HoursCheckerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const submittedValue = Array.isArray(params.business) ? params.business[0] : params.business;
  const result = submittedValue?.trim() ? await checkBusinessHours(submittedValue) : undefined;

  return (
    <div className="checker-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData).replace(/</g, '\\u003c'),
        }}
      />
      <header className="checker-header">
        <Link href="/" className="brand">
          <span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/free-business-hours-widget">Free widget</Link>
          <Link href="/login">Log in</Link>
          <Button asChild>
            <Link href="/signup">
              Start free <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </header>

      <main id="main-content">
        <section className="checker-hero">
          <div className="checker-copy">
            <span className="checker-kicker">
              <i /> FREE BUSINESS HOURS CHECKER
            </span>
            <h1>Are your customers seeing the right hours?</h1>
            <p>
              Scan the hours published on your website and compare them with Google when available.
            </p>

            <form action="/hours-checker#results" method="get" className="checker-form">
              <label htmlFor="checker-business">Enter your business website</label>
              <div>
                <Search size={18} aria-hidden="true" />
                <input
                  id="checker-business"
                  name="business"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  defaultValue={submittedValue ?? ''}
                  placeholder="e.g. yourbusiness.com"
                  required
                />
                <Button type="submit">
                  Check my hours <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </div>
              <small>
                <Check size={13} aria-hidden="true" /> No account required
              </small>
            </form>
          </div>

          <div className="checker-orbit" aria-hidden="true">
            <div className="checker-orbit-center">
              <Clock3 size={34} />
            </div>
            <span className="checker-orbit-node checker-orbit-google">
              <MapPin size={20} /> Google
            </span>
            <span className="checker-orbit-node checker-orbit-web">
              <Globe2 size={20} /> Website
            </span>
          </div>
        </section>

        {result ? (
          <section
            id="results"
            className="checker-results"
            aria-labelledby="checker-results-title"
            aria-live="polite"
          >
            <div className="checker-results-heading">
              <div>
                <span>LIVE SCAN RESULTS</span>
                <h2 id="checker-results-title">{result.name}</h2>
              </div>
              <span className="checker-example-badge">Checked now</span>
            </div>

            <div className="checker-report">
              {result.findings.map((finding) => (
                <article key={`${finding.source}-${finding.label}`}>
                  <span
                    className={`checker-result-icon${
                      finding.tone === 'good'
                        ? ' checker-result-good'
                        : finding.tone === 'warn'
                          ? ' checker-result-warn'
                          : ''
                    }`}
                  >
                    <FindingIcon source={finding.source} />
                  </span>
                  <div>
                    <span>{finding.label}</span>
                    <strong>{finding.detail}</strong>
                  </div>
                  <span
                    className={`checker-status${
                      finding.tone === 'good'
                        ? ' checker-status-good'
                        : finding.tone === 'warn'
                          ? ' checker-status-warn'
                          : ''
                    }`}
                  >
                    {finding.status}
                  </span>
                </article>
              ))}
            </div>

            <aside className="checker-disclaimer">
              <AlertCircle size={18} aria-hidden="true" />
              <p>
                <strong>These results come from a live scan.</strong> The checker reads the public
                home page and structured data without executing third-party scripts. Hours loaded
                only after interaction or shown on another page may need a manual review.
              </p>
            </aside>
          </section>
        ) : null}

        <section className="checker-cta">
          <div>
            <span>ONE UPDATE. EVERYWHERE CUSTOMERS LOOK.</span>
            <h2>Keep your business hours accurate with OpenSync.</h2>
            <p>Publish regular hours, special closures, and live website updates from one place.</p>
          </div>
          <Button asChild>
            <Link href="/signup">
              Get started for free <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="checker-footer">
        <Link href="/" className="brand">
          <span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span>
        </Link>
        <p>One update. Everywhere your customers look.</p>
        <nav>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  );
}
