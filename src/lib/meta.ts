import 'server-only';
import { createHmac, createHash } from 'node:crypto';
import { metaConfigured, metaRedirect, metaVersion } from './meta-config';
export { metaConfigured, metaRedirect, metaVersion, metaScopes } from './meta-config';

export const stateHash = (state: string) => createHash('sha256').update(state).digest('hex');
export function assertMeta() {
  if (!metaConfigured())
    throw new Error(
      'Meta setup required: app credentials, HTTPS public URL, and token encryption key.',
    );
}
export class MetaError extends Error {
  constructor(
    public code: number,
    public ambiguous = false,
  ) {
    super(
      code === 190
        ? 'Meta authorization expired. Reconnect your account.'
        : code === 10 || code === 200
          ? 'Meta publishing permission denied. Reconnect and check app approval and Page access.'
          : `Meta request failed (code ${code}). Check your account and try again only after reviewing its posts.`,
    );
  }
}
export async function graph<T>(
  path: string,
  token: string,
  values: Record<string, string> = {},
  method: 'GET' | 'POST' = 'GET',
): Promise<T> {
  if (!/^[\w/]+$/.test(path)) throw new Error('Invalid Meta path');
  const params = new URLSearchParams(values);
  if (token)
    params.set(
      'appsecret_proof',
      createHmac('sha256', process.env.META_APP_SECRET!).update(token).digest('hex'),
    );
  const url = `https://graph.facebook.com/${metaVersion()}/${path}`;
  let response: Response;
  try {
    response = await fetch(method === 'GET' ? `${url}?${params}` : url, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: method === 'POST' ? params : undefined,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new MetaError(0, true);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new MetaError(response.status, true);
  }
  if (!response.ok || data.error)
    throw new MetaError(
      data.error?.code || response.status,
      response.status >= 500 || [1, 2].includes(data.error?.code),
    );
  return data as T;
}

export async function exchangeMeta(code: string) {
  const credentials = {
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
  };
  const short = await graph<{ access_token: string }>(
    'oauth/access_token',
    '',
    { ...credentials, redirect_uri: metaRedirect(), code },
    'GET',
  );
  return graph<{ access_token: string }>(
    'oauth/access_token',
    '',
    { ...credentials, grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token },
    'GET',
  );
}
type Page = {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
  instagram_business_account?: { id: string; username?: string; account_type?: string };
};
export async function metaPages(token: string) {
  const pages: Page[] = [];
  let after = '';
  for (let i = 0; i < 20; i++) {
    const result = await graph<{
      data: Page[];
      paging?: { next?: string; cursors?: { after?: string } };
    }>('me/accounts', token, {
      fields: 'id,name,access_token,tasks,instagram_business_account{id}',
      limit: '100',
      ...(after ? { after } : {}),
    });
    pages.push(
      ...result.data.filter(
        (page) =>
          page.access_token &&
          page.tasks?.some((task) => ['CREATE_CONTENT', 'MANAGE'].includes(task)),
      ),
    );
    if (!result.paging?.next) return pages;
    after = result.paging.cursors?.after || '';
    if (!after) throw new Error('Meta Page pagination failed. Reconnect your account.');
  }
  throw new Error('Meta Page limit reached. Authorize fewer Pages and reconnect.');
}
