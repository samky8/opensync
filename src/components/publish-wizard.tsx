'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2, AlertCircle, Instagram, Facebook, Globe } from 'lucide-react';
import { Button } from './ui/button';
import type { Schedule } from '@/lib/domain';
import { publishChanges, scopeLabels, type PublishScope } from '@/lib/publish-scope';

const channels = [
  { id: 'instagram-post', platform: 'Instagram', format: 'post' },
  { id: 'instagram-story', platform: 'Instagram', format: 'story' },
  { id: 'facebook-post', platform: 'Facebook', format: 'post' },
  { id: 'facebook-story', platform: 'Facebook', format: 'story' },
] as const;
type Channel = (typeof channels)[number];
type Account = {
  id: string;
  name: string;
  instagramId: string | null;
  instagramName: string | null;
  instagramType: string | null;
};
type Design = {
  title: string;
  message: string;
  colour: string;
  caption: string;
  accountId: string;
};
type Outcome = { label: string; state: 'waiting' | 'working' | 'done' | 'error'; detail: string };
async function api(path: string, body?: unknown) {
  const response = await fetch(
    path,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { cache: 'no-store' },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not complete this update.');
  return data;
}

function drawArtwork(canvas: HTMLCanvasElement, design: Design, channel: Channel, name: string) {
  canvas.width = 1080;
  canvas.height = channel.format === 'story' ? 1920 : 1080;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = design.colour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  const write = (text: string, y: number, size: number, maxHeight: number, serif = false) => {
    let lines: string[] = [];
    do {
      ctx.font = `${serif ? '600' : '400'} ${size}px ${serif ? 'Georgia' : 'Arial'}`;
      lines = [];
      for (const paragraph of text.split('\n')) {
        let line = '';
        for (const char of paragraph) {
          if (ctx.measureText(line + char).width > 864) {
            lines.push(line);
            line = '';
          }
          line += char;
        }
        lines.push(line);
      }
      if (lines.length * size * 1.4 <= maxHeight) break;
      size -= 2;
    } while (size > 12);
    lines.forEach((line, i) => ctx.fillText(line, 108, y + i * size * 1.4));
  };
  write(name, 100, 30, 90);
  write(design.title, 240, 76, 240, true);
  write(design.message, 520, 38, canvas.height - 670);
  write('Plan your next visit.', canvas.height - 100, 24, 60);
}

function Artwork({ design, channel, name }: { design: Design; channel: Channel; name: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawArtwork(ref.current, design, channel, name);
  }, [design, channel, name]);
  return (
    <canvas
      ref={ref}
      className="wizard-artwork"
      aria-label={`${channel.platform} ${channel.format} preview: ${design.title}`}
    />
  );
}

