import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '',
    '/free-business-hours-widget',
    '/holiday-hours',
    '/for-restaurants',
    '/for-food-trucks',
    '/for-web-developers',
    '/google-business-profile-sync',
    '/free-holiday-hours-generator',
    '/help',
    '/privacy',
    '/terms',
  ].map((path) => ({
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${path}`,
    lastModified: new Date(),
    changeFrequency: path ? ('monthly' as const) : ('weekly' as const),
    priority: path ? 0.8 : 1,
  }));
}
