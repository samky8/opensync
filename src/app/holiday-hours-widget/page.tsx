import type { Metadata } from 'next';
import { CalendarCheck, CalendarDays, RotateCcw } from 'lucide-react';
import { IntentPage } from '@/components/intent-page';
import { HolidayWidgetPreview } from '@/components/marketing-tools';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata('/holiday-hours-widget');

export default function Page() {
  return <IntentPage path="/holiday-hours-widget" eyebrow="HOLIDAY HOURS WIDGET" title={<>Special dates appear. <em>Regular hours stay intact.</em></>} description="Show closures, reduced hours, and one-off openings in your website hours widget. Each exception applies on its scheduled date, then your normal week resumes automatically." audience="Businesses publishing seasonal and holiday hours" demoLabel="HOLIDAY WIDGET PREVIEW" Demo={HolidayWidgetPreview} benefits={[
    {icon:CalendarDays,title:'Show upcoming exceptions',text:'Let customers see important holiday dates alongside the regular weekly schedule.'},
    {icon:CalendarCheck,title:'Single or multi-day closures',text:'Schedule one holiday, a renovation period, or a longer seasonal shutdown.'},
    {icon:RotateCcw,title:'Automatic return to normal',text:'Special hours override only the dates you select; the weekly schedule does not need to be rebuilt.'},
  ]} screenshot={{eyebrow:'SPECIAL HOURS',title:'Every exception has a date',text:'Review upcoming holidays before publishing them to the live website widget.',rows:['Christmas Eve · 9:00 AM–2:00 PM','Christmas Day · Closed','Boxing Day · 10:00 AM–4:00 PM']}} workflow={[
    {number:'01',title:'Add the holiday',text:'Choose a date or range and give the exception a clear customer-facing label.'},
    {number:'02',title:'Set special hours',text:'Mark the date closed or enter one or more opening periods.'},
    {number:'03',title:'Publish the widget',text:'The current and upcoming exceptions appear from the same embed already installed on your site.'},
  ]} faq={[
    {question:'Will a holiday overwrite my regular schedule?',answer:'No. It is stored as a dated exception and your regular hours resume after it ends.'},
    {question:'Can the widget show a reduced-hours day?',answer:'Yes. Enter the exact opening periods for that date instead of marking it closed.'},
    {question:'How far ahead can customers see special hours?',answer:'You can control the upcoming-special-hours window in the widget settings.'},
  ]} ctaTitle="Publish holiday hours before customers have to ask." ctaText="Add your special dates and install the free hours widget." />;
}
