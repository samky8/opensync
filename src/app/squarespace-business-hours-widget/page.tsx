import type { Metadata } from 'next';
import { Code2, LayoutTemplate, Smartphone } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { WidgetBuilder } from '@/components/marketing-tools';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('/squarespace-business-hours-widget');

export default function Page() {
  return <IntentPage path="/squarespace-business-hours-widget" eyebrow="SQUARESPACE BUSINESS HOURS WIDGET" title={<>A Squarespace hours block <em>that stays current.</em></>} description="Embed responsive business hours in a Squarespace Code Block and publish schedule changes from OpenSync instead of reopening the page editor." audience="Squarespace businesses and site designers" demoLabel="SQUARESPACE WIDGET PREVIEW" Demo={WidgetBuilder} benefits={[
    {icon:LayoutTemplate,title:'Fits existing sections',text:'Place the widget in a visit, contact, location, or footer section without rebuilding the page.'},
    {icon:Code2,title:'Simple Code Block install',text:'Use the generated embed code without adding a package or custom application.'},
    {icon:Smartphone,title:'Responsive by default',text:'The hours display adapts to narrow Squarespace columns and mobile layouts.'},
  ]} screenshot={{eyebrow:'SQUARESPACE INSTALL',title:'Designed for the section you already have',text:'Install the live component beside your map, address, or contact details.',rows:['Code Block · Added','Section width · Responsive','Live schedule · Published']}} workflow={[
    {number:'01',title:'Copy the widget code',text:'Copy the Hours embed from OpenSync after publishing your business schedule.'},
    {number:'02',title:'Insert a Code Block',text:'Edit the Squarespace page, add a Code Block in the intended section, choose HTML, and paste the embed.'},
    {number:'03',title:'Save and test',text:'Open the public page on mobile and desktop. If scripts are restricted on your plan, use the iframe version.'},
  ]} faq={[
    {question:'Which Squarespace block should I use?',answer:'Use a Code Block set to HTML. A Text Block will display the code instead of running the embed.'},
    {question:'Can I put the widget in the footer?',answer:'Yes. Use the footer editor and keep the widget inside the existing footer layout so it remains responsive.'},
    {question:'Why does the editor preview differ from the live page?',answer:'Squarespace may limit scripts while editing. Save the page and verify the published URL before troubleshooting the embed.'},
  ]} ctaTitle="Keep the polished Squarespace page—and lose the hours upkeep." ctaText="Add your live schedule with one reusable embed." />;
}
