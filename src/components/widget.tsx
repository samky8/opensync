'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  CalendarClock,
  ChevronDown,
  CircleCheck,
  CircleX,
  Clock,
  ExternalLink,
  Globe,
  Info,
  TriangleAlert,
} from 'lucide-react';
import {
  announcementStyleColours,
  days,
  getStatus,
  widgetAppearanceFor,
  type BannerPreset,
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
const widgetShadows = [
  'none',
  '0 2px 6px rgba(23, 33, 60, 0.08)',
  '0 6px 18px rgba(23, 33, 60, 0.12)',
  '0 12px 30px rgba(23, 33, 60, 0.16)',
  '0 20px 50px rgba(23, 33, 60, 0.22)',
] as const;

export function bannerLayoutStyle(appearance: BannerPreset) {
  return {
    '--announcement-vertical-padding':
      appearance.verticalPadding == null ? undefined : `${appearance.verticalPadding}px`,
    '--announcement-width':
      appearance.widthPercent == null ? undefined : `${appearance.widthPercent}%`,
    borderRadius: appearance.radius,
    textAlign: appearance.alignment,
    fontFamily: appearance.font ? widgetFontFamilies[appearance.font] : undefined,
    fontSize: typeof appearance.fontSize === 'number' ? `${appearance.fontSize}px` : 'inherit',
  } as CSSProperties;
}

function ScrollingAnnouncement({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const [loopDistance, setLoopDistance] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const item = itemRef.current;
    if (!viewport || !track || !item) return;
    const measure = () => {
      const contentWidth = item.scrollWidth;
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      setLoopDistance(contentWidth > viewport.clientWidth ? contentWidth + gap : 0);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(item);
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`announcement-scroll${loopDistance ? ' is-scrolling' : ''}`}
      ref={viewportRef}
      tabIndex={loopDistance ? 0 : undefined}
    >
      <div
        className="announcement-scroll-track"
        ref={trackRef}
        style={
          {
            '--announcement-scroll-end': `${-loopDistance}px`,
            '--announcement-scroll-duration': `${Math.max(4, loopDistance / 20)}s`,
          } as CSSProperties
        }
      >
        <div className="announcement-scroll-item" ref={itemRef}>
          {children}
        </div>
        {loopDistance > 0 && (
          <div className="announcement-scroll-item" aria-hidden="true">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function Widget({
  schedule,
  type = 'hours',
  now: initialNow,
  liveId,
  previewWidgetStyle = false,
}: {
  schedule: Schedule;
  type?: WidgetType;
  now?: string;
  liveId?: string;
  previewWidgetStyle?: boolean;
}) {
  const [data, setData] = useState(schedule),
    [now, setNow] = useState(initialNow || new Date().toISOString()),
    [automaticLocale, setAutomaticLocale] = useState('en-CA'),
    [hoursDisclosure, setHoursDisclosure] = useState<{
      expandedByDefault: boolean;
      expanded: boolean;
    } | null>(null),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => setData(schedule), [schedule]);
  useEffect(() => {
    const preferred = navigator.languages.find((language) => /^(en|fr)(-|$)/i.test(language));
    setAutomaticLocale(preferred ?? 'en-CA');
  }, []);
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
  const bannerPreset =
    type === 'banner' && !previewWidgetStyle ? status.announcement?.bannerPreset : undefined;
  const w = { ...widgetAppearanceFor(data.widget, type), ...bannerPreset };
  const locale = w.language === 'fr' ? 'fr-CA' : w.language === 'en' ? 'en-CA' : automaticLocale;
  const french = locale.toLowerCase().startsWith('fr');
  const localLabel = (custom: string, english: string, translated: string) =>
    french && custom === english ? translated : custom.trim() || (french ? translated : english);
  const timeOptions = widgetTimeOptions(w.timeFormat);
  const specialHoursThrough = addUtcDays(status.date, w.upcomingSpecialDays);
  const nextInstant = status.next ? new Date(status.next) : null;
  const minutesUntilNext = nextInstant
    ? Math.max(0, (nextInstant.getTime() - new Date(now).getTime()) / 60000)
    : Number.POSITIVE_INFINITY;
  const soon = status.open
    ? w.closingSoonMinutes > 0 && minutesUntilNext <= w.closingSoonMinutes
    : w.openingSoonMinutes > 0 && minutesUntilNext <= w.openingSoonMinutes;
  const statusLabel = status.open
    ? soon
      ? localLabel(w.closingSoonLabel, 'Closing soon', 'Ferme bientôt')
      : localLabel(w.openLabel, 'Open now', 'Ouvert')
    : soon
      ? localLabel(w.openingSoonLabel, 'Opening soon', 'Ouvre bientôt')
      : localLabel(w.closedLabel, 'Closed now', 'Fermé');
  const nextLabel =
    nextInstant && (status.open || w.showNextOpening)
      ? `${status.open ? (french ? 'Ferme' : 'Closes') : french ? 'Ouvre' : 'Opens'} ${new Intl.DateTimeFormat(
          locale,
          {
            timeZone: data.timezone,
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
            ...timeOptions,
          },
        ).format(nextInstant)}`
      : status.open
        ? french
          ? 'Ouvert sans fermeture prévue'
          : 'Open with no scheduled closing'
        : w.showNextOpening
          ? french
            ? 'Aucune heure d’ouverture à venir'
            : 'No upcoming opening hours'
          : '';
  const expandedByDefault = !w.collapsible || w.expandedByDefault !== false;
  const disclosureMatchesDefault = hoursDisclosure?.expandedByDefault === expandedByDefault;
  if (hoursDisclosure && (!w.collapsible || !disclosureMatchesDefault)) {
    setHoursDisclosure(null);
  }
  const expanded = disclosureMatchesDefault ? hoursDisclosure.expanded : expandedByDefault;
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
    boxShadow: widgetShadows[w.shadow],
    '--widget-shadow-gutter': w.shadow > 0 ? `${6 + w.shadow * 4}px` : undefined,
  } as CSSProperties;
  const credit = w.showBranding !== false && (
    <a className="widget-credit" href="/" target="_blank" rel="noopener">
      {french ? 'Propulsé par' : 'Powered by'} <b>OpenSync</b>
    </a>
  );
  if (data.widgetVisibility?.[type] === false) return null;
  if (unavailable)
    return (
      <div className="widget" style={style}>
        <p>
          {french
            ? 'Heures temporairement indisponibles. Veuillez contacter l’entreprise.'
            : 'Hours temporarily unavailable. Please contact the business.'}
        </p>
      </div>
    );
  if (type === 'banner') {
    const a = status.announcement;
    if (!a) return null;
    const announcementStyle = announcementStyles[a.type];
    const AnnouncementIcon = announcementStyle.Icon;
    const defaultColours = announcementStyleColours[a.type];
    const bannerOverrides = bannerPreset ?? data.widget.overrides?.banner;
    const overrideBackground =
      bannerOverrides?.background === 'none'
        ? 'transparent'
        : bannerOverrides?.background === 'auto'
          ? undefined
          : bannerOverrides?.background;
    const bannerStyle = {
      ...style,
      ...bannerLayoutStyle(w),
      '--announcement-font-colour':
        (bannerPreset ? undefined : bannerOverrides?.accent) ?? a.fontColour ?? defaultColours.font,
      '--announcement-background-colour':
        (bannerPreset ? a.backgroundColour : overrideBackground) ||
        overrideBackground ||
        a.backgroundColour ||
        defaultColours.background,
      '--announcement-border-colour':
        !bannerPreset && bannerOverrides?.borderColour && bannerOverrides.borderColour !== 'auto'
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
        {w.scrollText !== false ? (
          <ScrollingAnnouncement>{content}</ScrollingAnnouncement>
        ) : (
          content
        )}
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
      lang={locale}
      aria-label={french ? `Heures d’ouverture de ${data.name}` : `${data.name} opening hours`}
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
          <strong>{statusLabel}</strong>
          {nextLabel && <span className="widget-next">{nextLabel}</span>}
        </div>
      )}
      {type === 'hours' && (
        <>
          {activeExtendedClosure ? (
            <div className="widget-closure" role="status">
              <strong>
                {activeExtendedClosure.label ||
                  (french ? 'Fermé temporairement' : 'Temporarily closed')}
              </strong>
              <span>
                {formatClosureDate(activeExtendedClosure.start, locale)} –{' '}
                {formatClosureDate(activeExtendedClosure.end, locale)}
              </span>
              <small>
                {french
                  ? 'Les heures habituelles reprendront après cette fermeture.'
                  : 'Regular hours resume after this closure.'}
              </small>
            </div>
          ) : w.highlightToday !== false ? (
            <div className="widget-today">
              <Clock size={16} />
              <span>{french ? 'Aujourd’hui' : 'Today'}</span>
              <strong>{formatWidgetIntervals(status.today, locale, w.timeFormat, french)}</strong>
            </div>
          ) : null}
          {!activeExtendedClosure && w.collapsible !== false && (
            <button
              className="widget-expand"
              onClick={() => setHoursDisclosure({ expandedByDefault, expanded: !expanded })}
              aria-expanded={expanded}
            >
              {french ? 'Heures d’ouverture' : 'Business hours'} <ChevronDown size={16} />
            </button>
          )}
          {!activeExtendedClosure && (w.collapsible === false || expanded) && (
            <div className="widget-week">
              {(w.weekStart === 'sunday' ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6]).map(
                (i) => (
                  <div key={days[i]}>
                    <span>{formatWidgetDay(i, locale, w.dayFormat)}</span>
                    <span>
                      {formatWidgetIntervals(data.weekly[i], locale, w.timeFormat, french)}
                    </span>
                  </div>
                ),
              )}
              {data.exceptions
                .filter((e) => e.end >= status.date && e.start <= specialHoursThrough)
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((e) => {
                  const label = e.label.trim();
                  return (
                    <div key={e.id} className="widget-special">
                      <span>
                        {label || e.start}
                        {label && label !== e.start && <small>{e.start}</small>}
                      </span>
                      <span>
                        {formatWidgetIntervals(e.intervals, locale, w.timeFormat, french)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
      {type === 'hours' && (w.showTimezone || credit) && (
        <div className="widget-footer">
          {w.showTimezone && (
            <div className="widget-zone">
              <Globe size={11} strokeWidth={1.6} aria-hidden="true" />
              <span>{formatTimeZoneName(data.timezone, locale)}</span>
            </div>
          )}
          {credit}
        </div>
      )}
    </section>
  );
}

function formatTimeZoneName(timezone: string, locale = 'en-CA') {
  const referenceDate = new Date('2026-01-15T12:00:00Z');
  const name = (length: 'longGeneric' | 'shortGeneric') =>
    new Intl.DateTimeFormat(locale, { timeZone: timezone, timeZoneName: length })
      .formatToParts(referenceDate)
      .find((part) => part.type === 'timeZoneName')?.value;
  const longName = name('longGeneric') || timezone.replaceAll('_', ' ');
  const abbreviation = name('shortGeneric');

  return abbreviation && abbreviation !== longName && !abbreviation.startsWith('GMT')
    ? `${longName} (${abbreviation})`
    : longName;
}

function formatWidgetDay(index: number, locale: string, format: Schedule['widget']['dayFormat']) {
  return new Intl.DateTimeFormat(locale, { weekday: format, timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 10, 2 + index)),
  );
}

function formatWidgetIntervals(
  intervals: Schedule['weekly'][number],
  locale: string,
  format: 'auto' | '12' | '24',
  french: boolean,
) {
  if (!intervals.length) return french ? 'Fermé' : 'Closed';
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    ...widgetTimeOptions(format),
  });
  return intervals
    .map((interval) => {
      const time = (value: string) =>
        formatter.format(new Date(`2026-01-01T${value}:00Z`)).replace(/\s/g, ' ');
      return `${time(interval.open)} – ${time(interval.close)}${
        interval.close < interval.open ? (french ? ' (+1 jour)' : ' (+1 day)') : ''
      }`;
    })
    .join(', ');
}

function widgetTimeOptions(format: Schedule['widget']['timeFormat']): Intl.DateTimeFormatOptions {
  if (format === '24') return { hourCycle: 'h23' };
  if (format === '12') return { hour12: true };
  return {};
}

function addUtcDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function formatClosureDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}
