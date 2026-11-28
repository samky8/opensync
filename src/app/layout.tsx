import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Pwa } from '@/components/pwa';
import { AnalyticsConsent } from '@/components/analytics-consent';
import { siteUrl } from '@/lib/site-url';
import { publicPages, SOCIAL_IMAGE } from '@/lib/seo';

const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? 'G-YEWELHFR22';
const analyticsPaths = publicPages
  .map(({ path }) => path)
  .filter((path) => path !== '/hours-checker');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'OpenSync · One update. Everywhere your customers look.',
    template: '%s · OpenSync',
  },
  description:
    'Update your business hours, special closures, and website announcements in one place. Beautiful live widgets for independent businesses.',
  applicationName: 'OpenSync',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/api/icon?size=192' },
  openGraph: {
    title: 'Change your hours once. Update everywhere.',
    description: 'A little less admin. A lot more business.',
    url: '/',
    siteName: 'OpenSync',
    type: 'website',
    images: [SOCIAL_IMAGE],
  },
  twitter: { card: 'summary_large_image', images: [SOCIAL_IMAGE.url] },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#5155d9' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <Pwa />
        {/^G-[A-Z0-9]+$/.test(measurementId) && (
          <AnalyticsConsent measurementId={measurementId} publicPaths={analyticsPaths} />
        )}
      </body>
    </html>
  );
}
