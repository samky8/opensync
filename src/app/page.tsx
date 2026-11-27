import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  CalendarDays,
  Code2,
  Globe,
  Megaphone,
  Search,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroShader } from '@/components/hero-shader';
import { RevealHeading } from '@/components/reveal-heading';
import { HoursReviewSlideshow } from '@/components/hours-review-slideshow';
import { HomePromoVideo } from '@/components/home-promo-video';
import reviewStyles from '@/components/hours-review-slideshow.module.css';
import { Widget } from '@/components/widget';
import { demoSchedule } from '@/lib/demo';
import { authConfigured, supabase } from '@/lib/supabase';
import { siteUrl } from '@/lib/site-url';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const description =
  'Manage business hours, holiday closures and announcements from one dashboard. Display live opening hours on your website and share updates on social media.';

export const metadata: Metadata = pageMetadata('/');

const organizationId = `${siteUrl()}#organization`;
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: 'OpenSync',
      url: siteUrl(),
      logo: siteUrl('/icon.svg'),
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl()}#website`,
      name: 'OpenSync',
      url: siteUrl(),
      publisher: { '@id': organizationId },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl()}#app`,
      name: 'OpenSync',
      url: siteUrl(),
      description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: [
        { '@type': 'Offer', name: 'Free', price: 0, priceCurrency: 'CAD' },
        { '@type': 'Offer', name: 'Pro', price: 9, priceCurrency: 'CAD' },
        { '@type': 'Offer', name: 'Business', price: 19, priceCurrency: 'CAD' },
      ],
      publisher: { '@id': organizationId },
    },
  ],
};

const homeDemoSchedule = {
  ...demoSchedule,
  widget: {
    ...demoSchedule.widget,
    expandedByDefault: false,
  },
};

