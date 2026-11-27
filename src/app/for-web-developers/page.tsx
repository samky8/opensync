import type { Metadata } from 'next';
import { Braces, Gauge, Users } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { DeveloperDemo } from '@/components/marketing-tools';
import { pageMetadata } from '@/lib/seo';
export const metadata: Metadata=pageMetadata('/for-web-developers');
export default function Page(){return <IntentPage path="/for-web-developers" eyebrow="OPENSYNC FOR WEB DEVELOPERS" title={<>Ship the hours block. <em>Skip the maintenance tickets.</em></>} description="Add a lightweight, client-editable hours component to any build. Your client manages the schedule; you keep the website clean, fast, and out of their hands." audience="Agencies and freelance web developers" demoLabel="EMBED IMPLEMENTATION" Demo={DeveloperDemo} benefits={[
  {icon:Braces,title:'Framework-agnostic',text:'Use a script embed or iframe in React, WordPress, Shopify, Webflow, or static HTML.'},{icon:Users,title:'A safer client hand-off',text:'Clients edit structured hours in OpenSync instead of poking around the CMS.'},{icon:Gauge,title:'Small integration surface',text:'No API client, database migration, or custom admin UI required for a polished result.'},
]} screenshot={{eyebrow:'CLIENT HAND-OFF',title:'One account, every site surface',text:'Give the business a focused schedule editor while preserving the implementation you shipped.',rows:['Production embed · loc_7f3a','Fallback iframe · Enabled','Client editor access · Owner']}} workflow={[
  {number:'01',title:'Create the location',text:'Set a starter schedule and visual defaults for the client.'},{number:'02',title:'Install the embed',text:'Paste the script or iframe where the business hours should render.'},{number:'03',title:'Hand off editing',text:'The client signs in to manage hours—without CMS or repository access.'},
]} faq={[
  {question:'Does the embed require React?',answer:'No. It works independently of your site framework and can be installed in a regular HTML block.'},{question:'Is there an iframe fallback?',answer:'Yes. Use the iframe embed on platforms that restrict third-party scripts or under a strict content security policy.'},{question:'What happens if OpenSync is unavailable?',answer:'The widget shows a clear temporary-unavailable state instead of stale or misleading hours.'},
]} ctaTitle="Make “can you update our hours?” a solved problem." ctaText="Add a clean hours embed to your next client build in minutes."/>}
