'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  CalendarClock,
  ChevronDown,
  CircleCheck,
  CircleX,
  Clock,
  ExternalLink,
  Info,
  TriangleAlert,
} from 'lucide-react';
import {
  announcementStyleColours,
  days,
  formatIntervals,
  getStatus,
  type Schedule,
} from '@/lib/domain';
import Image from 'next/image';
import { RichText } from './rich-text';
export type WidgetType = 'hours' | 'banner' | 'status';
const announcementStyles = {
  none: { className: 'none', Icon: null },
  information: { className: 'information', Icon: Info },
  success: { className: 'success', Icon: CircleCheck },
  warning: { className: 'warning', Icon: TriangleAlert },
  closure: { className: 'closure', Icon: CircleX },
  'special hours': {
    className: 'special-hours',
    Icon: CalendarClock,
  },
} as const;
export function Widget({
  schedule,
  type = 'hours',
  now: initialNow,
  liveId,
}: {
  schedule: Schedule;
  type?: WidgetType;
  now?: string;
  liveId?: string;
}) {
  const [data, setData] = useState(schedule),
    [now, setNow] = useState(initialNow || new Date().toISOString()),
    [expanded, setExpanded] = useState(true),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => setData(schedule), [schedule]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!liveId) return;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/public/${liveId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const body = await res.json();
        setData(body.schedule);
        setUnavailable(false);
      } catch {
        setUnavailable(true);
      }
    };
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [liveId]);
  const status = getStatus(data, new Date(now));
  const w = data.widget;
  const style = {
    '--widget-accent': w.accent,
    borderRadius: w.radius,
    textAlign: w.alignment,
    fontFamily: w.font === 'serif' ? 'Georgia, serif' : 'inherit',
  } as CSSProperties;
  if (data.widgetVisibility?.[type] === false) return null;
  if (unavailable)
    return (
      <div className="widget" style={style}>
        <p>Hours temporarily unavailable. Please contact the business.</p>
      </div>
    );
  if (type === 'banner') {
    const a = status.announcement;
    if (!a) return null;
    const announcementStyle = announcementStyles[a.type];
    const AnnouncementIcon = announcementStyle.Icon;
    const defaultColours = announcementStyleColours[a.type];
    const bannerStyle = {
      ...style,
      '--announcement-font-colour': a.fontColour || defaultColours.font,
      '--announcement-background-colour': a.backgroundColour || defaultColours.background,
      '--announcement-border-colour': a.borderColour || defaultColours.border,
    } as CSSProperties;
    return (
      <div
        className={`widget announcement-widget announcement-${announcementStyle.className} ${w.theme}`}
        style={bannerStyle}
      >
        <div
          className={`announcement-widget-content ${a.messageVisible !== false && a.messagePosition !== 'below' ? 'is-inline' : ''}`}
        >
          {(AnnouncementIcon || a.title) && (
            <div className="announcement-widget-heading">
              {AnnouncementIcon && <AnnouncementIcon size={17} aria-hidden="true" />}
              {a.title && <strong>{a.title}</strong>}
            </div>
          )}
          {a.messageVisible !== false && a.message && <RichText value={a.message} />}
        </div>
        {a.ctaText && a.ctaUrl && (
          <a href={a.ctaUrl} target="_blank" rel="noopener noreferrer">
            {a.ctaText} <ExternalLink size={13} />
          </a>
        )}
      </div>
    );
  }
  return (
    <section
      className={`widget widget-type-${type} ${w.theme} ${w.compact ? 'compact' : ''}`}
      style={style}
      aria-label={`${data.name} opening hours`}
    >
      {data.logo && (
        <Image
          src={data.logo}
          alt=""
          width={40}
          height={40}
          unoptimized
          referrerPolicy="no-referrer"
          style={{ objectFit: 'contain', marginBottom: 12 }}
        />
      )}
      <div className="widget-heading">
        {w.showName && <div className="widget-name">{data.name}</div>}
        <a className="widget-credit" href="/" target="_blank" rel="noopener">
          Powered by <b>OpenSync</b>
        </a>
      </div>
      <div className="widget-status">
        <span className={`status-dot ${status.open ? 'green' : 'gray'}`} />
        <strong>{status.open ? 'Open now' : 'Closed now'}</strong>
        <span className="widget-next">{status.nextLabel}</span>
      </div>
      {type === 'hours' && (
        <>
          <div className="widget-today">
            <Clock size={16} />
            <span>Today</span>
            <strong>{formatIntervals(status.today)}</strong>
          </div>
          <button
            className="widget-expand"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            Business hours <ChevronDown size={16} />
          </button>
          {expanded && (
            <div className="widget-week">
              {days.map((d, i) => (
                <div key={d}>
                  <span>{d}</span>
                  <span>{formatIntervals(data.weekly[i])}</span>
                </div>
              ))}
              {data.exceptions
                .filter((e) => e.end >= status.date)
                .slice(0, 3)
                .map((e) => (
                  <div key={e.id} className="widget-special">
                    <span>
                      {e.label || e.start}
                      <small>{e.start}</small>
                    </span>
                    <span>{formatIntervals(e.intervals)}</span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
      {type === 'hours' && (
        <div className="widget-footer">
          <div className="widget-zone">Times in {data.timezone.replaceAll('_', ' ')}</div>
        </div>
      )}
    </section>
  );
}
