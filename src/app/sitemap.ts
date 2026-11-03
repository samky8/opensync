import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/help', '/privacy', '/terms'].map((path) => ({
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${path}`,
    lastModified: new Date(),
  }));
}
