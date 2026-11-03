import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Pwa } from '@/components/pwa';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
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
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
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
      </body>
    </html>
  );
}
