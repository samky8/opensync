import type { Metadata } from 'next';
import { Download, ImageIcon, Sparkles } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { HolidayGraphicGenerator } from '@/components/marketing-tools';
import { pageMetadata } from '@/lib/seo';
export const metadata: Metadata=pageMetadata('/free-holiday-hours-generator');
export default function Page(){return <IntentPage path="/free-holiday-hours-generator" eyebrow="FREE HOLIDAY HOURS GENERATOR" title={<>Make holiday hours <em>impossible to miss.</em></>} description="Create a polished square holiday-hours graphic for Instagram or Facebook. Add your message, choose a brand colour, and download it free." audience="Businesses looking for promotional graphics" demoLabel="FREE GRAPHIC MAKER" Demo={HolidayGraphicGenerator} benefits={[
  {icon:Sparkles,title:'Designed, not improvised',text:'Start with a clean, readable composition instead of squeezing text into a random template.'},{icon:ImageIcon,title:'Ready for the feed',text:'Export a crisp 1080 × 1080 image sized for Instagram and Facebook posts.'},{icon:Download,title:'Free PNG download',text:'No design software required. Customize the message and save the image directly.'},
]} screenshot={{eyebrow:'SOCIAL CONTENT',title:'Turn schedule changes into posts',text:'Signed-in businesses can reuse saved hours to create post and story formats without retyping.',rows:['Christmas closure · Square post','Boxing Day hours · Story','New Year’s Eve · Square + story']}} workflow={[
  {number:'01',title:'Write the headline',text:'Say whether you are closed, opening late, or running reduced hours.'},{number:'02',title:'Add your colour',text:'Choose a brand tone with enough contrast for a readable post.'},{number:'03',title:'Download and share',text:'Save the square PNG, then post it wherever your customers follow you.'},
]} faq={[
  {question:'Is the holiday hours generator really free?',answer:'Yes. You can customize and download the square PNG from this page without a paid design tool.'},{question:'What image size does it create?',answer:'The download is a 1080 × 1080 pixel PNG suited to square Instagram and Facebook feed posts.'},{question:'Can I create Instagram Stories too?',answer:'The free tool creates a square post. OpenSync accounts can also create vertical story artwork from saved schedules.'},
]} ctaTitle="Make the post—and keep the underlying hours in sync." ctaText="Create an OpenSync account to manage the schedule behind every customer update."/>}
