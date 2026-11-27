import 'server-only';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { Temporal } from '@js-temporal/polyfill';
import { db } from '@/db';
import * as t from '@/db/schema';
import { localDate, scheduleSchema } from '@/lib/domain';
import { assertGoogle, googleAccess, GoogleError, googleFetch, googleHours } from '@/lib/google';
import { notificationBits } from '@/lib/notification-preferences';

type EmailKind = 'hours_discrepancy' | 'upcoming_holiday' | 'publishing_issue' | 'weekly_summary';
type Executor = Pick<ReturnType<typeof db>, 'execute'>;
const kindBit: Record<EmailKind, number> = {
  hours_discrepancy: notificationBits.hoursDiscrepancy,
  upcoming_holiday: notificationBits.upcomingHoliday,
  publishing_issue: notificationBits.publishingIssue,
  weekly_summary: notificationBits.weeklySummary,
};

function plain(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(plain).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${plain(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
function digest(value: unknown) {
  return createHash('sha256').update(plain(value)).digest('hex').slice(0, 16);
}

export async function queueNotification(
  executor: Executor,
  event: {
    organizationId: string;
    locationId?: string;
    kind: Exclude<EmailKind, 'weekly_summary'>;
    dedupeKey: string;
    message: string;
    subject: string;
    body: string;
  },
) {
  const inserted = await executor.execute(sql`
    with alert as (
      insert into notifications(organization_id, location_id, kind, dedupe_key, message)
      values(${event.organizationId}, ${event.locationId ?? null}, ${event.kind}, ${event.dedupeKey}, ${event.message})
      on conflict (organization_id, kind, dedupe_key) where dedupe_key is not null do nothing
      returning id, organization_id, location_id, kind, dedupe_key
    ), deliveries as (
      insert into notification_deliveries(user_id, organization_id, location_id, kind, dedupe_key, subject, body)
      select m.user_id, a.organization_id, a.location_id, a.kind, a.dedupe_key,
        ${event.subject}::text, ${event.body}::text
      from alert a join memberships m on m.organization_id=a.organization_id
      join preferences p on p.user_id=m.user_id
      where (p.email_notifications & ${kindBit[event.kind]}) <> 0
      on conflict(user_id, kind, dedupe_key) do nothing
    )
    select id from alert
  `);
  return !!inserted[0];
}

function easterSunday(year: number) {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return Temporal.PlainDate.from({ year, month, day });
}
function nthWeekday(year: number, month: number, weekday: number, nth: number) {
  let date = Temporal.PlainDate.from({ year, month, day: 1 });
  date = date.add({ days: ((weekday - date.dayOfWeek + 7) % 7) + 7 * (nth - 1) });
  return date;
}
function mondayBefore(year: number, month: number, day: number) {
  const date = Temporal.PlainDate.from({ year, month, day }).subtract({ days: 1 });
  return date.subtract({ days: (date.dayOfWeek + 6) % 7 });
}
export function canadianHolidays(year: number) {
  const easter = easterSunday(year);
  return [
    { name: "New Year's Day", date: Temporal.PlainDate.from({ year, month: 1, day: 1 }) },
    { name: 'Good Friday', date: easter.subtract({ days: 2 }) },
    { name: 'Victoria Day', date: mondayBefore(year, 5, 25) },
    { name: 'Canada Day', date: Temporal.PlainDate.from({ year, month: 7, day: 1 }) },
    { name: 'Labour Day', date: nthWeekday(year, 9, 1, 1) },
    {
      name: 'National Day for Truth and Reconciliation',
      date: Temporal.PlainDate.from({ year, month: 9, day: 30 }),
    },
    { name: 'Thanksgiving', date: nthWeekday(year, 10, 1, 2) },
    { name: 'Remembrance Day', date: Temporal.PlainDate.from({ year, month: 11, day: 11 }) },
    { name: 'Christmas Day', date: Temporal.PlainDate.from({ year, month: 12, day: 25 }) },
    { name: 'Boxing Day', date: Temporal.PlainDate.from({ year, month: 12, day: 26 }) },
  ];
}

function normalizedGoogleHours(
  value: {
    regularHours?: { periods?: unknown[] };
    specialHours?: { specialHourPeriods?: unknown[] };
  },
  today: string,
) {
  const clock = (time: unknown) => {
    const item = (time ?? {}) as { hours?: number; minutes?: number };
    return `${item.hours ?? 0}:${item.minutes ?? 0}`;
  };
  const date = (input: unknown) => {
    const item = (input ?? {}) as { year?: number; month?: number; day?: number };
    return [item.year ?? 0, item.month ?? 0, item.day ?? 0]
      .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
      .join('-');
  };
  return {
    regular: (value.regularHours?.periods ?? [])
      .map((input) => {
        const period = input as Record<string, unknown>;
        return [period.openDay, clock(period.openTime), period.closeDay, clock(period.closeTime)];
      })
      .sort((a, b) => plain(a).localeCompare(plain(b))),
    special: (value.specialHours?.specialHourPeriods ?? [])
      .map((input) => {
        const period = input as Record<string, unknown>;
        return [
          date(period.startDate),
          date(period.endDate ?? period.startDate),
          Boolean(period.closed),
          clock(period.openTime),
          clock(period.closeTime),
        ];
      })
      .filter((period) => String(period[1]) >= today)
      .sort((a, b) => plain(a).localeCompare(plain(b))),
  };
}

async function checkUpcomingHolidays(now: Date) {
  const rows = await db().execute(sql`
    select l.id, l.organization_id, r.snapshot
    from locations l
    join revisions r on r.location_id=l.id and r.version=l.published_version
    where l.published_version > 0
  `);
  let queued = 0;
  for (const row of rows) {
    const schedule = scheduleSchema.parse(row.snapshot);
    const today = Temporal.Instant.fromEpochMilliseconds(now.getTime())
      .toZonedDateTimeISO(schedule.timezone)
      .toPlainDate();
    const target = today.add({ days: 7 });
    const holiday = canadianHolidays(target.year).find((item) => item.date.equals(target));
    if (
      !holiday ||
      schedule.exceptions.some(
        (item) => item.start <= target.toString() && item.end >= target.toString(),
      )
    )
      continue;
    const message = `${holiday.name} is in seven days. Add special hours for ${schedule.name}.`;
    if (
      await queueNotification(db(), {
        organizationId: String(row.organization_id),
        locationId: String(row.id),
        kind: 'upcoming_holiday',
        dedupeKey: `holiday:${row.id}:${target}`,
        message,
        subject: `Set your ${holiday.name} hours`,
        body: `${message}\n\nOpen OpenSync to add a closure or one-time schedule before customers check your hours.`,
      })
    )
      queued++;
  }
  return queued;
}

async function checkOneHoursDiscrepancy(now: Date) {
  try {
    assertGoogle();
  } catch {
    return 0;
  }
  const claimed = await db().transaction(async (tx) => {
    const rows = await tx.execute(sql`
      select l.id, l.organization_id, l.published_version, r.snapshot, c.remote_id
      from locations l
      join connections c on c.location_id=l.id and c.status='connected' and c.remote_id is not null
      join revisions r on r.location_id=l.id and r.version=l.published_version
      left join notification_checks nc on nc.location_id=l.id
      where l.published_version > 0
        and (nc.hours_checked_at is null or nc.hours_checked_at < now()-interval '23 hours')
        and not exists (
          select 1 from jobs j where j.revision_id=r.id and j.destination='google'
            and j.status in ('queued','retry') and j.created_at>now()-interval '1 hour'
        )
      order by nc.hours_checked_at nulls first, l.created_at
      for update of l skip locked limit 1
    `);
    if (!rows[0]) return null;
    await tx.execute(sql`
      insert into notification_checks(location_id, hours_checked_at) values(${String(rows[0].id)}, ${now})
      on conflict(location_id) do update set hours_checked_at=excluded.hours_checked_at
    `);
    return rows[0];
  });
  if (!claimed) return 0;
  try {
    const schedule = scheduleSchema.parse(claimed.snapshot);
    const { connection, token } = await googleAccess(String(claimed.id));
    if (connection.status !== 'connected' || connection.remoteId !== claimed.remote_id) return 0;
    const remote = (await googleFetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${connection.remoteId}?readMask=regularHours,specialHours`,
      token,
    )) as {
      regularHours?: { periods?: unknown[] };
      specialHours?: { specialHourPeriods?: unknown[] };
    };
    const today = localDate(schedule.timezone, now);
    const expected = normalizedGoogleHours(googleHours(schedule), today);
    const actual = { regularHours: remote.regularHours, specialHours: remote.specialHours };
    const normalizedActual = normalizedGoogleHours(actual, today);
    if (plain(expected) === plain(normalizedActual)) return 0;
    const message = `Google and your website show different hours for ${schedule.name}.`;
    return Number(
      await queueNotification(db(), {
        organizationId: String(claimed.organization_id),
        locationId: String(claimed.id),
        kind: 'hours_discrepancy',
        dedupeKey: `hours:${claimed.id}:${claimed.published_version}:${digest(normalizedActual)}`,
        message,
        subject: `Hours differ for ${schedule.name}`,
        body: `${message}\n\nReview the current schedule and publish again, or reconnect Google if the difference is unexpected.`,
      }),
    );
  } catch (error) {
    if (error instanceof GoogleError && error.status === 401) {
      return db().transaction(async (tx) => {
        const changed = await tx.execute(sql`
          update connections set status='reconnect', updated_at=now()
          where location_id=${String(claimed.id)} and remote_id=${String(claimed.remote_id)}
            and status='connected' and updated_at<=${now}
          returning location_id
        `);
        if (!changed.length) return 0;
        await queueNotification(tx, {
          organizationId: String(claimed.organization_id),
          locationId: String(claimed.id),
          kind: 'publishing_issue',
          dedupeKey: `google-reconnect:${claimed.id}:${now.toISOString()}`,
          message: 'Google Business Profile needs to be reconnected.',
          subject: 'Reconnect Google Business Profile',
          body: 'Google no longer authorizes OpenSync to access your Business Profile. Reconnect it in OpenSync to restore access.',
        });
        return 0;
      });
    }
    console.error(
      JSON.stringify({
        event: 'notification_hours_check_failed',
        message: error instanceof Error ? error.message : 'unknown',
      }),
    );
    return 0;
  }
}

async function queueWeeklySummaries(now: Date) {
  if (now.getUTCDay() !== 1) return 0;
  const week = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const users = await db().execute(sql`
    select distinct m.user_id
    from memberships m join preferences p on p.user_id=m.user_id
    where (p.email_notifications & ${kindBit.weekly_summary}) <> 0
  `);
  let queued = 0;
  for (const user of users) {
    const [summary] = await db().execute(sql`
      select count(distinct a.id)::int as changes,
        count(distinct j.id) filter(where j.status in ('failed','retry'))::int as issues,
        count(distinct l.id)::int as locations
      from memberships m
      join locations l on l.organization_id=m.organization_id
      left join activity a on a.location_id=l.id and a.created_at >= ${new Date(now.getTime() - 7 * 86400000)}
      left join jobs j on j.location_id=l.id and j.created_at >= ${new Date(now.getTime() - 7 * 86400000)}
      where m.user_id=${String(user.user_id)}
    `);
    const changes = Number(summary?.changes || 0),
      issues = Number(summary?.issues || 0),
      locations = Number(summary?.locations || 0);
    const result = await db().execute(sql`
      insert into notification_deliveries(user_id, kind, dedupe_key, subject, body)
      values(${String(user.user_id)}, 'weekly_summary', ${`weekly:${week}`}, 'Your weekly OpenSync summary',
        ${`Here is your last seven days in OpenSync:\n\n${changes} activity update${changes === 1 ? '' : 's'}\n${issues} publishing issue${issues === 1 ? '' : 's'}\n${locations} business location${locations === 1 ? '' : 's'} monitored\n\nOpen OpenSync to review details and system health.`})
      on conflict(user_id, kind, dedupe_key) do nothing returning id
    `);
    queued += Number(!!result[0]);
  }
  return queued;
}

async function checkSocialPublishingIssues(now: Date) {
  const rows = await db().execute(sql`
    select s.id, s.platform, s.location_id, l.organization_id
    from social_publications s join locations l on l.id=s.location_id
    where s.status in ('failed', 'unknown')
      and s.updated_at >= ${new Date(now.getTime() - 86400000)}
      and not exists (
        select 1 from notifications n where n.organization_id=l.organization_id
          and n.kind='publishing_issue' and n.dedupe_key='social:' || s.id::text
      )
    order by s.updated_at limit 50
  `);
  for (const row of rows) {
    await queueNotification(db(), {
      organizationId: String(row.organization_id),
      locationId: String(row.location_id),
      kind: 'publishing_issue',
      dedupeKey: `social:${row.id}`,
      message: `${row.platform} publishing needs attention.`,
      subject: `${row.platform} publishing needs attention`,
      body: `OpenSync could not confirm a ${row.platform} publication. Review its status in Social Studio before trying again.`,
    });
  }
  return rows.length;
}

export async function runNotificationChecks(now = new Date()) {
  const [holidays, discrepancyResults, summaries, socialIssues] = await Promise.all([
    checkUpcomingHolidays(now),
    Promise.all(Array.from({ length: 5 }, () => checkOneHoursDiscrepancy(now))),
    queueWeeklySummaries(now),
    checkSocialPublishingIssues(now),
  ]);
  return {
    holidays,
    discrepancies: discrepancyResults.reduce((total, count) => total + count, 0),
    summaries,
    socialIssues,
  };
}

function emailHtml(body: string) {
  const escaped = body
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\n', '<br>');
  return `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#202124;max-width:600px"><h2 style="color:#5f56b3">OpenSync</h2><p>${escaped}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://opensync.ca'}/dashboard" style="color:#5f56b3">Open OpenSync</a></p></div>`;
}

export async function sendOneNotificationEmail() {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL_FROM) return false;
  const delivery = await db().transaction(async (tx) => {
    const rows = await tx.execute(sql`
      select d.*, u.email from notification_deliveries d join auth.users u on u.id=d.user_id
      left join preferences p on p.user_id=d.user_id
      where ((d.status in ('queued','failed') and d.next_attempt<=now())
        or (d.status='sending' and d.locked_at<now()-interval '10 minutes'))
        and d.attempts < 6 and u.email is not null and u.email_confirmed_at is not null
        and (coalesce(p.email_notifications, 0) & case d.kind
          when 'hours_discrepancy' then 1 when 'upcoming_holiday' then 2
          when 'publishing_issue' then 4 when 'weekly_summary' then 8 end) <> 0
        and (d.organization_id is null or exists (
          select 1 from memberships m where m.organization_id=d.organization_id and m.user_id=d.user_id
        ))
      order by d.created_at for update of d skip locked limit 1
    `);
    if (!rows[0]) return null;
    await tx.execute(
      sql`update notification_deliveries set status='sending', locked_at=now() where id=${String(rows[0].id)}`,
    );
    return rows[0];
  });
  if (!delivery) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': String(delivery.id),
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_EMAIL_FROM,
        to: [String(delivery.email)],
        subject: String(delivery.subject),
        text: String(delivery.body),
        html: emailHtml(String(delivery.body)),
      }),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    await db()
      .update(t.notificationDeliveries)
      .set({ status: 'sent', sentAt: new Date(), error: null })
      .where(sql`${t.notificationDeliveries.id}=${String(delivery.id)}`);
  } catch (error) {
    const attempts = Number(delivery.attempts) + 1;
    await db()
      .update(t.notificationDeliveries)
      .set({
        status: 'failed',
        attempts,
        error: error instanceof Error ? error.message.slice(0, 500) : 'Email delivery failed',
        nextAttempt: new Date(Date.now() + Math.min(86400000, 60000 * 2 ** attempts)),
      })
      .where(sql`${t.notificationDeliveries.id}=${String(delivery.id)}`);
  }
  return true;
}
