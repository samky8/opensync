import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rows: [] as unknown[][],
  retrieve: vi.fn(),
  cancel: vi.fn(),
  disconnect: vi.fn(),
  deleteUser: vi.fn(),
  update: vi.fn(),
}));
vi.mock('../src/db', () => ({
  db: () => ({
    execute: async () => [{ allowed: true }],
    select: () => ({ from: () => ({ where: async () => mocks.rows.shift() ?? [] }) }),
    update: () => ({ set: () => ({ where: mocks.update }) }),
  }),
}));
vi.mock('../src/lib/supabase', () => ({ requireUser: async () => ({ id: 'account-owner' }) }));
vi.mock('../src/lib/google', () => ({ googleDisconnect: mocks.disconnect }));
vi.mock('../src/lib/stripe', () => ({
  stripe: () => ({ subscriptions: { retrieve: mocks.retrieve, cancel: mocks.cancel } }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { admin: { deleteUser: mocks.deleteUser } } }),
}));
import { POST } from '../src/app/api/manage/route';
const remove = (cancelSubscriptions: boolean) =>
  POST(
    new Request('https://opensync.example/api/manage', {
      method: 'POST',
      headers: { origin: 'https://opensync.example', 'content-type': 'application/json' },
      body: JSON.stringify({ op: 'delete', confirmation: 'DELETE', cancelSubscriptions }),
    }),
  );
beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'https://opensync.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  delete process.env.SUPABASE_SECRET_KEY;
  mocks.rows = [
    [{ organizationId: 'owned-org' }],
    [{ subscriptionId: 'sub_owned', status: 'active' }],
    [{ id: 'location-owned' }],
  ];
  mocks.retrieve.mockResolvedValue({ status: 'active' });
  mocks.cancel.mockResolvedValue({ status: 'canceled' });
  mocks.deleteUser.mockResolvedValue({ error: null });
});
describe('explicit cancel-and-delete for native accounts', () => {
  it('supports account deletion with only the new secret key', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    expect((await remove(true)).status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenCalledWith('account-owner');
  });
  it('preserves the existing web requirement without explicit cancellation consent', async () => {
    expect((await remove(false)).status).toBe(400);
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it('cancels only the owned subscription, revokes connections, then deletes the user', async () => {
    expect((await remove(true)).status).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledWith('sub_owned');
    expect(mocks.disconnect).toHaveBeenCalledWith('location-owned');
    expect(mocks.deleteUser).toHaveBeenCalledWith('account-owner');
    expect(mocks.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteUser.mock.invocationCallOrder[0],
    );
  });
  it('checks deletion configuration before causing billing side effects', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await remove(true)).status).toBe(400);
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });
  it('does not delete the account if cancellation fails', async () => {
    mocks.cancel.mockRejectedValueOnce(new Error('Stripe temporarily unavailable'));
    expect((await remove(true)).status).toBe(400);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it('allows retry after Stripe cancellation succeeded but local cleanup failed', async () => {
    mocks.retrieve.mockResolvedValue({ status: 'canceled' });
    expect((await remove(true)).status).toBe(200);
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.deleteUser).toHaveBeenCalledWith('account-owner');
  });
});
