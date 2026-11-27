import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RevealHeading } from '@/components/reveal-heading';
import { siteUrl } from '@/lib/site-url';

export type IntentPageProps = {
  path: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  audience: string;
  demoLabel: string;
  Demo: ComponentType;
  benefits: { icon: LucideIcon; title: string; text: string }[];
  screenshot: { eyebrow: string; title: string; text: string; rows: string[] };
  workflow: { number: string; title: string; text: string }[];
  faq: { question: string; answer: string }[];
  ctaTitle: string;
  ctaText: string;
  availabilityNote?: { title: string; text: string };
};

const related = [
  ['/free-business-hours-widget', 'Free website widget'],
  ['/open-closed-widget', 'Open / closed widget'],
  ['/holiday-hours-widget', 'Holiday hours widget'],
  ['/website-announcement-banner', 'Announcement banner'],
  ['/wordpress-business-hours-widget', 'WordPress widget'],
  ['/squarespace-business-hours-widget', 'Squarespace widget'],
  ['/wix-business-hours-widget', 'Wix widget'],
  ['/holiday-hours', 'Holiday hours'],
  ['/for-restaurants', 'For restaurants'], ['/for-food-trucks', 'For food trucks'],
  ['/for-web-developers', 'For web developers'], ['/google-business-profile-sync', 'Google hours sync'],
  ['/free-holiday-hours-generator', 'Holiday graphic generator'],
];

export function IntentPage(props: IntentPageProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl()}#app`,
        name: 'OpenSync',
        url: siteUrl(props.path),
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any web browser',
        description: props.description,
        offers: [
          { '@type': 'Offer', name: 'Free', price: 0, priceCurrency: 'CAD' },
          { '@type': 'Offer', name: 'Pro', price: 9, priceCurrency: 'CAD' },
          { '@type': 'Offer', name: 'Business', price: 19, priceCurrency: 'CAD' },
        ],
        audience: { '@type': 'Audience', audienceType: props.audience },
        publisher: { '@id': `${siteUrl()}#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'OpenSync', item: siteUrl('/') },
          { '@type': 'ListItem', position: 2, name: props.eyebrow, item: siteUrl(props.path) },
        ],
      },
    ],
  };
  return <div className="intent-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}} />
    <header className="intent-header"><Link href="/" className="brand"><span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span></Link><nav aria-label="Primary navigation"><Link href="/free-business-hours-widget">Widgets</Link><Link href="/holiday-hours">Holiday hours</Link><Link href="/for-web-developers">Developers</Link><Link href="/login">Log in</Link><Button asChild><Link href="/signup">Start free <ArrowUpRight size={14}/></Link></Button></nav></header>
    <main id="main-content">
      <nav className="intent-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{props.eyebrow.toLowerCase()}</span></nav>
      <section className="intent-hero"><div className="intent-hero-copy"><span className="intent-kicker"><i />{props.eyebrow}</span><RevealHeading>{props.title}</RevealHeading><p>{props.description}</p><div className="intent-actions"><Button asChild><Link href="/signup">Create your free account <ArrowRight size={16}/></Link></Button><a href="#product-demo">See the demo <span>↓</span></a></div><small><Check size={14}/> No credit card <Check size={14}/> Setup in minutes</small></div><div className="intent-hero-note"><span>BUILT FOR</span><strong>{props.audience}</strong><p>Clear hours wherever customers make a decision.</p></div></section>
      {props.availabilityNote && <aside className="intent-availability" role="note"><strong>{props.availabilityNote.title}</strong><p>{props.availabilityNote.text}</p></aside>}
      <section className="intent-demo-section" id="product-demo"><div className="section-heading"><span>{props.demoLabel}</span><h2>Try it with your own hands.</h2><p>A real product preview—not a stock-image promise.</p></div><props.Demo /></section>
      <section className="intent-benefits"><div className="section-heading"><span>WHY OPENSYNC</span><h2>Fewer hours spent explaining your hours.</h2></div><div className="benefit-grid">{props.benefits.map(({icon:Icon,title,text})=><article key={title}><Icon size={22}/><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="intent-screenshot"><div className="screenshot-copy"><span>{props.screenshot.eyebrow}</span><h2>{props.screenshot.title}</h2><p>{props.screenshot.text}</p><Button asChild variant="outline"><Link href="/demo">Explore the product demo <ArrowUpRight size={14}/></Link></Button></div><div className="dashboard-shot"><div className="shot-sidebar"><span className="brand-mark">o</span>{['Overview','Regular hours','Special hours','Website widgets','Social posts'].map((x,i)=><i key={x} className={i===2?'active':''}>{x}</i>)}</div><div className="shot-main"><div className="shot-top"><span>{props.screenshot.eyebrow}</span><i>Saved</i></div><h3>{props.screenshot.title}</h3>{props.screenshot.rows.map((row,i)=><div className="shot-row" key={row}><span>{String(i+1).padStart(2,'0')}</span><strong>{row}</strong><i>{i===0?'Live':'Ready'}</i></div>)}</div></div></section>
      <section className="intent-workflow"><div className="section-heading"><span>HOW IT WORKS</span><h2>From change to customer in three calm steps.</h2></div><div className="workflow-grid">{props.workflow.map(x=><article key={x.number}><span>{x.number}</span><h3>{x.title}</h3><p>{x.text}</p></article>)}</div></section>
      <section className="intent-faq"><div><span>GOOD TO KNOW</span><h2>Questions, answered.</h2></div><div>{props.faq.map(x=><details key={x.question}><summary>{x.question}</summary><p>{x.answer}</p></details>)}</div></section>
      <section className="intent-related"><span>EXPLORE OPENSYNC</span><div>{related.filter(([href])=>href!==props.path).map(([href,label])=><Link key={href} href={href}>{label}<ArrowUpRight size={13}/></Link>)}</div></section>
      <section className="intent-final"><span>YOUR HOURS, HANDLED.</span><h2>{props.ctaTitle}</h2><p>{props.ctaText}</p><Button asChild><Link href="/signup">Start free today <ArrowRight size={16}/></Link></Button></section>
    </main>
    <footer className="intent-footer"><div><Link href="/" className="brand"><span className="brand-mark">o</span>OpenSync<span className="brand-dot">.</span></Link><p>One update. Everywhere your customers look.</p></div><nav><Link href="/help">Help</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav></footer>
  </div>;
}
