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
import { pageMetadata } from '@/lib/seo';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = pageMetadata('/hours-checker');

const breadcrumbData = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'OpenSync', item: siteUrl('/') },
    { '@type': 'ListItem', position: 2, name: 'Business hours checker preview', item: siteUrl('/hours-checker') },
  ],
};

function businessLabel(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const cleaned = rawValue?.trim().slice(0, 120);

  if (!cleaned) return 'Juniper & Oak';
  if (/^https?:\/\//i.test(cleaned) || cleaned.includes('google.com/maps')) {
    try {
      return new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`).hostname.replace(
        /^www\./,
        '',
      );
    } catch {
      return cleaned;
    }
  }

  return cleaned;
}

export default async function HoursCheckerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const submittedValue = Array.isArray(params.business) ? params.business[0] : params.business;
  const business = businessLabel(params.business);

  return (
    <div className="checker-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData).replace(/</g, '\\u003c') }} />
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
            <p>Check your business hours across the web for free.</p>

            <form action="/hours-checker" method="get" className="checker-form">
              <label htmlFor="checker-business">Enter your business name or website</label>
              <div>
                <Search size={18} aria-hidden="true" />
                <input
                  id="checker-business"
                  name="business"
                  type="text"
                  defaultValue={submittedValue ?? ''}
                  placeholder="e.g. Juniper & Oak or yourbusiness.com"
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

        <section className="checker-results" aria-labelledby="example-results-title">
          <div className="checker-results-heading">
            <div>
              <span>EXAMPLE SCAN RESULTS</span>
              <h2 id="example-results-title">{business}</h2>
            </div>
            <span className="checker-example-badge">Illustrative preview</span>
          </div>

          <div className="checker-report">
            <article>
              <span className="checker-result-icon checker-result-good">
                <MapPin size={20} aria-hidden="true" />
              </span>
              <div>
                <span>Google Maps</span>
                <strong>Hours found</strong>
              </div>
              <span className="checker-status checker-status-good">Found</span>
            </article>
            <article>
              <span className="checker-result-icon checker-result-warn">
                <Globe2 size={20} aria-hidden="true" />
              </span>
              <div>
                <span>Business website</span>
                <strong>2 discrepancies</strong>
              </div>
              <span className="checker-status checker-status-warn">Review</span>
            </article>
            <article>
              <span className="checker-result-icon">
                <CalendarDays size={20} aria-hidden="true" />
              </span>
              <div>
                <span>Holiday hours</span>
                <strong>Not specified</strong>
              </div>
              <span className="checker-status">Missing</span>
            </article>
            <article>
              <span className="checker-result-icon">
                <Clock3 size={20} aria-hidden="true" />
              </span>
              <div>
                <span>Website open/closed status</span>
                <strong>Not found</strong>
              </div>
              <span className="checker-status">Missing</span>
            </article>
          </div>

          <aside className="checker-disclaimer">
            <AlertCircle size={18} aria-hidden="true" />
            <p>
              <strong>Proposed feature concept — not a functioning scanner.</strong> Results shown
              here are examples and have not been verified against Google Maps or a business
              website.
            </p>
          </aside>
        </section>

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
