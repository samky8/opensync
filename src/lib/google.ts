import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from '@/db';
import { connections } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { appUrl, googleConfigured } from './server';
import { days, type Schedule } from './domain';
type Tokens = { access_token: string; refresh_token?: string; expires_at: number };
export function encrypt(value: unknown) {
  const iv = randomBytes(12),
    key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || '', 'hex');
  if (key.length !== 32) throw new Error('Token encryption setup required');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function decrypt(value: string): Tokens {
  const bytes = Buffer.from(value, 'base64'),
    decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'hex'),
      bytes.subarray(0, 12),
    );
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString(),
  );
}
export function validState(actual: string | null, expected: string | undefined) {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const redirectUri = () => `${appUrl()}/api/google/callback`;
export async function tokenExchange(values: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...values,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new GoogleError(res.status === 400 ? 401 : res.status);
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}
export async function googleAccess(locationId: string) {
  const [c] = await db().select().from(connections).where(eq(connections.locationId, locationId));
  if (!c) throw new Error('Google connection not found');
  let token = decrypt(c.encryptedTokens);
  if (token.expires_at < Date.now() + 60000) {
    if (!token.refresh_token) throw new Error('Google authorization expired. Reconnect Google.');
    const renewed = await tokenExchange({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    });
    token = { ...token, ...renewed, expires_at: Date.now() + renewed.expires_in * 1000 };
    await db()
      .update(connections)
      .set({ encryptedTokens: encrypt(token), updatedAt: new Date() })
      .where(eq(connections.locationId, locationId));
  }
  return { connection: c, token: token.access_token };
}
export class GoogleError extends Error {
  constructor(public status: number) {
    super(
      status === 401 || status === 403
        ? 'Google access denied. Reconnect or check API approval.'
        : `Google request failed (${status})`,
    );
  }
}
export async function googleFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new GoogleError(res.status);
  return res.json();
}
const clock = (v: string) => ({ hours: Number(v.slice(0, 2)), minutes: Number(v.slice(3)) });
const gDate = (v: string) => {
  const [year, month, day] = v.split('-').map(Number);
  return { year, month, day };
};
export function googleHours(s: Schedule) {
  const periods = s.weekly.flatMap((ints, d) =>
    ints.map((i) => ({
      openDay: days[d].toUpperCase(),
      openTime: clock(i.open),
      closeDay: days[(d + (i.close < i.open ? 1 : 0)) % 7].toUpperCase(),
      closeTime: clock(i.close),
    })),
  );
  const specialHourPeriods: unknown[] = [];
  for (const e of s.exceptions) {
    let date = e.start;
    let count = 0;
    while (date <= e.end) {
      if (++count > 366) throw new Error('Google special date range limit is 366 days');
      if (!e.intervals.length) specialHourPeriods.push({ startDate: gDate(date), closed: true });
      for (const i of e.intervals) {
        const end = new Date(`${date}T12:00:00Z`);
        if (i.close < i.open) end.setUTCDate(end.getUTCDate() + 1);
        specialHourPeriods.push({
          startDate: gDate(date),
          endDate: gDate(end.toISOString().slice(0, 10)),
          openTime: clock(i.open),
          closeTime: clock(i.close),
          closed: false,
        });
      }
      const next = new Date(`${date}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      date = next.toISOString().slice(0, 10);
    }
  }
  return { regularHours: { periods }, specialHours: { specialHourPeriods } };
}
export async function googleDisconnect(id: string) {
  const [c] = await db().select().from(connections).where(eq(connections.locationId, id));
  if (c) {
    const token = decrypt(c.encryptedTokens);
    const res = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: token.refresh_token || token.access_token }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok && res.status !== 400)
      throw new Error('Google token revocation failed. Try again before disconnecting.');
    await db().delete(connections).where(eq(connections.locationId, id));
  }
}
export function assertGoogle() {
  if (!googleConfigured())
    throw new Error('Google integration setup required: credentials, token key, and API approval');
}
