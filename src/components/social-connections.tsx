'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Facebook, Instagram, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

type Account = {
  id: string;
  name: string;
  instagramId: string | null;
  instagramName: string | null;
  instagramType: string | null;
};

type Status = {
  configured: boolean;
  canPublish: boolean;
  accounts: Account[];
};

async function api(path: string, body?: unknown, method = 'POST') {
  const response = await fetch(
    path,
    body
      ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : { cache: 'no-store' },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request could not complete.');
  return data;
}

export function SocialConnections({
  locationId,
  demo,
  readonly,
}: {
  locationId: string;
  demo: boolean;
  readonly: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    if (demo) return;
    setBusy(true);
    setError('');
    try {
      setStatus(await api(`/api/social/accounts?id=${locationId}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load Meta accounts.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    // Refresh when the selected business changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, demo]);

  async function connect() {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/social/connect', { id: locationId });
      window.location.assign(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect Meta.');
      setBusy(false);
    }
  }

  async function disconnect(account: Account) {
    if (
      !window.confirm(
        `Disconnect ${account.name} from this location? Existing posts will stay online.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api('/api/social/accounts', { id: locationId, accountId: account.id }, 'DELETE');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not disconnect this account.');
      setBusy(false);
    }
  }

  const accounts = status?.accounts || [];
  const instagramAccounts = accounts.filter((account) => account.instagramId);
  const connectDisabled = busy || readonly || demo || !status?.configured;

  return (
    <>
      <section className="card padded social-card connection-card">
        <div className="section-heading">
          <Facebook size={28} />
          <span className="pill">
            {demo
              ? 'Demo only'
              : !status
                ? 'Checking'
                : accounts.length
                  ? 'Connected'
                  : 'Not connected'}
          </span>
        </div>
        <h2>Facebook</h2>
        <p className="muted">Publish feed images to connected Facebook Pages.</p>
        <div className="notice subtle">
          {demo
            ? 'Connect a real workspace to manage Facebook Pages.'
            : !status
              ? 'Checking Meta connection status…'
              : !status.configured
                ? 'Meta publishing is not configured on this deployment.'
                : accounts.length && !status.canPublish
                  ? 'Connected accounts need attention. Reconnect Meta to restore publishing permissions.'
                  : accounts.length
                    ? accounts.map((account) => account.name).join(', ')
                    : 'No Facebook Page is connected to this business.'}
        </div>
        <div className="connection-actions">
          <Button variant="outline" disabled={connectDisabled} onClick={connect}>
            {accounts.length ? 'Reconnect Meta' : 'Connect Meta'} <ArrowUpRight size={16} />
          </Button>
          <Button variant="ghost" disabled={busy || demo} onClick={refresh}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
        {accounts.map((account) => (
          <Button
            key={account.id}
            variant="ghost"
            disabled={busy || readonly || demo}
            onClick={() => disconnect(account)}
          >
            Disconnect {account.name}
          </Button>
        ))}
      </section>
      <section className="card padded social-card connection-card">
        <div className="section-heading">
          <Instagram size={28} />
          <span className="pill">
            {demo
              ? 'Demo only'
              : !status
                ? 'Checking'
                : instagramAccounts.length
                  ? 'Connected'
                  : 'Not connected'}
          </span>
        </div>
        <h2>Instagram</h2>
        <p className="muted">
          Publish posts and eligible stories through a linked professional account.
        </p>
        <div className="notice subtle">
          {demo
            ? 'Connect a real workspace to manage Instagram accounts.'
            : !status
              ? 'Checking Meta connection status…'
              : instagramAccounts.length && !status.canPublish
                ? 'The linked Instagram account needs attention. Reconnect Meta to restore publishing permissions.'
                : instagramAccounts.length
                  ? instagramAccounts
                      .map(
                        (account) =>
                          `@${account.instagramName || account.name}${account.instagramType ? ` · ${account.instagramType}` : ''}`,
                      )
                      .join(', ')
                  : 'No eligible linked Instagram professional account was found.'}
        </div>
        <p className="muted">
          Instagram access is managed through the connected Facebook Page. Personal profiles are not
          supported.
        </p>
      </section>
      {error && (
        <p className="notice connection-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
