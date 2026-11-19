import type { Metadata } from 'next';
import { BellRing, CalendarCheck, RotateCcw } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { HolidayPlanner } from '@/components/marketing-tools';
export const metadata: Metadata = { title:'Holiday Hours & Business Closure Management', description:'Plan holiday opening hours, early closures, and special business hours in advance. Keep your website and customers up to date from one schedule.', alternates:{canonical:'/holiday-hours'}, openGraph:{title:'Holiday Hours Without the Last-Minute Scramble',description:'Schedule closures and reduced hours once, then return to normal automatically.',url:'/holiday-hours'} };
export default function Page(){return <IntentPage eyebrow="HOLIDAY HOURS MANAGEMENT" title={<>Special hours now. <em>Normal hours later.</em></>} description="Schedule holiday closures, reduced hours, and one-off openings ahead of time. OpenSync shows the exception on the right date and restores your regular schedule automatically." audience="Businesses managing holiday closures" demoLabel="INTERACTIVE CLOSURE PLANNER" Demo={HolidayPlanner} benefits={[
  {icon:CalendarCheck,title:'Plan the whole season',text:'Enter single dates or multi-day closures long before the holiday rush.'},
  {icon:BellRing,title:'Tell customers clearly',text:'Pair special hours with a website announcement and ready-to-share social graphic.'},
  {icon:RotateCcw,title:'No cleanup required',text:'Regular weekly hours resume automatically when the exception ends.'},
]} screenshot={{eyebrow:'SPECIAL HOURS',title:'Every exception, in order',text:'Review upcoming closures and reduced-hours days in one calm timeline.',rows:['Christmas Eve · 9:00 AM–2:00 PM','Christmas Day · Closed','Boxing Day · 10:00 AM–4:00 PM']}} workflow={[
  {number:'01',title:'Choose the date',text:'Add a holiday name, date range, or one-off event.'},{number:'02',title:'Close or shorten',text:'Mark the day closed or enter special opening periods.'},{number:'03',title:'Publish ahead',text:'Your website changes on schedule and resets when the holiday ends.'},
]} faq={[
  {question:'Do holiday hours replace my regular hours?',answer:'Only on the dates you choose. Your underlying weekly schedule stays intact.'},{question:'Can I schedule a closure that spans several days?',answer:'Yes. Create a date range for vacations, renovations, or seasonal shutdowns.'},{question:'Can customers see upcoming holiday hours?',answer:'Yes. Your hours widget can list upcoming special dates so customers can plan ahead.'},
]} ctaTitle="Finish your holiday-hours admin before the holidays begin." ctaText="Add upcoming closures now and let OpenSync handle the switch back."/>}
