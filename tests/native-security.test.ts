import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  authorization: null as string | null,
  nativeUser: vi.fn(),
  cookieUser: vi.fn(),
  cookieClient: vi.fn(),
}));
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers(mocks.authorization === null ? {} : { authorization: mocks.authorization }),
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: mocks.nativeUser } }),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => {
    mocks.cookieClient(...args);
    return { auth: { getUser: mocks.cookieUser } };
  },
}));
import { requireUser } from '../src/lib/supabase';
import { checkOrigin } from '../src/lib/server';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorization = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test';
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.DATABASE_URL = 'postgres://unused';
  process.env.NEXT_PUBLIC_APP_URL = 'https://opensync.example';
  mocks.cookieUser.mockResolvedValue({ data: { user: { id: 'cookie-user' } }, error: null });
  mocks.nativeUser.mockResolvedValue({ data: { user: { id: 'native-user' } }, error: null });
});
describe('native authentication and browser CSRF isolation', () => {
  it('uses the publishable key without a legacy anon key', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    expect((await requireUser()).id).toBe('cookie-user');
    expect(mocks.cookieClient.mock.calls[0][1]).toBe('sb_publishable_test');
  });
  it('validates native tokens with Supabase rather than trusting token claims', async () => {
    mocks.authorization = 'Bearer test-token';
    expect((await requireUser()).id).toBe('native-user');
    expect(mocks.nativeUser).toHaveBeenCalledWith('test-token');
    expect(mocks.cookieClient).not.toHaveBeenCalled();
  });
  it('rejects a revoked native token even when a cookie user exists', async () => {
    mocks.authorization = 'Bearer expired';
    mocks.nativeUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    await expect(requireUser()).rejects.toThrow('Please sign in');
    expect(mocks.cookieClient).not.toHaveBeenCalled();
  });
  it('rejects malformed credentials before constructing either client', async () => {
    mocks.authorization = 'Basic example';
    await expect(requireUser()).rejects.toThrow('Please sign in');
    expect(mocks.cookieClient).not.toHaveBeenCalled();
    expect(mocks.nativeUser).not.toHaveBeenCalled();
  });
  it('preserves cookie auth for browser requests', async () => {
    expect((await requireUser()).id).toBe('cookie-user');
    expect(mocks.nativeUser).not.toHaveBeenCalled();
  });
  it('requires browser origin unless native auth is explicitly opted into', () => {
    const request = new Request('https://opensync.example/api/manage', {
      headers: { authorization: 'Bearer token' },
    });
    expect(() => checkOrigin(request)).toThrow('Invalid request origin');
    expect(() => checkOrigin(request, true)).not.toThrow();
    expect(() => checkOrigin(new Request(request.url), true)).toThrow('Invalid request origin');
  });
});
