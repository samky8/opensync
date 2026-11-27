import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';
import { publicPages } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map(({ path, priority, changeFrequency }) => ({
    url: siteUrl(path),
    priority,
    changeFrequency,
  }));
}
