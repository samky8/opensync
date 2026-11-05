import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  metaAuthorizationUrl,
  metaConfigured,
  metaRedirect,
  metaSetupIssues,
} from '../src/lib/meta-config';

beforeEach(() => {
  vi.stubEnv('META_APP_ID', '123');
  vi.stubEnv('META_APP_SECRET', 'private-secret');
  vi.stubEnv('TOKEN_ENCRYPTION_KEY', 'a'.repeat(64));
  vi.stubEnv('META_GRAPH_VERSION', 'v25.0');
  vi.stubEnv('META_LOGIN_CONFIG_ID', '');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://opensync.example/');
});
afterEach(() => vi.unstubAllEnvs());

it('normalizes the callback and retains state and permissions for classic login', () => {
  expect(metaConfigured()).toBe(true);
  expect(metaRedirect()).toBe('https://opensync.example/api/social/callback');
  const url = new URL(metaAuthorizationUrl('csrf-state'));
  expect(url.searchParams.get('state')).toBe('csrf-state');
  expect(url.searchParams.get('scope')).toContain('instagram_content_publish');
  expect(url.searchParams.has('config_id')).toBe(false);
  expect(url.toString()).not.toContain('private-secret');
});
it('uses the saved business configuration instead of URL scopes', () => {
  vi.stubEnv('META_LOGIN_CONFIG_ID', '456');
  const params = new URL(metaAuthorizationUrl('csrf-state')).searchParams;
  expect(params.get('config_id')).toBe('456');
  expect(params.has('scope')).toBe(false);
  expect(params.get('response_type')).toBe('code');
  expect(params.get('override_default_response_type')).toBe('true');
  expect(params.get('state')).toBe('csrf-state');
});
it.each([
  'http://example.com',
  'https://localhost',
  'https://example.com/path',
  'https://example.com?x=1',
  'https://name:password@example.com',
  'https://',
])('rejects invalid public origin %s', (url) => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', url);
  expect(metaConfigured()).toBe(false);
});
it('reports missing configuration without disclosing values', () => {
  vi.stubEnv('META_APP_ID', 'invalid-id');
  vi.stubEnv('META_LOGIN_CONFIG_ID', 'invalid-config');
  vi.stubEnv('TOKEN_ENCRYPTION_KEY', 'invalid-key');
  expect(metaSetupIssues()).toHaveLength(3);
  expect(metaSetupIssues().join()).not.toMatch(
    /invalid-id|invalid-config|invalid-key|private-secret/,
  );
});
