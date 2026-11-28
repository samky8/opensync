'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Clipboard, Download, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { Widget } from '@/components/widget';
import { Button } from '@/components/ui/button';
import { demoSchedule } from '@/lib/demo';
import type { Schedule } from '@/lib/domain';

export function WidgetBuilder() {
  const [accent, setAccent] = useState('#5b55c8');
  const [radius, setRadius] = useState(16);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [copied, setCopied] = useState(false);
  const schedule = useMemo<Schedule>(
    () => ({ ...demoSchedule, widget: { ...demoSchedule.widget, accent, radius, theme } }),
    [accent, radius, theme],
  );
  const code = '<script src="https://opensync.ca/embed.js" data-business="your-business"></script>';
  return (
    <div className="intent-tool widget-builder">
      <div className="tool-controls">
        <div className="tool-label">Live widget designer</div>
        <label>Brand colour <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></label>
        <label>Corner radius <input type="range" min="0" max="28" value={radius} onChange={(e) => setRadius(Number(e.target.value))} /></label>
        <div className="segmented" aria-label="Widget theme">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Light</button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Dark</button>
        </div>
        <button type="button" className="code-copy" onClick={async () => { await navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
          {copied ? <Check size={15} /> : <Clipboard size={15} />} {copied ? 'Copied' : 'Copy embed code'}
        </button>
      </div>
      <div className="tool-preview browser-preview">
        <div className="browser-dots"><i /><i /><i /><span>juniperandoak.ca/visit</span></div>
        <div className="sample-site"><span className="sample-script">J&O</span><h3>Good coffee. Kind people.</h3><p>Plan your next visit.</p><Widget schedule={schedule} now="2026-11-18T15:00:00.000Z" /></div>
      </div>
    </div>
  );
}

function LiveWidgetPreview({ type, now }: { type: 'hours' | 'status' | 'banner'; now: string }) {
  return (
    <div className="intent-tool widget-showcase">
      <div className="tool-controls">
        <div className="tool-label">Live OpenSync component</div>
        <h3>{type === 'hours' ? 'Upcoming special hours' : type === 'status' ? 'Open right now' : 'Customer announcement'}</h3>
        <p>{type === 'hours' ? 'Date-specific hours override the weekly schedule only when needed.' : type === 'status' ? 'The status and next change are calculated from the published schedule.' : 'Publish, schedule, replace, or remove the banner from OpenSync.'}</p>
        <Button asChild><Link href="/signup">Create yours free</Link></Button>
      </div>
      <div className="tool-preview browser-preview">
        <div className="browser-dots"><i /><i /><i /><span>juniperandoak.ca</span></div>
        <div className="sample-site"><span className="sample-script">J&O</span><h3>Good coffee. Kind people.</h3><p>Plan your next visit.</p><Widget schedule={demoSchedule} type={type} now={now} /></div>
      </div>
    </div>
  );
}

export function StatusWidgetPreview() {
  return <LiveWidgetPreview type="status" now="2026-11-18T15:00:00.000Z" />;
}

export function HolidayWidgetPreview() {
  return <LiveWidgetPreview type="hours" now="2026-12-25T15:00:00.000Z" />;
}

export function AnnouncementBannerPreview() {
  return <LiveWidgetPreview type="banner" now="2026-11-18T15:00:00.000Z" />;
}

export function HolidayPlanner() {
  const [date, setDate] = useState('2026-12-24');
  const [mode, setMode] = useState<'closed' | 'short'>('short');
  return (
    <div className="intent-tool planner-tool">
      <div className="tool-controls">
        <div className="tool-label">Holiday hours planner</div>
        <label>Date <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <div className="segmented"><button className={mode === 'short' ? 'active' : ''} onClick={() => setMode('short')}>Reduced hours</button><button className={mode === 'closed' ? 'active' : ''} onClick={() => setMode('closed')}>Closed</button></div>
        <div className="planner-tip"><Check size={16} /> Your regular schedule resumes automatically the next day.</div>
      </div>
      <div className="tool-preview calendar-shot">
        <div className="calendar-head"><strong>December 2026</strong><span>Special hours</span></div>
        <div className="calendar-week"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>
        <div className="calendar-days">{Array.from({ length: 35 }, (_, i) => { const day = i - 1; const active = date.endsWith(`-${String(day).padStart(2, '0')}`); return <span key={i} className={active ? 'active' : day < 1 || day > 31 ? 'muted' : ''}>{day > 0 && day <= 31 ? day : ''}{active && <small>{mode === 'closed' ? 'Closed' : '9–2'}</small>}</span>; })}</div>
      </div>
    </div>
  );
}

export function RestaurantServiceDemo() {
  const [service, setService] = useState<'lunch' | 'dinner'>('dinner');
  return (
    <div className="intent-tool service-tool">
      <div className="tool-controls"><div className="tool-label">Split-service hours</div><div className="segmented"><button className={service === 'lunch' ? 'active' : ''} onClick={() => setService('lunch')}>Lunch</button><button className={service === 'dinner' ? 'active' : ''} onClick={() => setService('dinner')}>Dinner</button></div><h3>{service === 'lunch' ? 'Lunch is on.' : 'Dinner service starts at 5.'}</h3><p>{service === 'lunch' ? 'Kitchen open 11:30 AM–2:30 PM.' : 'Reservations available until 9:30 PM.'}</p><span className="service-status"><i /> Website status updated</span></div>
      <div className="tool-preview restaurant-shot"><div className="restaurant-photo"><span>LAUREL</span><small>neighbourhood kitchen</small></div><div className="reservation-card"><small>TODAY · WEDNESDAY</small><strong>11:30–2:30</strong><strong>5:00–9:30</strong><button>Reserve a table</button></div></div>
    </div>
  );
}

export function FoodTruckDemo() {
  const [stop, setStop] = useState(0);
  const stops = [
    ['City Hall Plaza', '11:30 AM–2:00 PM', '110 Laurier Ave W'],
    ['Hintonburg Night Market', '5:00 PM–9:00 PM', '1000 Wellington St W'],
  ];
  return (
    <div className="intent-tool truck-tool">
      <div className="tool-preview map-shot"><div className="map-grid" /><div className={`map-pin pin-${stop}`}><MapPin size={24} fill="currentColor" /></div><div className="map-route" /></div>
      <div className="tool-controls"><div className="tool-label">Today’s live stop</div><div className="stop-tabs">{stops.map((item, i) => <button key={item[0]} className={stop === i ? 'active' : ''} onClick={() => setStop(i)}><span>{i + 1}</span>{item[0]}</button>)}</div><h3>{stops[stop][0]}</h3><p>{stops[stop][1]} · {stops[stop][2]}</p><button className="directions-button"><Navigation size={15} /> Get directions</button></div>
    </div>
  );
}

export function DeveloperDemo() {
  const [mode, setMode] = useState<'script' | 'iframe'>('script');
  const code = mode === 'script' ? '<script\n  src="https://opensync.ca/embed.js"\n  data-business="loc_7f3a"\n  data-view="hours">\n</script>' : '<iframe\n  src="https://opensync.ca/embed/loc_7f3a"\n  title="Business hours"\n  loading="lazy">\n</iframe>';
  return <div className="intent-tool developer-tool"><div className="tool-controls code-panel"><div className="code-tabs"><button className={mode === 'script' ? 'active' : ''} onClick={() => setMode('script')}>Script</button><button className={mode === 'iframe' ? 'active' : ''} onClick={() => setMode('iframe')}>iframe</button><span>HTML</span></div><pre><code>{code}</code></pre></div><div className="tool-preview lighthouse-shot"><div className="tool-label">Implementation check</div>{[['Responsive embed','Pass'],['Lazy-loading safe','Pass'],['No framework dependency','Pass'],['Accessible title','Pass']].map(([a,b]) => <div key={a}><span><Check size={15} />{a}</span><strong>{b}</strong></div>)}<p>One snippet. Client-managed content. Zero CMS hand-offs.</p></div></div>;
}

export function SyncDemo() {
  const [synced, setSynced] = useState(false);
  return <div className="intent-tool sync-tool"><div className="tool-controls"><div className="tool-label">Planned publishing flow</div><div className="hours-change"><span>Friday</span><del>9:00 AM–5:00 PM</del><strong>9:00 AM–2:00 PM</strong></div><button type="button" className="sync-button" onClick={() => setSynced(true)}><RefreshCw size={15} className={synced ? 'spun' : ''} />{synced ? 'Preview complete' : 'Preview the flow'}</button></div><div className="tool-preview sync-destinations">{[['G','Google Business Profile'],['⌘','Website widget'],['◎','Customer status']].map(([icon, label]) => <div className={synced ? 'synced' : ''} key={label}><span>{icon}</span><p><strong>{label}</strong><small>{label === 'Google Business Profile' ? 'Automatic delivery paused' : synced ? 'Active now' : 'Available now'}</small></p>{synced && label !== 'Google Business Profile' && <Check size={16} />}</div>)}</div></div>;
}

export function HolidayGraphicGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [business, setBusiness] = useState('Juniper & Oak');
  const [message, setMessage] = useState('Closed Christmas Day');
  const [colour, setColour] = useState('#4f46a5');
  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 1080; canvas.height = 1080;
    ctx.fillStyle = colour; ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#ffffff18'; for (let i=0;i<9;i++) { ctx.beginPath(); ctx.arc(90+i*135, 110+(i%2)*750, 180, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '600 46px Arial'; ctx.fillText(business.toUpperCase(), 540, 250);
    ctx.font = '700 90px Georgia'; message.split(' ').reduce<string[]>((lines, word) => { const last=lines.at(-1)||''; if ((last+' '+word).length>18) lines.push(word); else lines[lines.length-1]=(last+' '+word).trim(); return lines; }, ['']).forEach((line,i)=>ctx.fillText(line,540,465+i*105));
    ctx.font = '36px Arial'; ctx.fillText('Regular hours resume December 26', 540, 835);
    const link=document.createElement('a'); link.download='holiday-hours.png'; link.href=canvas.toDataURL('image/png'); link.click();
  }
  return <div className="intent-tool graphic-tool"><canvas ref={canvasRef} hidden /><div className="tool-controls"><div className="tool-label">Free holiday hours graphic</div><label>Business name<input value={business} maxLength={38} onChange={(e)=>setBusiness(e.target.value)} /></label><label>Headline<input value={message} maxLength={48} onChange={(e)=>setMessage(e.target.value)} /></label><label>Brand colour<input type="color" value={colour} onChange={(e)=>setColour(e.target.value)} /></label><button className="download-button" onClick={download}><Download size={15}/> Download PNG</button></div><div className="tool-preview graphic-preview" style={{backgroundColor:colour}}><div className="graphic-orb one"/><div className="graphic-orb two"/><small>{business}</small><h3>{message}</h3><p>Regular hours resume December 26</p><span>1080 × 1080 · Instagram-ready</span></div></div>;
}
