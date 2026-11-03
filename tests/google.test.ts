import { describe, it, expect, vi, afterEach } from 'vitest';
vi.mock('../src/db', () => ({ db: vi.fn() }));
vi.mock('../src/lib/server', () => ({
  appUrl: () => 'https://example.com',
  googleConfigured: () => true,
}));
import {
  googleHours,
  validState,
  encrypt,
  decrypt,
  googleFetch,
  GoogleError,
} from '../src/lib/google';
import { defaultSchedule } from '../src/lib/domain';
afterEach(() => vi.unstubAllGlobals());
describe('Google contract', () => {
  it('validates OAuth state including missing and different length', () => {
    expect(validState(null, undefined)).toBe(false);
    expect(validState('abc', 'abcd')).toBe(false);
    expect(validState('abc', 'abd')).toBe(false);
    expect(validState('abc', 'abc')).toBe(true);
  });
  it('encrypts tokens with authenticated encryption and rejects tampering', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
    const token = { access_token: 'secret', expires_at: 100 };
    const encoded = encrypt(token);
    expect(encoded).not.toContain('secret');
    expect(decrypt(encoded)).toEqual(token);
    const bytes = Buffer.from(encoded, 'base64');
    bytes[30] ^= 1;
    expect(() => decrypt(bytes.toString('base64'))).toThrow();
  });
  it('maps only hours fields with overnight close day and explicit closure', () => {
    const s = defaultSchedule();
    s.weekly[6] = [{ open: '20:00', close: '02:00' }];
    s.exceptions = [
      { id: 'x', start: '2026-12-25', end: '2026-12-26', label: 'Holiday', intervals: [] },
    ];
    const mapped = googleHours(s);
    expect(Object.keys(mapped)).toEqual(['regularHours', 'specialHours']);
    expect(mapped.regularHours.periods.at(-1)).toMatchObject({
      openDay: 'SUNDAY',
      closeDay: 'MONDAY',
      closeTime: { hours: 2, minutes: 0 },
    });
    expect(mapped.specialHours.specialHourPeriods).toHaveLength(2);
    expect(mapped.specialHours.specialHourPeriods[0]).toEqual({
      startDate: { year: 2026, month: 12, day: 25 },
      closed: true,
    });
  });
  it('distinguishes transient failures and authorization failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
    await expect(googleFetch('https://example.com', 'secret')).rejects.toMatchObject({
      status: 429,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    await expect(googleFetch('https://example.com', 'secret')).rejects.toBeInstanceOf(GoogleError);
  });
});
