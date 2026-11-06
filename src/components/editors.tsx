'use client';
import { useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { Plus, Trash2, Copy, CalendarDays, Clock, ArrowRight } from 'lucide-react';
import {
  days,
  formatIntervals,
  localDate,
  mins,
  replaceException,
  type Interval,
  type Schedule,
} from '@/lib/domain';
import { Button } from './ui/button';
import { ProBadge } from './ui/pro-badge';
import { LogoUpload } from './logo-upload';
export function Periods({
  value,
  onChange,
}: {
  value: Interval[];
  onChange: (v: Interval[]) => void;
}) {
  const addPeriodButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onChange([...value, { open: '09:00', close: '17:00' }])}
    >
      <Plus size={14} />
      {value.length ? 'Add period' : 'Add hours'}
    </Button>
  );

  return (
    <div className="periods">
      {value.map((item, i) => (
        <div className="period" key={i}>
          <input
            aria-label={`Opening time ${i + 1}`}
            type="time"
            value={item.open}
            onChange={(e) =>
              onChange(value.map((x, n) => (n === i ? { ...x, open: e.target.value } : x)))
            }
          />
          <span>to</span>
          <input
            aria-label={`Closing time ${i + 1}`}
            type="time"
            value={item.close}
            onChange={(e) =>
              onChange(value.map((x, n) => (n === i ? { ...x, close: e.target.value } : x)))
            }
          />
          <button
            type="button"
            className="icon-button"
            aria-label="Remove opening period"
            onClick={() => onChange(value.filter((_, n) => i !== n))}
          >
            <Trash2 size={15} />
          </button>
          {i === value.length - 1 && addPeriodButton}
          {item.close < item.open && <small className="overnight">Next day</small>}
        </div>
      ))}
      {!value.length && addPeriodButton}
    </div>
  );
}
export function WeeklyEditor({
  draft,
  onChange,
  onSpecialHours,
}: {
  draft: Schedule;
  onChange: (s: Schedule) => void;
  onSpecialHours?: () => void;
}) {
  return (
    <div className="card weekly-editor">
      <div className="card-heading">
        <div>
          <h3>Regular opening hours</h3>
          <p>
            Core opening hours repeat every week.{' '}
            {onSpecialHours ? (
              <button type="button" className="text-link" onClick={onSpecialHours}>
                Holidays & exceptions
              </button>
            ) : (
              'Holidays & exceptions'
            )}{' '}
            override them for holidays, closures, or other one-off dates. Your core hours resume
            automatically afterward.
          </p>
        </div>
        <Clock size={20} />
      </div>
      <div className="copy-row">
        <span className="muted">Save a little time</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              ...draft,
              weekly: draft.weekly.map((x, i) => (i < 5 ? structuredClone(draft.weekly[0]) : x)),
            })
          }
        >
          <Copy size={14} />
          Monday → weekdays
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            onChange({ ...draft, weekly: days.map(() => structuredClone(draft.weekly[0])) })
          }
        >
          Copy to all
        </Button>
      </div>
      {days.map((day, d) => (
        <div className="day-row" key={day}>
          <label className="day-toggle">
            <input
              type="checkbox"
              checked={!!draft.weekly[d].length}
              onChange={(e) =>
                onChange({
                  ...draft,
                  weekly: draft.weekly.map((x, i) =>
                    i === d ? (e.target.checked ? [{ open: '09:00', close: '17:00' }] : []) : x,
                  ),
                })
              }
            />
            <strong>{day}</strong>
          </label>
          {draft.weekly[d].length ? (
            <Periods
              value={draft.weekly[d]}
              onChange={(v) =>
                onChange({ ...draft, weekly: draft.weekly.map((x, i) => (i === d ? v : x)) })
              }
            />
          ) : (
            <span className="closed-label">Closed</span>
          )}
        </div>
      ))}
      <div className="card-note">
        Times shown in {draft.timezone}. Overnight periods end the next day. Daylight saving changes
        are applied automatically.
      </div>
    </div>
  );
}
export function BusinessFields({
  draft,
  onChange,
  disabled = false,
}: {
  disabled?: boolean;
  draft: Schedule;
  onChange: (s: Schedule) => void;
}) {
  return (
    <fieldset className="form-grid business-fields" disabled={disabled}>
      <label>
        Business name
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          maxLength={100}
          required
        />
      </label>
      <label>
        Category
        <select
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value })}
        >
          {[
            'Café',
            'Coffee shop',
            'Restaurant',
            'Retail shop',
            'Salon',
            'Services',
            'Food truck',
            'Other',
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label className="span-two">
        Time zone
        <input
          list="timezones"
          value={draft.timezone}
          onChange={(e) => onChange({ ...draft, timezone: e.target.value })}
        />
        <datalist id="timezones">
          {[
            'America/Toronto',
            'America/Vancouver',
            'America/Edmonton',
            'America/Winnipeg',
            'America/Halifax',
            'America/St_Johns',
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'Europe/London',
            'Europe/Paris',
            'Asia/Tokyo',
            'Australia/Sydney',
            'UTC',
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </datalist>
      </label>
      <label className="span-two">
        Address <span>optional</span>
        <input
          value={draft.address}
          onChange={(e) => onChange({ ...draft, address: e.target.value })}
        />
      </label>
      <label>
        Website <span>optional</span>
        <input
          type="url"
          placeholder="https://yourbusiness.com"
          value={draft.website}
          onChange={(e) => onChange({ ...draft, website: e.target.value })}
        />
      </label>
      <LogoUpload
        value={draft.logo}
        onChange={(logo) => onChange({ ...draft, logo })}
        disabled={disabled}
      />
    </fieldset>
  );
}
export function ExceptionForm({
  draft,
  kind,
  onSubmit,
  onCancel,
  existing,
}: {
  draft: Schedule;
  kind: string;
  onSubmit: (s: Schedule) => void;
  onCancel: () => void;
  existing?: Schedule['exceptions'][number];
}) {
  const today = localDate(draft.timezone);
  const date = new Date(`${today}T12:00:00Z`);
  const dow = (date.getUTCDay() + 6) % 7;
  const current =
    draft.exceptions.find((e) => e.start <= today && e.end >= today)?.intervals ||
    draft.weekly[dow];
  const initial = current.length ? structuredClone(current) : [{ open: '09:00', close: '17:00' }];
  const clock = (n: number) =>
    `${String(Math.floor((n % 1440) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  if (kind === 'Close early') {
    const last = initial[initial.length - 1],
      open = mins(last.open),
      end = mins(last.close) + (last.close < last.open ? 1440 : 0);
    const suggested = 840 > open && 840 < end ? 840 : end - 60;
    last.close = clock(Math.min(end - 1, Math.max(open + 1, suggested)));
  }
  if (kind === 'Open late') {
    const first = initial[0],
      end = mins(first.close) + (first.close < first.open ? 1440 : 0);
    first.open = clock(Math.min(mins(first.open) + 60, end - 1));
  }
  const [start, setStart] = useState(existing?.start || today),
    [end, setEnd] = useState(existing?.end || today),
    [label, setLabel] = useState(existing?.label || (kind === 'Add special hours' ? '' : kind)),
    [periods, setPeriods] = useState<Interval[]>(
      existing?.intervals || (kind === 'Closed today' ? [] : initial),
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(
          replaceException(
            draft,
            { id: existing?.id || crypto.randomUUID(), start, end, label, intervals: periods },
            existing?.id,
          ),
        );
      }}
    >
      <div className="modal-icon">
        <CalendarDays size={23} />
      </div>
      <h2>{kind}</h2>
      <p className="muted">A temporary change. Your regular schedule stays intact.</p>
      <div className="form-grid">
        <label>
          Start date
          <input
            type="date"
            value={start}
            required
            onChange={(e) => {
              setStart(e.target.value);
              if (e.target.value > end) setEnd(e.target.value);
            }}
          />
        </label>
        <label>
          End date
          <input
            type="date"
            value={end}
            min={start}
            required
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label className="span-two">
          Reason or label
          <input
            value={label}
            placeholder="Holiday, weather, special event…"
            maxLength={120}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={!periods.length}
          onChange={(e) => setPeriods(e.target.checked ? [] : [{ open: '09:00', close: '17:00' }])}
        />
        Closed all day
      </label>
      {!!periods.length && <Periods value={periods} onChange={setPeriods} />}
      <div className="notice subtle">
        <strong>Customer preview</strong>
        <p>
          {formatIntervals(periods)} · {draft.timezone}
        </p>
        <small>
          Website widgets update when published. Google hours queue if connected and eligible.
        </small>
      </div>
      <div className="modal-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Review & publish <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
export function AnnouncementForm({
  draft,
  onSubmit,
  onCancel,
  existing,
}: {
  draft: Schedule;
  onSubmit: (s: Schedule) => void;
  onCancel: () => void;
  existing?: Schedule['announcements'][number];
}) {
  const local = (v: string) =>
    v
      ? Temporal.Instant.from(v)
          .toZonedDateTimeISO(draft.timezone)
          .toPlainDateTime()
          .toString()
          .slice(0, 16)
      : '';
  const [title, setTitle] = useState(existing?.title || ''),
    [message, setMessage] = useState(existing?.message || ''),
    [type, setType] = useState<'information' | 'warning' | 'closure' | 'special hours'>(
      existing?.type || 'information',
    ),
    [start, setStart] = useState(existing ? local(existing.start) : ''),
    [end, setEnd] = useState(existing ? local(existing.end) : ''),
    [ctaText, setCtaText] = useState(existing?.ctaText || ''),
    [ctaUrl, setCtaUrl] = useState(existing?.ctaUrl || '');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const instant = (v: string) =>
          Temporal.ZonedDateTime.from(`${v}[${draft.timezone}]`, { disambiguation: 'reject' })
            .toInstant()
            .toString();
        try {
          onSubmit({
            ...draft,
            announcements: [
              ...draft.announcements.filter((a) => a.id !== existing?.id),
              {
                id: existing?.id || crypto.randomUUID(),
                title,
                message,
                type,
                start:
                  existing && start === local(existing.start)
                    ? existing.start
                    : start
                      ? instant(start)
                      : new Date().toISOString(),
                end:
                  existing && end === local(existing.end) ? existing.end : end ? instant(end) : '',
                enabled: existing?.enabled ?? true,
                ctaText,
                ctaUrl,
              },
            ],
          });
        } catch {
          alert(
            'This local time does not exist or is ambiguous because of daylight saving. Choose another time.',
          );
        }
      }}
    >
      <div className="modal-icon">
        <Plus size={23} />
      </div>
      <h2>A little heads-up goes a long way.</h2>
      <p className="muted">Post an update to your website banner.</p>
      <div className="template-chips">
        {['Closing early today', 'Closed for the holiday', 'Open late tonight!'].map((x) => (
          <button
            type="button"
            key={x}
            onClick={() => {
              setTitle(x);
              setMessage(x);
            }}
          >
            {x}
          </button>
        ))}
      </div>
      <label>
        Title <span>optional</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      </label>
      <label>
        Message
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          required
          placeholder="What would you like your customers to know?"
        />
      </label>
      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          {['information', 'warning', 'closure', 'special hours'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Start{' '}
          <span>
            blank = now · scheduling <ProBadge />
          </span>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Expiry{' '}
          <span>
            optional <ProBadge />
          </span>
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label>
          Link text
          <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={60} />
        </label>
        <label>
          Link URL
          <input
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
      </div>
      <small className="muted">
        Schedule in {draft.timezone}. Future activation and automatic expiry require Pro.
        Announcements publish to your website only.
      </small>
      <div className="modal-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Review announcement <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
