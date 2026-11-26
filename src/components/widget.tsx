'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  widgetAppearanceFor,
  type Schedule,
  type WidgetType,
} from '@/lib/domain';
import Image from 'next/image';
import { RichText } from './rich-text';
export type { WidgetType } from '@/lib/domain';
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
const widgetFontFamilies: Record<Schedule['widget']['font'], string> = {
  auto: 'inherit',
  system: 'Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif',
  humanist: '"Trebuchet MS", Candara, Calibri, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace',
};

function ScrollingAnnouncement({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const measure = () => setDistance(Math.max(0, track.offsetWidth - viewport.clientWidth));
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`announcement-scroll${distance ? ' is-scrolling' : ''}`}
      ref={viewportRef}
      tabIndex={distance ? 0 : undefined}
    >
      <div
        className="announcement-scroll-track"
        ref={trackRef}
        style={
          {
            '--announcement-scroll-end': `${-distance}px`,
            '--announcement-scroll-duration': `${Math.max(4, distance / 20)}s`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

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
  const activeExtendedClosure = data.exceptions.find(
    (exception) =>
      exception.start < exception.end &&
      exception.start <= status.date &&
      exception.end >= status.date &&
      exception.intervals.length === 0,
  );
  const w = widgetAppearanceFor(data.widget, type);
  const style = {
    '--widget-accent': w.accent,
    '--widget-divider-colour':
      type === 'hours' && w.showDividers === false ? 'transparent' : undefined,
    '--widget-background':
      w.background === 'none' ? 'transparent' : w.background !== 'auto' ? w.background : undefined,
    '--widget-border-colour':
      type !== 'banner' && w.borderColour !== 'auto' ? w.borderColour : undefined,
    borderWidth: type !== 'banner' ? `${w.borderWidth}px` : undefined,
    borderRadius: w.radius,
    textAlign: w.alignment,
    fontFamily: widgetFontFamilies[w.font] || 'inherit',
    fontSize: w.fontSize === 'auto' || w.fontSize == null ? 'inherit' : `${w.fontSize}px`,
  } as CSSProperties;
  const credit = w.showBranding !== false && (
    <a className="widget-credit" href="/" target="_blank" rel="noopener">
      Powered by <b>OpenSync</b>
    </a>
  );
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
    const bannerOverrides = data.widget.overrides?.banner;
    const bannerBackground =
      bannerOverrides?.background === 'none'
        ? 'transparent'
        : bannerOverrides?.background && bannerOverrides.background !== 'auto'
          ? bannerOverrides.background
          : a.backgroundColour || defaultColours.background;
    const bannerStyle = {
      ...style,
      '--announcement-font-colour': bannerOverrides?.accent || a.fontColour || defaultColours.font,
      '--announcement-background-colour': bannerBackground,
      '--announcement-border-colour':
        bannerOverrides?.borderColour && bannerOverrides.borderColour !== 'auto'
          ? bannerOverrides.borderColour
          : a.borderColour || defaultColours.border,
      borderLeftWidth:
        bannerOverrides?.borderWidth == null ? undefined : `${bannerOverrides.borderWidth}px`,
    } as CSSProperties;
    const content = (
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
    );
    return (
      <div
        className={`widget announcement-widget announcement-${announcementStyle.className} ${w.theme}${w.alignment === 'center' ? ' is-centered' : ''}`}
        style={bannerStyle}
      >
        {w.scrollText !== false ? <ScrollingAnnouncement>{content}</ScrollingAnnouncement> : content}
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
      {w.showLogo !== false && data.logo && (
        <Image
          className="widget-logo"
          src={data.logo}
          alt=""
          width={40}
          height={40}
          unoptimized
          referrerPolicy="no-referrer"
        />
      )}
      {(w.showName || (type === 'status' && credit)) && (
        <div className="widget-heading">
          {w.showName && <div className="widget-name">{data.name}</div>}
          {type === 'status' && credit}
        </div>
      )}
      {(type === 'status' || w.showStatus !== false) && (
        <div className={`widget-status ${status.open ? 'open-now' : 'closed-now'}`}>
          <span className={`status-dot ${status.open ? 'green' : 'red'}`} aria-hidden="true" />
          <strong>{status.open ? 'Open now' : 'Closed now'}</strong>
          <span className="widget-next">{status.nextLabel}</span>
        </div>
      )}
      {type === 'hours' && (
        <>
          {activeExtendedClosure ? (
            <div className="widget-closure" role="status">
              <strong>{activeExtendedClosure.label || 'Temporarily closed'}</strong>
              <span>
                {formatClosureDate(activeExtendedClosure.start)} –{' '}
                {formatClosureDate(activeExtendedClosure.end)}
              </span>
              <small>Regular hours resume after this closure.</small>
            </div>
          ) : w.highlightToday !== false ? (
            <div className="widget-today">
              <Clock size={16} />
              <span>Today</span>
              <strong>{formatIntervals(status.today)}</strong>
            </div>
          ) : null}
          {!activeExtendedClosure && w.collapsible !== false && (
            <button
              className="widget-expand"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              Business hours <ChevronDown size={16} />
            </button>
          )}
          {!activeExtendedClosure && (w.collapsible === false || expanded) && (
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
          {credit}
        </div>
      )}
    </section>
  );
}

function formatClosureDate(date: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}
