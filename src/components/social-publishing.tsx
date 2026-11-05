'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';

type Account = {
  id: string;
  name: string;
  instagramId: string | null;
  instagramName: string | null;
  instagramType: string | null;
};
type Publication = {
  id: string;
  accountName: string;
  platform: string;
  format: string;
  status: string;
  remoteId: string | null;
  error: string | null;
  createdAt: string;
};
type Status = {
  configured: boolean;
  canPublish: boolean;
  accounts: Account[];
  publications: Publication[];
};
type Snapshot = {
  id: string;
  requestId: string;
  accountId: string;
  platform: string;
  format: string;
  caption: string;
  image: string;
  accountName: string;
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
export function SocialPublishing({
  locationId,
  platform,
  format,
  caption,
  getImage,
  saveDraft,
  demo,
  readonly,
}: {
  locationId: string;
  platform: 'Instagram' | 'Facebook';
  format: 'post' | 'story';
  caption: string;
  getImage: () => string;
  saveDraft: () => void;
  demo: boolean;
  readonly: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<Snapshot | null>(null);
  const [active, setActive] = useState<Publication | null>(null);
  const polls = useRef(0);
  const inFlight = useRef(false);
  const accounts = (status?.accounts || []).filter(
    (account) =>
      platform === 'Facebook' ||
      (account.instagramId && (format !== 'story' || account.instagramType !== 'MEDIA_CREATOR')),
  );
  const account = accounts.find((item) => item.id === accountId);
  const disabled = demo || readonly || !status?.canPublish;

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    api(`/api/social/accounts?id=${locationId}`)
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId, demo]);

  async function refresh() {
    try {
      const data: Status = await api(`/api/social/accounts?id=${locationId}`);
      setStatus(data);
      setActive((current) =>
        current ? data.publications.find((item) => item.id === current.id) || current : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load accounts.');
    }
  }
  function record(publication: Publication) {
    setActive(publication);
    setStatus((current) =>
      current
        ? {
            ...current,
            publications: [
              publication,
              ...current.publications.filter((p) => p.id !== publication.id),
            ].slice(0, 20),
          }
        : current,
    );
  }
  async function advance(publicationId: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      record(
        (await api('/api/social/publish', { op: 'continue', id: locationId, publicationId }))
          .publication,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not confirm publication. Refresh status before trying again.',
      );
      await refresh();
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  useEffect(() => {
    if (!active || active.status !== 'ready' || polls.current >= 5 || error) return;
    const timer = setTimeout(() => {
      polls.current++;
      void advance(active.id);
    }, 60000);
    return () => clearTimeout(timer);
    // A pending request stays tied to its captured publication, not edited composer content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, error]);

  async function publish() {
    if (!review || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    polls.current = 0;
    let next: Publication | null = null;
    try {
      next = (await api('/api/social/publish', review)).publication;
      record(next!);
      setReview(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not confirm publication. Refresh status before trying again.',
      );
      await refresh(); // Keep the same snapshot/key for a retry after a lost response.
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
    if (next?.status === 'ready') await advance(next.id);
  }
  return (
    <section className="social-direct">
      <div className="section-heading">
        <h3>Publish to your account</h3>
        <span className="pill">Direct publishing</span>
      </div>
      {demo ? (
        <p className="notice subtle">
          Connect and publish from your real account. Demo images are never posted to social media.
        </p>
      ) : (
        <>
          <p className="muted">
            Connect a Facebook Page and its linked Instagram professional account. Instagram stories
            require a Business account. Personal profiles are not supported.
          </p>
          {!status && !error && <p role="status">Loading connected accounts…</p>}
          {status && !status.configured && (
            <p className="notice">
              Direct publishing needs Meta setup on this deployment. Image downloads remain
              available.
            </p>
          )}
          <div className="social-actions">
            <Button
              variant="outline"
              disabled={busy || disabled || !status?.configured}
              onClick={async () => {
                setBusy(true);
                setError('');
                saveDraft();
                try {
                  const data = await api('/api/social/connect', { id: locationId });
                  window.location.assign(data.url);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not connect.');
                  setBusy(false);
                }
              }}
            >
              Connect / reconnect Meta
            </Button>
            <Button variant="ghost" disabled={busy} onClick={refresh}>
              Refresh accounts &amp; status
            </Button>
          </div>
          {!!status?.accounts.length && (
            <>
              <label>
                Publish destination
                <select
                  value={account ? accountId : ''}
                  disabled={busy || !!review || disabled}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">Select an account…</option>
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {platform === 'Instagram' ? `@${item.instagramName || item.name}` : item.name}
                    </option>
                  ))}
                </select>
              </label>
              {!accounts.length && (
                <p className="notice">
                  No connected account supports this format. Reconnect with an eligible account or
                  choose another format.
                </p>
              )}
              <Button
                disabled={
                  busy ||
                  disabled ||
                  !account ||
                  !!review ||
                  ['ready', 'preparing', 'checking', 'publishing'].includes(active?.status || '')
                }
                onClick={() => {
                  if (!account) return;
                  try {
                    setReview({
                      id: locationId,
                      requestId: crypto.randomUUID(),
                      accountId: account.id,
                      platform,
                      format,
                      caption: format === 'story' ? '' : caption,
                      image: getImage(),
                      accountName:
                        platform === 'Instagram'
                          ? account.instagramName || account.name
                          : account.name,
                    });
                    setError('');
                  } catch {
                    setError('Could not prepare the image. Please try again.');
                  }
                }}
              >
                Review &amp; publish
              </Button>
              {account && (
                <Button
                  variant="ghost"
                  disabled={busy || disabled}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Disconnect ${account.name} from this location? Existing posts will stay online.`,
                      )
                    )
                      return;
                    try {
                      await api(
                        '/api/social/accounts',
                        { id: locationId, accountId: account.id },
                        'DELETE',
                      );
                      setAccountId('');
                      await refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Could not disconnect.');
                    }
                  }}
                >
                  Disconnect selected account
                </Button>
              )}
            </>
          )}
          {review && (
            <div
              role="region"
              aria-label="Confirm social publication"
              className="notice social-review"
            >
              <h4>
                Publish {review.format} to {review.accountName} on {review.platform}?
              </h4>
              <Image
                unoptimized
                src={review.image}
                width={180}
                height={review.format === 'story' ? 320 : 180}
                alt="Exact image to publish"
              />
              {review.format === 'post' ? (
                <p className="social-caption">{review.caption}</p>
              ) : (
                <p>The announcement is on the image. Stories do not include a separate caption.</p>
              )}
              <p>
                This publishes now to the selected account. It does not update your website or other
                social accounts.
              </p>
              {status?.publications.some((p) => p.status === 'unknown') && (
                <p>
                  There is an earlier unconfirmed publication. Check the account for duplicates
                  before continuing.
                </p>
              )}
              <div className="social-actions">
                <Button disabled={busy} onClick={publish}>
                  {busy ? 'Publishing…' : 'Publish now'}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setReview(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {active?.status === 'ready' && (
            <p role="status">
              Meta is preparing your image. We check once a minute for up to five minutes while this
              screen stays open. You can also continue from the history below.
            </p>
          )}
          {!!status?.publications.length && (
            <div className="social-history">
              <h4>Recent publications</h4>
              {status.publications.map((item) => (
                <div key={item.id} className="notice subtle">
                  <strong>
                    {item.platform} {item.format} · {item.accountName}
                  </strong>
                  <p>
                    {item.status === 'published'
                      ? 'Published'
                      : item.status === 'ready'
                        ? 'Waiting for Meta / ready to continue'
                        : item.status === 'unknown'
                          ? 'Outcome unconfirmed — check your account'
                          : item.status}
                  </p>
                  {item.remoteId && <small>Provider ID: {item.remoteId}</small>}
                  {item.error && <p>{item.error}</p>}
                  {item.status === 'ready' && (
                    <Button
                      variant="outline"
                      disabled={busy || disabled}
                      onClick={() => advance(item.id)}
                    >
                      Continue publishing
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {readonly && <p className="muted">Ask an owner or editor to connect accounts and publish.</p>}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </section>
  );
}
