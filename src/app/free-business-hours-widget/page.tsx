import type { Metadata } from 'next';
import { Code2, Palette, RefreshCw } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { WidgetBuilder } from '@/components/marketing-tools';

export const metadata: Metadata = {
  title: 'Free Business Hours Widget for Any Website',
  description: 'Add a free, customizable business hours widget to WordPress, Wix, Shopify, Squarespace, or any website. Update opening hours without editing your site.',
  alternates: { canonical: '/free-business-hours-widget' },
  openGraph: { title: 'Free Business Hours Widget for Your Website', description: 'A polished, live opening-hours widget you can add to any website in minutes.', url: '/free-business-hours-widget' },
};
export default function Page() { return <IntentPage eyebrow="FREE BUSINESS HOURS WIDGET" title={<>Website hours that stay <em>beautifully current.</em></>} description="Add a responsive opening hours widget to your website, then change the schedule without touching your site builder again." audience="Businesses looking for website widgets" demoLabel="LIVE WIDGET BUILDER" Demo={WidgetBuilder} benefits={[
  {icon:Code2,title:'One small snippet',text:'Paste it into WordPress, Wix, Shopify, Squarespace, Webflow, or plain HTML.'},
  {icon:Palette,title:'Looks like your brand',text:'Choose colours, corners, type, alignment, and light or dark styling.'},
  {icon:RefreshCw,title:'Always up to date',text:'Publish an hours change once and every embedded widget reflects it automatically.'},
]} screenshot={{eyebrow:'WIDGET CONTROL CENTRE',title:'One place for every embed',text:'Create hours, status, and announcement widgets from the same verified schedule.',rows:['Business hours widget · Light','Open / closed status · Compact','Holiday announcement · Floating']}} workflow={[
  {number:'01',title:'Add your regular hours',text:'Set weekly opening times, split shifts, and overnight hours.'},
  {number:'02',title:'Make it yours',text:'Customize the widget and preview it against a sample website.'},
  {number:'03',title:'Paste once',text:'Add the snippet to your site. Future updates happen from OpenSync.'},
]} faq={[
  {question:'Does the widget work with WordPress and Wix?',answer:'Yes. Use a Custom HTML block in WordPress or an Embed HTML element in Wix. An iframe option is available where scripts are restricted.'},
  {question:'Will it slow down my website?',answer:'The embed is lightweight and loads independently. It does not require a framework or add dependencies to your site.'},
  {question:'Can I show holiday hours?',answer:'Yes. Date-specific special hours appear in the widget and override the regular schedule only for those dates.'},
]} ctaTitle="Give customers the right answer before they ask." ctaText="Create your live business hours widget and add it to your website today."/>; }
