'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import {
  Plus,
  Trash2,
  Copy,
  CalendarDays,
  Clock,
  ArrowRight,
  Bold,
  Italic,
  Link2,
  List,
  Info,
  CircleCheck,
  TriangleAlert,
  CircleX,
  CalendarClock,
  Type,
  Pencil,
  Check,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import {
  announcementStyleColours,
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
import { RichText } from './rich-text';
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
  onLogoChange,
  disabled = false,
  showLogo = true,
}: {
  disabled?: boolean;
  showLogo?: boolean;
  draft: Schedule;
  onChange: (s: Schedule) => void;
  onLogoChange?: (logo: string) => void;
}) {
  const [timezones, setTimezones] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    const now = new Date();
    const zones = [...new Set([...Intl.supportedValuesOf('timeZone'), 'UTC', draft.timezone])];
    setTimezones(
      zones.sort().map((value) => {
        const offset = new Intl.DateTimeFormat('en', {
          timeZone: value,
          timeZoneName: 'longOffset',
        })
          .formatToParts(now)
          .find((part) => part.type === 'timeZoneName')!
          .value.replace('GMT', 'UTC');
        return {
          value,
          label: `${value.replaceAll('_', ' ')} (${offset === 'UTC' ? 'UTC+00:00' : offset})`,
        };
      }),
    );
  }, [draft.timezone]);
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
        <select
          value={draft.timezone}
          onChange={(e) => onChange({ ...draft, timezone: e.target.value })}
        >
          {!timezones.length && <option value={draft.timezone}>{draft.timezone}</option>}
          {timezones.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <small>UTC offsets reflect daylight saving time where applicable.</small>
      </label>
      <label className="span-two">
        <span className="field-label">
          Address <span>(optional)</span>
        </span>
        <input
          value={draft.address}
          onChange={(e) => onChange({ ...draft, address: e.target.value })}
        />
      </label>
      <label>
        <span className="field-label">
          Website <span>(optional)</span>
        </span>
        <input
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbusiness.com"
          value={draft.website}
          onChange={(e) => onChange({ ...draft, website: e.target.value })}
          onBlur={(e) => {
            const website = e.target.value.trim();
            onChange({
              ...draft,
              website:
                website && !/^[a-z][a-z\d+.-]*:/i.test(website)
                  ? `https://${website.replace(/^\/\//, '')}`
                  : website,
            });
          }}
        />
      </label>
      {showLogo && (
        <LogoUpload
          value={draft.logo}
          onChange={(logo) => (onLogoChange ? onLogoChange(logo) : onChange({ ...draft, logo }))}
          disabled={disabled}
        />
      )}
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
      <div className="modal-heading">
        <div className="modal-icon" aria-hidden="true">
          <CalendarDays size={23} />
        </div>
        <div>
          <h2>{kind}</h2>
          <p className="muted">A temporary change. Your regular schedule stays intact.</p>
        </div>
      </div>
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
          <span className="field-label">
            Reason or label <span>(optional)</span>
          </span>
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
  paid = false,
}: {
  draft: Schedule;
  onSubmit: (s: Schedule) => void;
  onCancel: () => void;
  existing?: Schedule['announcements'][number];
  paid?: boolean;
}) {
  const local = (v: string) =>
    v
      ? Temporal.Instant.from(v)
          .toZonedDateTimeISO(draft.timezone)
          .toPlainDateTime()
          .toString()
          .slice(0, 16)
      : '';
  const initialColours = announcementStyleColours[existing?.type || 'none'];
  const [title, setTitle] = useState(existing?.title || ''),
    [message, setMessage] = useState(existing?.message || ''),
    [type, setType] = useState<keyof typeof announcementStyleColours>(existing?.type || 'none'),
    [start, setStart] = useState(existing ? local(existing.start) : ''),
    [end, setEnd] = useState(existing ? local(existing.end) : ''),
    [messagePosition, setMessagePosition] = useState<'below' | 'inline'>(
      existing?.messagePosition || 'inline',
    ),
    [messageVisible, setMessageVisible] = useState(existing?.messageVisible !== false),
    [fontColour, setFontColour] = useState(existing?.fontColour || initialColours.font),
    [backgroundColour, setBackgroundColour] = useState(
      existing?.backgroundColour || initialColours.background,
    ),
    [borderColour, setBorderColour] = useState(existing?.borderColour || initialColours.border),
    [editing, setEditing] = useState<'title' | 'message' | null>(existing ? null : 'message');
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const types = [
    { value: 'none', label: 'None', Icon: Type },
    { value: 'information', label: 'Information', Icon: Info },
    { value: 'success', label: 'Success', Icon: CircleCheck },
    { value: 'warning', label: 'Warning', Icon: TriangleAlert },
    { value: 'closure', label: 'Closure', Icon: CircleX },
    { value: 'special hours', label: 'Special hours', Icon: CalendarClock },
  ] as const;
  const activeType = types.find((item) => item.value === type) || types[0];
  const ActiveIcon = activeType.Icon;
  const quickStarts = [
    {
      label: 'Closing early today',
      title: 'Closing early today',
      message: 'We’ll be wrapping up earlier than usual today. Please check our updated hours.',
      style: 'warning',
    },
    {
      label: 'Closed for the holiday',
      title: 'Holiday closure',
      message: 'We’ll be closed for the holiday and will reopen on our regular schedule.',
      style: 'closure',
    },
    {
      label: 'Open late tonight',
      title: 'Extra time tonight',
      message: 'We’re staying open later than usual tonight. We’d love to see you.',
      style: 'special hours',
    },
    {
      label: 'Back open as usual',
      title: 'We’re back',
      message: 'Good news—we’re open again and following our regular hours.',
      style: 'success',
    },
    {
      label: 'Weather update',
      title: 'Weather may affect our hours',
      message: 'Conditions may change today’s hours. Please check back before heading over.',
      style: 'warning',
    },
    {
      label: 'New hours this week',
      title: 'Temporary hours this week',
      message:
        'Our schedule looks a little different this week. See the latest hours before visiting.',
      style: 'special hours',
    },
  ] as const;

  function applyQuickStyle(value: typeof type) {
    const colours = announcementStyleColours[value];
    setType(value);
    setFontColour(colours.font);
    setBackgroundColour(colours.background);
    setBorderColour(colours.border);
  }

  function formatMessage(prefix: string, suffix = prefix, placeholder = 'text') {
    const field = messageRef.current;
    if (!field) return;
    const startAt = field.selectionStart;
    const endAt = field.selectionEnd;
    const selected = message.slice(startAt, endAt) || placeholder;
    const next = `${message.slice(0, startAt)}${prefix}${selected}${suffix}${message.slice(endAt)}`;
    if (next.length > 500) return;
    setMessage(next);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(startAt + prefix.length, startAt + prefix.length + selected.length);
    });
  }

  function addLink() {
    const field = messageRef.current;
    if (!field) return;
    const label = message.slice(field.selectionStart, field.selectionEnd) || 'link text';
    const url = window.prompt('Paste an HTTPS link');
    if (!url) return;
    if (!/^https:\/\/\S+$/i.test(url)) {
      alert('Use a complete HTTPS link.');
      return;
    }
    formatMessage('[', `](${url})`, label);
  }
  return (
    <form
      className="announcement-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (messageVisible && !message.trim()) {
          setEditing('message');
          requestAnimationFrame(() => messageRef.current?.focus());
          return;
        }
        if (!messageVisible && !title.trim()) {
          setEditing('title');
          return;
        }
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
                messagePosition,
                messageVisible,
                type,
                fontColour,
                backgroundColour,
                borderColour,
                start:
                  existing && start === local(existing.start)
                    ? existing.start
                    : start
                      ? instant(start)
                      : new Date().toISOString(),
                end:
                  existing && end === local(existing.end) ? existing.end : end ? instant(end) : '',
                enabled: existing?.enabled ?? true,
                ctaText: '',
                ctaUrl: '',
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
      <div className="announcement-composer-heading">
        <div>
          <span className="eyebrow">{existing ? 'EDIT ANNOUNCEMENT' : 'NEW ANNOUNCEMENT'}</span>
          <h3>{existing ? 'Fine-tune your update' : 'Create a website update'}</h3>
          <p className="muted">Choose the settings, then edit the preview directly.</p>
        </div>
      </div>
      <div className="announcement-setup-panel">
        <div className="announcement-quick-controls">
          <label>
            <span className="social-control-label">Quick start</span>
            <select
              aria-label="Quick start"
              value=""
              onChange={(event) => {
                const preset = quickStarts.find((item) => item.label === event.target.value);
                if (!preset) return;
                setTitle(preset.title);
                setMessage(preset.message);
                setMessageVisible(true);
                setMessagePosition('inline');
                applyQuickStyle(preset.style);
              }}
            >
              <option value="" disabled>
                Choose a message
              </option>
              {quickStarts.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="social-control-label">Quick style</span>
            <span className={`announcement-style-select is-${type.replace(' ', '-')}`}>
              <ActiveIcon size={17} aria-hidden="true" />
              <select
                aria-label="Quick style"
                value={type}
                onChange={(event) =>
                  applyQuickStyle(event.target.value as keyof typeof announcementStyleColours)
                }
              >
                {types.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
        <div className="announcement-colour-settings">
          {[
            ['Font colour', fontColour, setFontColour],
            ['Background colour', backgroundColour, setBackgroundColour],
            ['Border colour', borderColour, setBorderColour],
          ].map(([label, value, setter]) => (
            <label key={label as string}>
              <span>{label as string}</span>
              <span className="announcement-colour-control">
                <input
                  type="color"
                  aria-label={label as string}
                  value={value as string}
                  onChange={(event) => (setter as (next: string) => void)(event.target.value)}
                />
                <code>{(value as string).toUpperCase()}</code>
              </span>
            </label>
          ))}
        </div>
        <div className="form-grid announcement-settings">
          <label className={!paid ? 'pro-locked' : undefined}>
            <span className="pro-field-label">
              <ProBadge /> Start <span>(optional)</span>
            </span>
            <input
              type="datetime-local"
              value={start}
              disabled={!paid}
              onChange={(e) => setStart(e.target.value)}
            />
            <small>Leave blank to start immediately.</small>
          </label>
          <label className={!paid ? 'pro-locked' : undefined}>
            <span className="pro-field-label">
              <ProBadge /> Expiry <span>(optional)</span>
            </span>
            <input
              type="datetime-local"
              value={end}
              disabled={!paid}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
      </div>
      <section className="announcement-preview-editor" aria-label="Editable announcement preview">
        <div className="announcement-preview-heading">
          <div>
            <span className="eyebrow">EDITABLE PREVIEW</span>
            <h4>Website banner</h4>
          </div>
          <span className="pill">Draft</span>
        </div>
        <div
          className={`announcement-draft-card announcement-${type.replace(' ', '-')}`}
          style={
            {
              '--announcement-font-colour': fontColour,
              '--announcement-background-colour': backgroundColour,
              '--announcement-border-colour': borderColour,
            } as CSSProperties
          }
        >
          <div
            className={`announcement-draft-content ${messagePosition === 'inline' ? 'is-inline' : ''}`}
          >
            <div className="announcement-draft-heading">
              {type !== 'none' && <ActiveIcon size={18} aria-hidden="true" />}
              <div
                className={`announcement-edit-region ${editing === 'title' ? 'is-editing' : ''}`}
              >
                {editing === 'title' ? (
                  <div className="announcement-inline-field">
                    <label>
                      <span className="field-label">
                        Title <span>(optional)</span>
                      </span>
                      <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                        maxLength={100}
                        placeholder="Add a short title"
                      />
                    </label>
                    <button
                      type="button"
                      aria-label="Done editing title"
                      onClick={() => setEditing(null)}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className={!title ? 'announcement-placeholder' : undefined}>
                      {title || 'Add a short title'}
                    </h3>
                    <button
                      type="button"
                      className="announcement-edit-pen"
                      aria-label="Edit title"
                      onClick={() => setEditing('title')}
                    >
                      <Pencil size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
            {messageVisible ? (
              <div
                className={`announcement-edit-region announcement-message-region ${editing === 'message' ? 'is-editing' : ''}`}
              >
                {editing === 'message' ? (
                  <div className="announcement-inline-field announcement-message-field">
                    <label>
                      Message
                      <div className="rich-text-editor">
                        <div
                          className="rich-text-toolbar"
                          role="toolbar"
                          aria-label="Message formatting"
                        >
                          <button
                            type="button"
                            aria-label="Bold"
                            title="Bold"
                            onClick={() => formatMessage('**')}
                          >
                            <Bold size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Italic"
                            title="Italic"
                            onClick={() => formatMessage('*')}
                          >
                            <Italic size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Add link"
                            title="Add link"
                            onClick={addLink}
                          >
                            <Link2 size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Bulleted list"
                            title="Bulleted list"
                            onClick={() => formatMessage('- ', '', 'list item')}
                          >
                            <List size={14} />
                          </button>
                        </div>
                        <textarea
                          ref={messageRef}
                          aria-label="Message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          maxLength={500}
                          required
                          placeholder="What would you like your customers to know?"
                        />
                      </div>
                      <span className="character-counter">{message.length}/500</span>
                    </label>
                    <button
                      type="button"
                      aria-label="Done editing message"
                      onClick={() => setEditing(null)}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    {message ? (
                      <RichText value={message} />
                    ) : (
                      <p className="announcement-placeholder">
                        Add the details your customers need.
                      </p>
                    )}
                    <div className="announcement-message-actions">
                      <button
                        type="button"
                        className="announcement-edit-pen"
                        aria-label="Edit message"
                        onClick={() => setEditing('message')}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="announcement-edit-pen"
                        aria-label={
                          messagePosition === 'below'
                            ? 'Move message beside title'
                            : 'Move message below title'
                        }
                        onClick={() =>
                          setMessagePosition(messagePosition === 'below' ? 'inline' : 'below')
                        }
                      >
                        {messagePosition === 'below' ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )}
                      </button>
                      <button
                        type="button"
                        className="announcement-edit-pen"
                        aria-label="Hide message"
                        onClick={() => {
                          setMessageVisible(false);
                          setEditing(null);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="announcement-add-message"
                onClick={() => {
                  setMessageVisible(true);
                  setEditing('message');
                  requestAnimationFrame(() => messageRef.current?.focus());
                }}
              >
                <Plus size={14} /> Add message
              </button>
            )}
          </div>
        </div>
      </section>
      <small className="muted">
        Schedule in {draft.timezone}. Future activation and automatic expiry require Pro.
        Announcements publish to your website only.
      </small>
      <div className="announcement-composer-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save announcement <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
