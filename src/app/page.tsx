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
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Widget } from '@/components/widget';
import { demoSchedule } from '@/lib/demo';
export default function Home() {
  return (
    <div className="marketing">
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
          <span className="hero-kicker">
            <span className="status-dot green" />
            For the businesses that make a neighbourhood.
          </span>
          <h1>
            Change your hours once.
            <br />
            <em>Update everywhere.</em>
          </h1>
          <p>
            Your hours, holiday closures, and little heads-ups.
            <br />
            One place to keep your website and customers in the know.
          </p>
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
              <Widget schedule={demoSchedule} type="hours" now="2026-11-02T15:00:00.000Z" />
            </div>
          </div>
        </section>
        <section className="marketing-section" id="how-it-works">
          <span className="eyebrow">LESS BUSYWORK. MORE BUSINESS.</span>
          <h2>Three small steps. One less thing to do.</h2>
          <div className="steps-grid">
            {[
              [
                '01',
                'Make yourself at home.',
                'Add your business and regular hours. Coffee shops, salons, corner stores — there’s room for you.',
              ],
              [
                '02',
                'Connect your little corner of the web.',
                'Add a beautiful widget to your website, then create posts and stories for your social accounts.',
              ],
              [
                '03',
                'Change once. Get on with your day.',
                'Closing early? Taking a holiday? Publish an update and your website follows along.',
              ],
            ].map(([n, h, p]) => (
              <div className="step-card" key={n}>
                <span>{n}</span>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
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
                  'Shared organization billing',
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
              'Will this work on my website?',
              'Yes. Use a small script or iframe on WordPress, Wix, Squarespace, Shopify, or custom HTML. Some website plans restrict custom code; the installation guide explains your options.',
            ],
            [
              'Does it automatically update Google Maps?',
              'Automatic Google Business Profile updates are paused for now. Website widgets and the social post and story creator work independently.',
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
        <nav>
          <Link href="/help">Help centre</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Log in</Link>
        </nav>
      </footer>
    </div>
  );
}
