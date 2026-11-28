import type { Metadata } from 'next';
import { siteUrl } from './site-url';

export const SOCIAL_IMAGE = {
  url: siteUrl('/opengraph-image'),
  width: 1200,
  height: 630,
  alt: 'OpenSync business hours and website widgets',
};

export type PublicPage = {
  path: string;
  title: string;
  description: string;
  priority: number;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
};

// This registry is the single source of truth for canonical, indexable public URLs.
// Adding a marketing page here automatically adds it to the XML sitemap.
export const publicPages: PublicPage[] = [
  {
    path: '/',
    title: 'OpenSync – Business Hours & Website Widgets',
    description:
      'Manage business hours, holiday closures and announcements from one dashboard. Display live opening hours on your website and share updates on social media.',
    priority: 1,
    changeFrequency: 'weekly',
  },
  {
    path: '/free-business-hours-widget',
    title: 'Free Business Hours Widget for Any Website',
    description:
      'Add a free, customizable business hours widget to WordPress, Wix, Squarespace, Shopify, or any website. Update opening hours without editing your site.',
    priority: 0.9,
    changeFrequency: 'monthly',
  },
  {
    path: '/open-closed-widget',
    title: 'Live Open or Closed Website Widget',
    description:
      'Add a live open or closed status widget to your website. Show customers whether you are open now and when your business opens or closes next.',
    priority: 0.9,
    changeFrequency: 'monthly',
  },
  {
    path: '/holiday-hours-widget',
    title: 'Holiday Hours Widget for Your Website',
    description:
      'Display holiday hours, special openings and temporary closures in a live website widget that returns to your regular schedule automatically.',
    priority: 0.9,
    changeFrequency: 'monthly',
  },
  {
    path: '/website-announcement-banner',
    title: 'Website Announcement Banner for Business Updates',
    description:
      'Publish a responsive website announcement banner for closures, schedule changes and customer notices from the same OpenSync dashboard.',
    priority: 0.9,
    changeFrequency: 'monthly',
  },
  {
    path: '/wordpress-business-hours-widget',
    title: 'Business Hours Widget for WordPress',
    description:
      'Add a live business hours widget to WordPress with a Custom HTML block or iframe, then update hours without editing your WordPress site.',
    priority: 0.85,
    changeFrequency: 'monthly',
  },
  {
    path: '/squarespace-business-hours-widget',
    title: 'Business Hours Widget for Squarespace',
    description:
      'Embed responsive, live business hours on Squarespace with a Code Block and manage regular or holiday hours from OpenSync.',
    priority: 0.85,
    changeFrequency: 'monthly',
  },
  {
    path: '/wix-business-hours-widget',
    title: 'Business Hours Widget for Wix',
    description:
      'Add a live opening-hours widget to Wix with an HTML embed and keep regular, special and holiday hours current from OpenSync.',
    priority: 0.85,
    changeFrequency: 'monthly',
  },
  {
    path: '/holiday-hours',
    title: 'Holiday Hours & Business Closure Management',
    description:
      'Plan holiday opening hours, early closures, and special business hours in advance. Keep your website and customers up to date from one schedule.',
    priority: 0.8,
    changeFrequency: 'monthly',
  },
  {
    path: '/for-restaurants',
    title: 'Restaurant Hours Management & Website Widgets',
    description:
      'Manage restaurant opening hours, split lunch and dinner service, holiday closures, and website hours from one simple dashboard.',
    priority: 0.75,
    changeFrequency: 'monthly',
  },
  {
    path: '/for-food-trucks',
    title: 'Food Truck Schedule, Hours & Location Updates',
    description:
      'Publish your food truck schedule, service hours, closures, and today’s location so customers know where and when to find you.',
    priority: 0.75,
    changeFrequency: 'monthly',
  },
  {
    path: '/for-web-developers',
    title: 'Business Hours Widget for Web Developers & Agencies',
    description:
      'Give clients an editable business hours widget without CMS access or maintenance tickets. Use a lightweight script or iframe on any website.',
    priority: 0.75,
    changeFrequency: 'monthly',
  },
  {
    path: '/google-business-profile-sync',
    title: 'Google Business Profile Hours Sync – Availability',
    description:
      'Learn how OpenSync manages website hours today and how eligible Google Business Profile delivery will work when automatic publishing resumes.',
    priority: 0.65,
    changeFrequency: 'monthly',
  },
  {
    path: '/free-holiday-hours-generator',
    title: 'Free Holiday Hours Generator for Social Media',
    description:
      'Create a free holiday hours graphic for Instagram and Facebook. Customize the message and brand colour, then download a square PNG.',
    priority: 0.8,
    changeFrequency: 'monthly',
  },
  {
    path: '/hours-checker',
    title: 'Free Business Hours Checker',
    description:
      'Scan the opening hours published on a business website and compare them with Google Maps when available.',
    priority: 0.5,
    changeFrequency: 'monthly',
  },
  {
    path: '/help',
    title: 'Help Centre',
    description:
      'Learn how to publish business hours, install OpenSync website widgets, and share updates.',
    priority: 0.5,
    changeFrequency: 'monthly',
  },
  {
    path: '/privacy',
    title: 'Privacy Notice',
    description:
      'Learn how OpenSync handles account data, business schedules, and connected integrations.',
    priority: 0.3,
    changeFrequency: 'yearly',
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description:
      'Read the terms for using OpenSync, connected publishing destinations, and subscriptions.',
    priority: 0.3,
    changeFrequency: 'yearly',
  },
];

export function pageMetadata(path: string, title?: string, description?: string): Metadata {
  const registered = publicPages.find((page) => page.path === path);
  const pageTitle = title ?? registered?.title;
  const pageDescription = description ?? registered?.description;
  if (!pageTitle || !pageDescription) throw new Error(`Missing SEO metadata for ${path}`);

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: path },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: path,
      siteName: 'OpenSync',
      type: 'website',
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [SOCIAL_IMAGE.url],
    },
  };
}

export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
