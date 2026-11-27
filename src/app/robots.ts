import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

const publicCrawlRules = {
  allow: ['/', '/api/icon'],
  disallow: [
    '/dashboard',
    '/onboarding',
    '/api/',
    '/embed/',
    '/demo',
    '/auth/',
    '/reset-password',
  ],
};

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: 'Googlebot', ...publicCrawlRules },
      { userAgent: 'Bingbot', ...publicCrawlRules },
      { userAgent: 'OAI-SearchBot', ...publicCrawlRules },
      { userAgent: '*', ...publicCrawlRules },
    ],
    sitemap: siteUrl('/sitemap.xml'),
    host: siteUrl('/'),
  };
}