async function hasSignedInUser() {
  if (!authConfigured()) return false;
  try {
    const {
      data: { user },
    } = await (await supabase()).auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export default async function Home() {
  const signedIn = await hasSignedInUser();
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();
  const moreInfoHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent('Tell me more about OpenSync')}`
    : '/help';
  return (
    <div className="marketing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <nav className="marketing-nav">
        <Link href="/" className="brand">
          <span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span>
        </Link>
        <div>
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/login">Log in</Link>
          <Button asChild>
            <Link href="/signup">
              Start for free <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
      </nav>
      <main id="main-content">
        <section className="hero">
          <HeroShader />
          <RevealHeading>
            Manage your business hours <em>in one place.</em>
          </RevealHeading>
          <p>{description}</p>
          <div className="hero-actions">
            <Button asChild>
              <Link href="/signup">
                Get started for free <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/demo">
                Take a look around <ArrowUpRight size={15} />
              </Link>
            </Button>
          </div>
          <small>No credit card. No complicated setup. Just a little more time.</small>
          <div className="hero-product">
            <div className="product-toolbar">
              <span className="brand">
                <span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span>
              </span>
              <span className="pill">EXAMPLE BUSINESS · JUNIPER & OAK</span>
            </div>
            <div className="product-inside">
              <div className="status-card">
                <div className="status-card-top">
                  <span className="eyebrow">RIGHT NOW AT JUNIPER & OAK</span>
                  <span className="live-pill">Example</span>
                </div>
                <div className="status-main">
                  <div>
                    <div className="big-status">
                      <span className="status-orb" />
                      You’re open.
                    </div>
                    <p>Good coffee. A warm welcome. Until 6 PM.</p>
                  </div>
                  <div className="sun-illustration">
                    <Sun size={55} strokeWidth={1} />
                  </div>
                </div>
                <div className="status-card-bottom">
                  <div>
                    <span>TODAY’S HOURS</span>
                    <strong>7:00 AM – 6:00 PM</strong>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/demo">
                      Update hours <ArrowRight size={13} />
                    </Link>
                  </Button>
                </div>
              </div>
              <Widget schedule={homeDemoSchedule} type="hours" now="2026-11-02T15:00:00.000Z" />
            </div>
          </div>
        </section>
        <section className="home-checker-promo" aria-labelledby="home-checker-title">
          <div>
            <span className="eyebrow">FREE HOURS CHECK</span>
            <h2 id="home-checker-title">Are customers seeing the right hours?</h2>
          </div>
          <form action="/hours-checker" method="get">
            <label className="sr-only" htmlFor="home-checker-business">
              Business name, website, or Google Maps URL
            </label>
            <Search size={17} aria-hidden="true" />
            <input
              id="home-checker-business"
              name="business"
              type="text"
              placeholder="Business name, website, or Google Maps URL"
              required
            />
            <Button type="submit">
              Check my hours <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </form>
        </section>
        <section className={reviewStyles.section} aria-labelledby="hours-reviews-title">
          <div className={reviewStyles.intro}>
            <h2 id="hours-reviews-title">Don’t let old hours cost you stars.</h2>
            <p>
              An unexpected closure can hurt your rating when customers are still seeing your
              regular hours.
            </p>
            <p>
              Closing early or taking a holiday? Publish the change in OpenSync and your website’s
              hours widget and live status badge update together.
            </p>
            <Button asChild>
              <Link href="/demo">
                Try updating your hours <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <HoursReviewSlideshow />
        </section>
        <section className="marketing-section" id="how-it-works">
          <span className="eyebrow">LESS BUSYWORK. MORE BUSINESS.</span>
          <h2>See one update go everywhere.</h2>
          <figure className="home-promo">
            <HomePromoVideo />
            <figcaption>
              Watch one change to your business hours become a website update and posts for
              Instagram and Facebook. Live social publishing requires eligible connected accounts.
            </figcaption>
          </figure>
        </section>
        <div className="features-section" id="features">
          <section className="marketing-section">
            <span className="eyebrow">THOUGHTFULLY SIMPLE</span>
            <h2>Made for the way real businesses run.</h2>
            <p>Because sometimes plans change. Your customers should know.</p>
            <div className="feature-grid">
              {[
                {
                  icon: Clock,
                  title: 'Hours that keep up.',
                  copy: 'Regular schedules, split shifts, overnight openings, and quick changes. All in your local time zone.',
                },
                {
                  icon: CalendarDays,
                  title: 'Room for the unexpected.',
                  copy: 'Holiday closures and special hours take priority, then your regular schedule picks right back up.',
                },
                {
                  icon: Code2,
                  title: 'At home on any website.',
                  copy: 'An hours widget, a status badge, and an announcement banner. Framework-independent, responsive, and easy to install.',
                },
                {
                  icon: Globe,
                  title: 'An update worth sharing.',
                  copy: 'Turn your hours and announcements into posts or stories. Publish to connected Facebook Pages and eligible Instagram accounts, or download your image.',
                },
                {
                  icon: Megaphone,
                  title: 'A timely little heads-up.',
                  copy: 'Post an update today, or schedule it with Pro. Set an expiry and the banner takes itself down.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Clear about every change.',
                  copy: 'Drafts stay private. Published versions are recorded. See what reached your website and what still needs attention.',
                },
              ].map((f) => (
                <div key={f.title}>
                  <f.icon size={24} />
                  <h3>{f.title}</h3>
                  <p>{f.copy}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className="marketing-section" id="pricing">
          <span className="eyebrow">SMALL PRICE. A LITTLE MORE PEACE OF MIND.</span>
          <h2>A plan for every chapter.</h2>
          <p>Canadian dollars. Start free. Grow when you’re ready.</p>
          <div className="pricing-grid">
            {[
              {
                name: 'Free',
                price: 0,
                description: 'The everyday essentials.',
                features: [
                  'One business location',
                  'Weekly & special hours',
                  'All three website widgets',
                  'Basic announcements',
                  'Social post & story creator',
                ],
              },
              {
                name: 'Pro',
                price: 9,
                description: 'More time for what matters.',
                features: [
                  'Everything in Free',
                  'Scheduled updates & expiry',
                  'Custom widget branding',
                ],
              },
              {
                name: 'Business',
                price: 19,
                description: 'For your growing business.',
                features: [
                  'Everything in Pro',
                  'Multiple locations',
                  'Multiple staff accounts',
                  'One plan for all your workspaces',
                ],
              },
            ].map((p) => (
              <div className={`card price-card ${p.name === 'Pro' ? 'featured' : ''}`} key={p.name}>
                <span className="eyebrow">{p.name}</span>
                <h2>
                  ${p.price}
                  <small>CAD / month</small>
                </h2>
                <p>{p.description}</p>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={15} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={p.name === 'Pro' ? 'default' : 'outline'} asChild>
                  <Link href="/signup">
                    {p.price ? 'Start with a free account' : 'Get started for free'}
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
        <section className="marketing-section marketing-faq">
          <span className="eyebrow">GOOD QUESTIONS</span>
          <h2>A few things you might be wondering.</h2>
          {[
            [
              'What is OpenSync?',
              'OpenSync is a web app for managing regular business hours, holiday closures, and announcements. Publish live hours to a website widget and create updates to share on Instagram or Facebook.',
            ],
            [
              'Is the OpenSync business hours widget free?',
              'Yes. The Free plan includes one location, regular and special hours, and three website widgets: an hours display, an open or closed status badge, and an announcement banner.',
            ],
            [
              'Will this work on my website?',
              'Yes. Use a small script or iframe on WordPress, Wix, Squarespace, Shopify, or custom HTML. Some website plans restrict custom code; the installation guide explains your options.',
            ],
            [
              'Does it automatically update Google Maps?',
              'Not currently. Automatic Google Business Profile delivery is paused. Website widgets and the social post creator are active and work independently.',
            ],
            [
              'Do I need Google to use OpenSync?',
              'Not at all. All website widgets work independently. You can start with your website and connect Google later.',
            ],
            [
              'What happens when I close early?',
              'Create a special-hours exception and publish. It takes priority for that date. Your normal weekly schedule resumes automatically afterward.',
            ],
            [
              'Are Instagram and Facebook included?',
              'Create square posts and vertical stories using your hours or a custom announcement. When Meta is configured, connect a Facebook Page and its linked Instagram professional account to publish directly. Instagram stories require a Business account. Downloads are also available.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
        <section className="final-cta">
          <h2>Get back to what you opened for.</h2>
          <p>Your next update can take seconds. Start with your first one.</p>
          <Button asChild>
            <Link href="/signup">
              Create your free account <ArrowRight size={16} />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="marketing-footer">
        <div>
          <Link href="/" className="brand">
            <span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span>
          </Link>
          <p>One update. Everywhere your customers look.</p>
        </div>
        {!signedIn && (
          <div className="footer-status-showcase">
            <div className="footer-status-heading">
              <span className="eyebrow">LIVE STATUS WIDGET</span>
              <a href={moreInfoHref}>
                Request more info <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </div>
            <Widget schedule={demoSchedule} type="status" />
          </div>
        )}
        <nav>
          <Link href="/free-business-hours-widget">Free hours widget</Link>
          <Link href="/google-business-profile-sync">Google Business Profile sync</Link>
          <Link href="/hours-checker">Hours checker preview</Link>
          <Link href="/holiday-hours">Holiday hours</Link>
          <Link href="/free-holiday-hours-generator">Holiday hours graphic generator</Link>
          <Link href="/for-restaurants">For restaurants</Link>
          <Link href="/for-food-trucks">For food trucks</Link>
          <Link href="/for-web-developers">Developers</Link>
          <Link href="/help">Help centre</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Log in</Link>
        </nav>
      </footer>
    </div>
  );
}
