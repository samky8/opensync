import type { Metadata } from 'next';
import { Box, Code2, Smartphone } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { WidgetBuilder } from '@/components/marketing-tools';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('/wix-business-hours-widget');

export default function Page() {
  return <IntentPage path="/wix-business-hours-widget" eyebrow="WIX BUSINESS HOURS WIDGET" title={<>Business hours for Wix <em>that change in one place.</em></>} description="Add an OpenSync HTML embed to your Wix site and keep regular hours, holiday closures, and live status current from one dashboard." audience="Wix business owners and website managers" demoLabel="WIX-READY WIDGET" Demo={WidgetBuilder} benefits={[
    {icon:Box,title:'Use Wix Embed Code',text:'Add the widget through the Embed Code element and position it in your existing page layout.'},
    {icon:Code2,title:'No Velo project required',text:'The iframe installation works without writing Wix application code.'},
    {icon:Smartphone,title:'Check every breakpoint',text:'Set a useful element height and confirm the mobile Wix layout after embedding.'},
  ]} screenshot={{eyebrow:'WIX INSTALL',title:'A live element in your existing design',text:'Keep the Wix layout and let OpenSync supply the current schedule inside it.',rows:['Embed Code element · Added','Element height · Checked','Mobile layout · Published']}} workflow={[
    {number:'01',title:'Copy the iframe URL',text:'In OpenSync Website widgets, copy the iframe embed for the Hours view.'},
    {number:'02',title:'Add Embed Code in Wix',text:'Choose Add Elements, Embed Code, then Embed HTML. Paste the iframe and size the element to fit the preview.'},
    {number:'03',title:'Test the published site',text:'Publish Wix, verify the widget on desktop and mobile, and increase the element height if content is clipped.'},
  ]} faq={[
    {question:'Should I use an iframe on Wix?',answer:'Yes. Wix’s Embed Code element is a straightforward place for the OpenSync iframe and keeps it isolated from the page builder.'},
    {question:'Why is the bottom of the widget cut off?',answer:'Increase the Wix embed element height for that breakpoint. The element’s own dimensions control how much iframe content is visible.'},
    {question:'Can I also add the status badge?',answer:'Yes. Create a separate Embed Code element using the Status iframe URL and place it in a compact area of the layout.'},
  ]} ctaTitle="Update hours without rearranging your Wix page." ctaText="Create a free schedule and embed the live widget." />;
}