export function PublishWizard({
  draft,
  published,
  scope,
  locationId,
  demo,
  readonly,
  google,
  onPublish,
  onClose,
  onBusy,
  error,
  onResetWidget,
}: {
  draft: Schedule;
  published?: Schedule | null;
  scope: PublishScope;
  locationId: string;
  demo: boolean;
  readonly: boolean;
  google: boolean;
  onPublish: (google: boolean) => Promise<void>;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  error?: string;
  onResetWidget?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [website, setWebsite] = useState(true);
  const [includeGoogle, setIncludeGoogle] = useState(google);
  const [selected, setSelected] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [loading, setLoading] = useState(!demo);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [running, setRunning] = useState(false);
  const inFlight = useRef(false);
  const section = useRef<HTMLElement>(null);
  const showingOutcomes = outcomes !== null;
  useEffect(() => {
    section.current?.closest('dialog')?.scrollTo({ top: 0 });
    section.current?.querySelector<HTMLElement>('.wizard-page h3')?.focus({ preventScroll: true });
  }, [step, showingOutcomes]);
  const changes = publishChanges(draft, published, scope);
  const [designs, setDesigns] = useState<Record<string, Design>>(() =>
    Object.fromEntries(
      channels.map((channel) => [
        channel.id,
        {
          title: scope === 'hours' ? 'Our updated hours' : `An update from ${draft.name}`,
          message:
            changes
              .map((row) => `${row.label}: ${row.after || 'Removed'}`)
              .join('\n')
              .slice(0, 1500) || `Our ${scopeLabels[scope]} are up to date.`,
          colour: '#234d43',
          caption: '',
          accountId: '',
        },
      ]),
    ),
  );
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    api(`/api/social/accounts?id=${locationId}`)
      .then((data) => {
        if (!cancelled) {
          setAccounts(data.accounts);
          setCanPublish(data.canPublish);
        }
      })
      .catch((error) => {
        if (!cancelled) setAccountError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demo, locationId]);
  const eligible = (channel: Channel) =>
    accounts.filter(
      (account) =>
        channel.platform === 'Facebook' ||
        (account.instagramId &&
          (channel.format !== 'story' || account.instagramType !== 'MEDIA_CREATOR')),
    );
  const chosen = channels.filter((channel) => selected.includes(channel.id));
  const current = chosen[step - 2];
  const lastStep = 2 + chosen.length;
  const update = (id: string, patch: Partial<Design>) =>
    setDesigns((value) => ({ ...value, [id]: { ...value[id], ...patch } }));
  async function publish() {
    if (inFlight.current || readonly) return;
    inFlight.current = true;
    setRunning(true);
    onBusy(true);
    const tasks: Outcome[] = [
      ...(website ? [{ label: 'Website widgets', state: 'waiting' as const, detail: '' }] : []),
      ...(website && includeGoogle
        ? [{ label: 'Google Business Profile', state: 'waiting' as const, detail: '' }]
        : []),
      ...chosen.map((channel) => ({
        label: `${channel.platform} ${channel.format}`,
        state: 'waiting' as const,
        detail: '',
      })),
    ];
    setOutcomes(tasks);
    const mark = (index: number, state: Outcome['state'], detail: string) =>
      setOutcomes((value) =>
        value!.map((item, i) => (i === index ? { ...item, state, detail } : item)),
      );
    let offset = 0;
    try {
      if (website) {
        mark(0, 'working', 'Applying update…');
        if (includeGoogle) mark(1, 'working', 'Queueing update…');
        try {
          await onPublish(includeGoogle);
          mark(0, 'done', demo ? 'Demo preview updated' : 'Published');
          if (includeGoogle) mark(1, 'done', 'Queued · follow progress in History');
        } catch (error) {
          mark(0, 'error', (error as Error).message);
          if (includeGoogle) mark(1, 'error', 'Not queued. Check History before retrying.');
          chosen.forEach((_, i) =>
            mark(
              i + (includeGoogle ? 2 : 1),
              'error',
              'Not sent because the website update could not be confirmed.',
            ),
          );
          return;
        }
        offset = includeGoogle ? 2 : 1;
      }
      for (const [i, channel] of chosen.entries()) {
        const index = offset + i;
        mark(index, 'working', 'Publishing…');
        try {
          if (demo) {
            await new Promise((resolve) => setTimeout(resolve, 450));
            mark(index, 'done', 'Demo preview ready · nothing posted');
            continue;
          }
          const design = designs[channel.id];
          const canvas = document.createElement('canvas');
          drawArtwork(canvas, design, channel, draft.name);
          let publication = (
            await api('/api/social/publish', {
              id: locationId,
              requestId: crypto.randomUUID(),
              accountId: design.accountId,
              platform: channel.platform,
              format: channel.format,
              caption: channel.format === 'story' ? '' : design.caption,
              image: canvas.toDataURL('image/png'),
            })
          ).publication;
          for (
            let poll = 0;
            poll < 5 &&
            ['ready', 'preparing', 'checking', 'publishing'].includes(publication.status);
            poll++
          ) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            publication = (
              await api('/api/social/publish', {
                op: 'continue',
                id: locationId,
                publicationId: publication.id,
              })
            ).publication;
          }
          if (publication.status !== 'published')
            throw new Error(
              publication.error || 'Not confirmed yet. Check History before publishing again.',
            );
          mark(index, 'done', 'Published');
        } catch (error) {
          mark(index, 'error', (error as Error).message);
        }
      }
    } finally {
      setRunning(false);
      onBusy(false);
      inFlight.current = false;
    }
  }
  return (
    <section ref={section} className="publish-wizard" aria-label={`Publish ${scopeLabels[scope]}`}>
      <span className="wizard-eyebrow">{draft.name}</span>
      <h2>Publish {scopeLabels[scope]}</h2>
      {error && !outcomes && (
        <div role="alert" className="form-error publish-error">
          {error}
          {onResetWidget && (
            <Button variant="outline" onClick={onResetWidget}>
              Reset to Free defaults
            </Button>
          )}
        </div>
      )}
      {!outcomes && (
        <>
          <p className="muted">Only {scopeLabels[scope]} will be published.</p>
          <ol className="wizard-steps" aria-label="Publishing steps">
            {[
              'Review changes',
              'Destinations',
              ...chosen.map((channel) => `${channel.platform} ${channel.format}`),
              'Publish',
            ].map((label, i) => (
              <li
                key={label}
                aria-current={step === i ? 'step' : undefined}
                className={step === i ? 'active' : step > i ? 'complete' : ''}
              >
                <span>{step > i ? <Check size={12} /> : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          {step === 0 && (
            <div className="wizard-page">
              <h3 tabIndex={-1}>Review changes</h3>
              <p className="muted">Compare the published version with your update.</p>
              {changes.length ? (
                <div className="wizard-diff">
                  <div className="wizard-diff-header">
                    <span>Change</span>
                    <span>Previous</span>
                    <span>New</span>
                  </div>
                  {changes.map((row, i) => (
                    <div className="wizard-diff-row" key={i}>
                      <strong>{row.label}</strong>
                      <del>{row.before || 'Not set'}</del>
                      <ins>{row.after || 'Removed'}</ins>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notice subtle">No unpublished changes on this page.</p>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="wizard-page">
              <h3 tabIndex={-1}>Where this update will go</h3>
              <div className="publish-channel-list">
                <label className="publish-channel">
                  <input
                    type="checkbox"
                    checked={website}
                    onChange={(e) => {
                      setWebsite(e.target.checked);
                      if (!e.target.checked) setIncludeGoogle(false);
                    }}
                  />
                  <Globe size={22} />
                  <span>
                    <strong>Website widgets</strong>
                    <small>
                      {scope === 'announcements'
                        ? 'Announcement banner'
                        : 'Your published website update'}
                    </small>
                  </span>
                </label>
                {['hours', 'special', 'all'].includes(scope) && (
                  <label className="publish-channel">
                    <input
                      type="checkbox"
                      checked={includeGoogle}
                      disabled={!google || !website}
                      onChange={(e) => setIncludeGoogle(e.target.checked)}
                    />
                    <Globe size={22} />
                    <span>
                      <strong>Google Business Profile</strong>
                      <small>
                        {google
                          ? 'Queue hours with your website update'
                          : 'Requires an eligible connected profile'}
                      </small>
                    </span>
                  </label>
                )}
                {channels.map((channel) => (
                  <label className="publish-channel" key={channel.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(channel.id)}
                      disabled={!demo && (!canPublish || !eligible(channel).length)}
                      onChange={(e) =>
                        setSelected((value) =>
                          e.target.checked
                            ? [...value, channel.id]
                            : value.filter((id) => id !== channel.id),
                        )
                      }
                    />
                    {channel.platform === 'Instagram' ? (
                      <Instagram size={22} />
                    ) : (
                      <Facebook size={22} />
                    )}
                    <span>
                      <strong>
                        {channel.platform} {channel.format}
                      </strong>
                      <small>
                        {demo
                          ? 'Preview in demo'
                          : loading
                            ? 'Loading accounts…'
                            : canPublish && eligible(channel).length
                              ? 'Review artwork and account next'
                              : 'Connect an eligible account in Social posts'}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              {accountError && <p role="alert">{accountError}</p>}
            </div>
          )}
          {current && (
            <div className="wizard-page">
              <h3 tabIndex={-1}>
                Review {current.platform} {current.format}
              </h3>
              <div className="wizard-customizer">
                <Artwork design={designs[current.id]} channel={current} name={draft.name} />
                <div className="wizard-controls">
                  {!demo && (
                    <label>
                      Publish to
                      <select
                        value={designs[current.id].accountId}
                        onChange={(e) => update(current.id, { accountId: e.target.value })}
                      >
                        <option value="">Select account</option>
                        {eligible(current).map((account) => (
                          <option key={account.id} value={account.id}>
                            {current.platform === 'Instagram'
                              ? account.instagramName || account.name
                              : account.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Headline
                    <input
                      maxLength={100}
                      value={designs[current.id].title}
                      onChange={(e) => update(current.id, { title: e.target.value })}
                    />
                  </label>
                  <label>
                    Message
                    <textarea
                      rows={4}
                      maxLength={1500}
                      value={designs[current.id].message}
                      onChange={(e) => update(current.id, { message: e.target.value })}
                    />
                  </label>
                  <label>
                    Background colour
                    <input
                      type="color"
                      value={designs[current.id].colour}
                      onChange={(e) => update(current.id, { colour: e.target.value })}
                    />
                  </label>
                  {current.format === 'post' && (
                    <label>
                      Caption
                      <textarea
                        rows={2}
                        maxLength={2200}
                        value={designs[current.id].caption}
                        onChange={(e) => update(current.id, { caption: e.target.value })}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
          {step === lastStep && (
            <div className="wizard-page">
              <h3 tabIndex={-1}>Ready to publish</h3>
              <p>Your {scopeLabels[scope]} update will go to:</p>
              <ul className="wizard-review-list">
                {website && <li>Website widgets</li>}
                {website && includeGoogle && <li>Google Business Profile · queued</li>}
                {chosen.map((channel) => (
                  <li key={channel.id}>
                    {channel.platform} {channel.format}
                    {!demo &&
                      ` · ${accounts.find((account) => account.id === designs[channel.id].accountId)?.name}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {demo && (
            <p className="wizard-demo">
              Demo mode · updates stay in this browser. Nothing is posted externally.
            </p>
          )}
          <div className="modal-actions">
            <Button variant="outline" onClick={step ? () => setStep(step - 1) : onClose}>
              {step ? 'Back' : 'Keep editing'}
            </Button>
            {step === lastStep ? (
              <Button disabled={readonly} onClick={publish}>
                Publish <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                disabled={
                  readonly ||
                  (step === 1 && !website && !chosen.length) ||
                  (!!current && !demo && !designs[current.id].accountId)
                }
                onClick={() => setStep(step + 1)}
              >
                Next <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </>
      )}
      {outcomes && (
        <div className="wizard-page" aria-live="polite">
          <h3 tabIndex={-1}>
            {running
              ? 'Publishing your update…'
              : outcomes.some((item) => item.state === 'error')
                ? 'Some updates need attention'
                : demo
                  ? 'Demo update complete'
                  : 'Update complete'}
          </h3>
          <div className="wizard-outcomes">
            {outcomes.map((item) => (
              <div className={`wizard-outcome ${item.state}`} key={item.label}>
                {item.state === 'working' ? (
                  <Loader2 className="wizard-spinner" />
                ) : item.state === 'done' ? (
                  <Check className="wizard-check" />
                ) : item.state === 'error' ? (
                  <AlertCircle />
                ) : (
                  <span className="wizard-waiting" />
                )}
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail || 'Waiting'}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <Button disabled={running} onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
