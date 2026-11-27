import type { Metadata } from 'next';
import { Clock3, Eye, RefreshCw } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { StatusWidgetPreview } from '@/components/marketing-tools';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('/open-closed-widget');

export default function Page() {
  return <IntentPage path="/open-closed-widget" eyebrow="LIVE OPEN OR CLOSED WIDGET" title={<>Answer “are you open?” <em>before the call.</em></>} description="Add a compact live status badge to your header, contact page, or footer. It calculates open or closed status and the next schedule change from your published OpenSync hours." audience="Businesses that need a live website status" demoLabel="LIVE STATUS WIDGET" Demo={StatusWidgetPreview} benefits={[
    {icon:Clock3,title:'Calculated live',text:'The badge uses your timezone, weekly schedule, overnight hours, and date-specific exceptions.'},
    {icon:Eye,title:'Small but useful',text:'Show the current state and next opening or closing without adding a full hours table.'},
    {icon:RefreshCw,title:'One schedule to maintain',text:'Publish an hours change in OpenSync and the embedded status updates with it.'},
  ]} screenshot={{eyebrow:'STATUS WIDGET',title:'Control the answer customers see',text:'Choose a compact layout, labels, colours, and whether the next opening is displayed.',rows:['Open / closed status · Visible','Next schedule change · On','Website footer · Installed']}} workflow={[
    {number:'01',title:'Publish your hours',text:'Set the correct timezone, weekly hours, and any upcoming special dates.'},
    {number:'02',title:'Choose Status',text:'Open Website widgets, select Status, and preview the compact badge.'},
    {number:'03',title:'Paste the embed',text:'Place the status container in your footer, contact area, or another visible location and load the OpenSync script once.'},
  ]} faq={[
    {question:'How does the widget know whether my business is open?',answer:'It compares the current time in your business timezone with the published weekly and special-hours schedule.'},
    {question:'Does it handle hours that close after midnight?',answer:'Yes. Overnight periods are calculated as one continuous opening window into the following day.'},
    {question:'Can I use it with the full hours widget?',answer:'Yes. The status badge and full hours display use the same published schedule and can appear on the same website.'},
  ]} ctaTitle="Give every visitor a current answer." ctaText="Create a free OpenSync account and publish your live status widget." />;
}
