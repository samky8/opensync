'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Clock, ChevronDown, ExternalLink, X } from 'lucide-react';
import { days, formatIntervals, getStatus, type Schedule } from '@/lib/domain';
import Image from 'next/image';
export type WidgetType = 'hours' | 'banner' | 'status';
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
    [dismissed, setDismissed] = useState<string | null>(null),
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
  if (unavailable)
    return (
      <div className="widget" style={style}>
        <p>Hours temporarily unavailable. Please contact the business.</p>
      </div>
    );
  if (type === 'banner') {
    const a = status.announcement;
    if (!a || dismissed === a.id) return null;
    return (
      <div className={`widget announcement-widget ${w.theme}`} style={style}>
        {w.dismissible && (
          <button
            aria-label="Dismiss announcement"
            className="widget-close"
            onClick={() => setDismissed(a.id)}
          >
            <X size={16} />
          </button>
        )}
        {a.title && <strong>{a.title}</strong>}
        <p>{a.message}</p>
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
      className={`widget ${w.theme} ${w.compact ? 'compact' : ''}`}
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
      {w.showName && <div className="widget-name">{data.name}</div>}
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
            Opening hours <ChevronDown size={16} />
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
          <div className="widget-zone">Times in {data.timezone.replaceAll('_', ' ')}</div>
        </>
      )}
      <a className="widget-credit" href="/" target="_blank" rel="noopener">
        Powered by <b>OpenSync</b>
      </a>
    </section>
  );
}
