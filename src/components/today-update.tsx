import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatIntervals, replaceException, type Interval, type Schedule } from '@/lib/domain';
import { Button } from './ui/button';
import styles from './dashboard-overview.module.css';

const choices = ['Closing early', 'Closed today', 'Opening late'] as const;
type Choice = (typeof choices)[number];

export function TodayUpdate({
  schedule,
  date,
  existing,
  busy,
  error,
  destination,
  needsReview,
  onConfirm,
  onCustom,
}: {
  schedule: Schedule;
  date: string;
  existing: Interval[];
  busy: boolean;
  error: string;
  destination: string;
  needsReview: boolean;
  onConfirm: (value: Schedule, date: string) => void;
  onCustom: () => void;
}) {
  const [choice, setChoice] = useState<Choice>();
  const [time, setTime] = useState('');
  const [id] = useState(() => crypto.randomUUID());
  const [review, setReview] = useState(false);
  const overnight = existing.some(({ open, close }) => close < open);
  const intervals =
    choice === 'Closed today'
      ? []
      : existing.flatMap((period) => {
          if (choice === 'Closing early' && period.open < time)
            return [{ ...period, close: period.close < time ? period.close : time }];
          if (choice === 'Opening late' && period.close > time)
            return [{ ...period, open: period.open > time ? period.open : time }];
          return [];
        });
  const boundary = choice === 'Closing early' ? existing.at(-1)?.close : existing[0]?.open;
  const valid =
    choice === 'Closed today' ||
    !!(
      time &&
      boundary &&
      (choice === 'Closing early'
        ? time < boundary && intervals.at(-1)?.close === time
        : time > boundary && intervals[0]?.open === time)
    );
  const dateLabel = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));

  return (
    <>
      <div className="modal-heading">
        <div className="modal-icon" aria-hidden="true">
          <CalendarDays size={23} />
        </div>
        <div>
          <h2>
            {review
              ? 'Check today’s update'
              : choice && choice !== 'Closed today'
                ? choice === 'Closing early'
                  ? 'What time are you closing?'
                  : 'What time are you opening?'
                : 'What changed today?'}
          </h2>
          <p className="muted">
            {schedule.name} · {dateLabel}
          </p>
        </div>
      </div>
      {!choice ? (
        <div className={styles.actionGrid}>
          {choices.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setChoice(item);
                if (item === 'Closed today') setReview(true);
              }}
              disabled={item !== 'Closed today' && (!existing.length || overnight)}
            >
              {item}
            </button>
          ))}
          <button type="button" onClick={onCustom}>
            Different hours today
          </button>
        </div>
      ) : review ? (
        <>
          <div className="notice subtle">
            <strong>{intervals.length ? formatIntervals(intervals) : 'Closed all day'}</strong>
            <p>This applies today only. Your usual weekly hours stay the same.</p>
            <small>
              {needsReview
                ? 'You’ll review this change with your other hours before publishing.'
                : destination}
            </small>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setReview(false);
                setChoice(undefined);
                setTime('');
              }}
            >
              Back
            </Button>
            <Button
              disabled={busy || !valid}
              onClick={() =>
                onConfirm(
                  replaceException(schedule, {
                    id,
                    start: date,
                    end: date,
                    label: choice,
                    intervals,
                  }),
                  date,
                )
              }
            >
              {busy ? 'Updating…' : needsReview ? 'Review changes' : 'Update now'}
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) setReview(true);
          }}
        >
          <p className="muted">Current hours today: {formatIntervals(existing)}</p>
          <label>
            {choice === 'Closing early' ? 'Closing time' : 'Opening time'}
            <input
              type="time"
              autoFocus
              value={time}
              required
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
          {time && !valid && (
            <p className="form-error">
              Choose a time that{' '}
              {choice === 'Closing early'
                ? 'keeps some opening hours and closes earlier.'
                : 'opens later and keeps some opening hours.'}
            </p>
          )}
          <div className="modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setChoice(undefined);
                setTime('');
              }}
            >
              Back
            </Button>
            <Button type="submit" disabled={!valid}>
              Continue
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
