import type { Metadata } from 'next';
import { CalendarClock, Megaphone, RefreshCw } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { AnnouncementBannerPreview } from '@/components/marketing-tools';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('/website-announcement-banner');

export default function Page() {
  return <IntentPage path="/website-announcement-banner" eyebrow="WEBSITE ANNOUNCEMENT BANNER" title={<>Put today’s update <em>where visitors will see it.</em></>} description="Add a responsive announcement banner above your website header for closures, reduced hours, service notices, or timely customer updates." audience="Businesses sharing time-sensitive website notices" demoLabel="LIVE BANNER COMPONENT" Demo={AnnouncementBannerPreview} benefits={[
    {icon:Megaphone,title:'Clear website notices',text:'Use a title, message, optional link, and visual style suited to the update.'},
    {icon:CalendarClock,title:'Publish now or schedule',text:'Free accounts can publish basic announcements; scheduled activation and expiry are available on Pro.'},
    {icon:RefreshCw,title:'Replace without editing the site',text:'Install the banner once, then manage its content from the OpenSync dashboard.'},
  ]} screenshot={{eyebrow:'ANNOUNCEMENTS',title:'Draft, review, then publish',text:'Keep the live banner separate from the next draft so changes are deliberate.',rows:['Winter menu · Live','Holiday closure · Draft','Early close · Scheduled · Pro']}} workflow={[
    {number:'01',title:'Write the update',text:'Use a concise headline and add context or a relevant destination link.'},
    {number:'02',title:'Preview the banner',text:'Check readability, colour contrast, placement, and mobile wrapping.'},
    {number:'03',title:'Install and publish',text:'Place the banner container above the site header, load the OpenSync script once, and publish when ready.'},
  ]} faq={[
    {question:'Is the announcement banner included on the Free plan?',answer:'Yes. Basic announcements and the banner widget are included. Scheduled updates and expiry are Pro features.'},
    {question:'Does an inactive banner leave empty space?',answer:'No. The OpenSync embed collapses when the banner is disabled or no active announcement exists.'},
    {question:'Can the banner link to another page?',answer:'Yes. Add optional call-to-action text and a valid HTTPS destination.'},
  ]} ctaTitle="Make the important update hard to miss." ctaText="Create your announcement banner and install it once." />;
}
