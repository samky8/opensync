import type { Metadata } from 'next';
import { Code2, PanelsTopLeft, RefreshCw } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { WidgetBuilder } from '@/components/marketing-tools';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('/wordpress-business-hours-widget');

export default function Page() {
  return <IntentPage path="/wordpress-business-hours-widget" eyebrow="WORDPRESS BUSINESS HOURS WIDGET" title={<>Live business hours, <em>without another WordPress plugin.</em></>} description="Add OpenSync with a Custom HTML block, then manage weekly hours and holiday exceptions outside the WordPress editor." audience="WordPress site owners and agencies" demoLabel="WORDPRESS-READY WIDGET" Demo={WidgetBuilder} benefits={[
    {icon:PanelsTopLeft,title:'Works with the block editor',text:'Paste the embed into a Custom HTML block in a page, template, or widget area.'},
    {icon:Code2,title:'Script or iframe',text:'Use the standard script embed, with an iframe fallback where the hosting plan restricts scripts.'},
    {icon:RefreshCw,title:'No repeated page edits',text:'The installed block reads the latest schedule whenever OpenSync is published.'},
  ]} screenshot={{eyebrow:'WORDPRESS INSTALL',title:'A focused hand-off',text:'The website keeps its layout while staff update structured hours in OpenSync.',rows:['Custom HTML block · Added','OpenSync script · Loaded once','Mobile preview · Checked']}} workflow={[
    {number:'01',title:'Copy the OpenSync embed',text:'In Website widgets, copy the Hours container and the single deferred script tag.'},
    {number:'02',title:'Add a Custom HTML block',text:'Edit the target WordPress page or template, insert Custom HTML, and paste the code. Avoid a Paragraph or Shortcode block.'},
    {number:'03',title:'Preview and publish',text:'Check desktop and mobile previews, publish the WordPress change, then confirm the live widget loads.'},
  ]} faq={[
    {question:'Do I need to install a WordPress plugin?',answer:'No. The standard installation uses WordPress’s built-in Custom HTML block.'},
    {question:'What if my WordPress plan removes script tags?',answer:'Use the iframe embed if your plan allows iframes, or ask the site administrator to install the script in the theme or approved code-injection area.'},
    {question:'Will caching show old hours?',answer:'The embed requests the published schedule from OpenSync, so page-cache refreshes are not normally required after an hours change.'},
  ]} ctaTitle="Stop opening WordPress for every hours change." ctaText="Create the widget, install one block, and hand schedule updates back to the business." />;
}
