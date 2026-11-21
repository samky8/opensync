'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  Instagram,
  Facebook,
  Globe,
  Upload,
} from 'lucide-react';
import { Button } from './ui/button';
import { ProBadge } from './ui/pro-badge';
import { plainRichText } from './rich-text';
import { SavedBackgroundOptions, useSavedBackgrounds } from './saved-backgrounds';
import type { Schedule } from '@/lib/domain';
import { publishChanges, scopeLabels, type PublishScope } from '@/lib/publish-scope';
import {
  readSocialPresets,
  socialBackgrounds,
  type SocialPreset,
  type SocialStyle,
} from '@/lib/social-presets';

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
type Design = SocialStyle & {
  title: string;
  message: string;
  caption: string;
  accountId: string;
};
type Outcome = { label: string; state: 'waiting' | 'working' | 'done' | 'error'; detail: string };

export function socialPublishCopy(
  draft: Schedule,
  published: Schedule | null | undefined,
  scope: PublishScope,
  changes: ReturnType<typeof publishChanges>,
) {
  if (scope === 'announcements') {
    const announcement =
      draft.announcements.find((item) => {
        const previous = published?.announcements.find((candidate) => candidate.id === item.id);
        return JSON.stringify(previous) !== JSON.stringify(item);
      }) || draft.announcements.at(-1);
    if (announcement)
      return {
        title: announcement.title.trim() || `An update from ${draft.name}`,
        message: plainRichText(announcement.message),
      };
  }
  return {
    title: scope === 'hours' ? 'Our updated hours' : `An update from ${draft.name}`,
    message:
      changes
        .map((row) => `${row.label}: ${row.after || 'Removed'}`)
        .join('\n')
        .slice(0, 1500) || `Our ${scopeLabels[scope]} are up to date.`,
  };
}

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

function loadArtworkImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (/^https?:/i.test(source)) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function drawArtwork(
  canvas: HTMLCanvasElement,
  design: Design,
  channel: Channel,
  schedule: Schedule,
) {
  canvas.width = 1080;
  canvas.height = channel.format === 'story' ? 1920 : 1080;
  const ctx = canvas.getContext('2d')!;
  const rgb = design.accent
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16));
  const dark =
    design.theme === 'dark' ||
    (design.theme === 'accent' && rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 < 150);
  ctx.fillStyle = design.theme === 'accent' ? design.accent : dark ? '#182b27' : '#faf5eb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const backgroundSource =
    design.background === 'custom'
      ? design.customImage
      : socialBackgrounds.includes(design.background as (typeof socialBackgrounds)[number])
        ? `/social-backgrounds/${design.background}.svg`
        : '';
  if (backgroundSource) {
    const image = await loadArtworkImage(backgroundSource);
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    ctx.drawImage(
      image,
      (canvas.width - image.width * scale) / 2,
      (canvas.height - image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    );
    ctx.fillStyle = dark ? 'rgba(24,43,39,.65)' : 'rgba(250,245,235,.32)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = design.fontColour || (dark ? '#faf5eb' : '#152823');
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
  const header = [
    design.showBusinessName !== false ? schedule.name : '',
    design.showHeaderText ? design.headerText || '' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  let headerX = 108;
  if (design.showBusinessLogo && schedule.logo) {
    const logo = await loadArtworkImage(schedule.logo);
    const size = 64;
    const scale = Math.min(size / logo.width, size / logo.height);
    ctx.drawImage(logo, 108, 90, logo.width * scale, logo.height * scale);
    headerX += 88;
  }
  if (header) {
    const originalWrite = write;
    ctx.save();
    ctx.translate(headerX - 108, 0);
    originalWrite(header, 100, 30, 90);
    ctx.restore();
  }
  write(design.title, 240, 76, 240, true);
  write(design.message, 520, 38, canvas.height - 670);
  if (design.footer) write(design.footer, canvas.height - 100, 24, 60);
}

function Artwork({
  design,
  channel,
  schedule,
}: {
  design: Design;
  channel: Channel;
  schedule: Schedule;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void drawArtwork(ref.current, design, channel, schedule);
  }, [design, channel, schedule]);
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
  paid = false,
  google,
  onSaveDraft,
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
  paid?: boolean;
  google: boolean;
  onSaveDraft: () => Promise<void>;
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
  const [savingDraft, setSavingDraft] = useState(false);
  const [presets, setPresets] = useState<SocialPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [uploading, setUploading] = useState(false);
  const [designNotice, setDesignNotice] = useState('');
  const {
    images: savedBackgrounds,
    loading: loadingBackgrounds,
    save: saveBackground,
    remove: removeBackground,
  } = useSavedBackgrounds(locationId, demo);
  const inFlight = useRef(false);
  const section = useRef<HTMLElement>(null);
  const backgroundUpload = useRef<HTMLInputElement>(null);
  const showingOutcomes = outcomes !== null;
  useEffect(() => {
    section.current?.closest('dialog')?.scrollTo({ top: 0 });
    section.current?.querySelector<HTMLElement>('.wizard-page h3')?.focus({ preventScroll: true });
  }, [step, showingOutcomes]);
  const changes = publishChanges(draft, published, scope);
  const initialCopy = socialPublishCopy(draft, published, scope, changes);
  const [designs, setDesigns] = useState<Record<string, Design>>(() =>
    Object.fromEntries(
      channels.map((channel) => [
        channel.id,
        {
          ...initialCopy,
          headerText: '',
          showHeaderText: false,
          showBusinessName: true,
          showBusinessLogo: false,
          footer: draft.website || 'Plan your next visit.',
          theme: 'accent',
          accent: '#234d43',
          caption: '',
          accountId: '',
        },
      ]),
    ),
  );
  useEffect(() => setPresets(readSocialPresets(locationId)), [locationId]);
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
  async function uploadBackground(id: string, asset?: File) {
    if (!asset || !paid || uploading) return;
    if (savedBackgrounds.length >= 5) {
      setDesignNotice('Background limit reached. Delete one before uploading another.');
      return;
    }
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(asset.type) ||
      asset.size > 10 * 1024 * 1024
    ) {
      setDesignNotice('Choose a JPG, PNG or WebP image up to 10 MB.');
      return;
    }
    setUploading(true);
    const url = URL.createObjectURL(asset);
    try {
      const image = new window.Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
      const resized = document.createElement('canvas');
      resized.width = Math.max(1, Math.round(image.width * scale));
      resized.height = Math.max(1, Math.round(image.height * scale));
      const ctx = resized.getContext('2d');
      if (!ctx) throw new Error();
      ctx.fillStyle = '#faf5eb';
      ctx.fillRect(0, 0, resized.width, resized.height);
      ctx.drawImage(image, 0, 0, resized.width, resized.height);
      const data = resized.toDataURL('image/jpeg', 0.8);
      await saveBackground(data);
      update(id, {
        background: 'custom',
        customImage: data,
      });
      setDesignNotice('Custom background saved to this profile.');
    } catch (error) {
      setDesignNotice(
        error instanceof Error && error.message
          ? error.message
          : 'Could not read this image. Try another JPG, PNG or WebP.',
      );
    } finally {
      URL.revokeObjectURL(url);
      setUploading(false);
    }
  }
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
          await drawArtwork(canvas, design, channel, draft);
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
  async function saveDraft() {
    if (savingDraft || readonly) return;
    setSavingDraft(true);
    try {
      await onSaveDraft();
    } finally {
      setSavingDraft(false);
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
                <Artwork design={designs[current.id]} channel={current} schedule={draft} />
                <div className="wizard-controls">
                  {presets.length > 0 && (
                    <label className="wizard-preset-select">
                      Style preset
                      <select
                        value={selectedPreset}
                        onChange={(event) => {
                          const preset = presets.find((item) => item.id === event.target.value);
                          setSelectedPreset(event.target.value);
                          if (preset) update(current.id, preset.style);
                        }}
                      >
                        <option value="">Current custom style</option>
                        {presets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
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
                    <span className="field-label">
                      Title <span>(optional)</span>
                    </span>
                    <input
                      maxLength={100}
                      value={designs[current.id].title}
                      onChange={(e) => update(current.id, { title: e.target.value })}
                    />
                  </label>
                  <label>
                    <span className="field-label">
                      Message <span>(optional)</span>
                    </span>
                    <textarea
                      rows={4}
                      maxLength={1500}
                      value={designs[current.id].message}
                      onChange={(e) => update(current.id, { message: e.target.value })}
                    />
                  </label>
                  <fieldset className="wizard-social-toggles">
                    <legend>Header</legend>
                    <label>
                      <input
                        type="checkbox"
                        checked={designs[current.id].showBusinessName !== false}
                        onChange={(event) =>
                          update(current.id, { showBusinessName: event.target.checked })
                        }
                      />
                      Business name
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={designs[current.id].showHeaderText === true}
                        onChange={(event) =>
                          update(current.id, { showHeaderText: event.target.checked })
                        }
                      />
                      Extra header text
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={designs[current.id].showBusinessLogo === true}
                        disabled={!draft.logo}
                        onChange={(event) =>
                          update(current.id, { showBusinessLogo: event.target.checked })
                        }
                      />
                      Business logo
                    </label>
                  </fieldset>
                  {designs[current.id].showHeaderText && (
                    <label>
                      <span className="field-label">
                        Header text <span>(optional)</span>
                      </span>
                      <input
                        maxLength={98}
                        value={designs[current.id].headerText || ''}
                        onChange={(event) => update(current.id, { headerText: event.target.value })}
                      />
                    </label>
                  )}
                  <div className="wizard-style-row">
                    <label>
                      Base style
                      <select
                        value={designs[current.id].theme}
                        onChange={(event) =>
                          update(current.id, { theme: event.target.value as SocialStyle['theme'] })
                        }
                      >
                        <option value="cream">Cream</option>
                        <option value="dark">Dark</option>
                        <option value="accent">Brand colour</option>
                      </select>
                    </label>
                    <label>
                      Brand colour
                      <input
                        type="color"
                        value={designs[current.id].accent}
                        onChange={(event) => update(current.id, { accent: event.target.value })}
                      />
                    </label>
                    <label>
                      Font colour
                      <input
                        type="color"
                        value={designs[current.id].fontColour || '#ffffff'}
                        onChange={(event) => update(current.id, { fontColour: event.target.value })}
                      />
                    </label>
                  </div>
                  <fieldset className="social-background-picker wizard-background-picker">
                    <legend>Background image</legend>
                    <div className="social-background-options">
                      <button
                        type="button"
                        aria-pressed={!designs[current.id].background}
                        onClick={() => update(current.id, { background: undefined })}
                      >
                        <span
                          className="social-background-thumb"
                          style={{ background: '#faf5eb' }}
                        />
                        None
                      </button>
                      {socialBackgrounds.map((background) => (
                        <button
                          type="button"
                          key={background}
                          aria-pressed={designs[current.id].background === background}
                          onClick={() => update(current.id, { background })}
                        >
                          <span
                            className="social-background-thumb"
                            style={{
                              backgroundImage: `url(/social-backgrounds/${background}.svg)`,
                            }}
                          />
                          {background.charAt(0).toUpperCase() + background.slice(1)}
                        </button>
                      ))}
                      {designs[current.id].customImage &&
                        !savedBackgrounds.some(
                          (background) => background.image === designs[current.id].customImage,
                        ) && (
                          <button
                            type="button"
                            aria-pressed={designs[current.id].background === 'custom'}
                            onClick={() => update(current.id, { background: 'custom' })}
                          >
                            <span
                              className="social-background-thumb"
                              style={{
                                backgroundImage: `url(${designs[current.id].customImage})`,
                              }}
                            />
                            Your image
                          </button>
                        )}
                      <SavedBackgroundOptions
                        images={savedBackgrounds}
                        selected={
                          designs[current.id].background === 'custom'
                            ? designs[current.id].customImage
                            : undefined
                        }
                        disabled={readonly}
                        onSelect={(image) =>
                          update(current.id, { background: 'custom', customImage: image })
                        }
                        onDelete={async (image) => {
                          try {
                            await removeBackground(image.id);
                            setDesigns((currentDesigns) =>
                              Object.fromEntries(
                                Object.entries(currentDesigns).map(([key, design]) => [
                                  key,
                                  design.customImage === image.image
                                    ? {
                                        ...design,
                                        background: undefined,
                                        customImage: undefined,
                                      }
                                    : design,
                                ]),
                              ),
                            );
                            setDesignNotice('Saved background deleted.');
                          } catch (error) {
                            setDesignNotice(
                              error instanceof Error
                                ? error.message
                                : 'Could not delete this background.',
                            );
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="social-background-upload"
                        disabled={
                          !paid ||
                          readonly ||
                          uploading ||
                          loadingBackgrounds ||
                          savedBackgrounds.length >= 5
                        }
                        title={
                          savedBackgrounds.length >= 5
                            ? 'Delete a saved background to upload another'
                            : undefined
                        }
                        onClick={() => backgroundUpload.current?.click()}
                      >
                        <span className="social-background-thumb">
                          <Upload size={22} aria-hidden="true" />
                        </span>
                        <span className="social-background-upload-name">
                          <ProBadge /> Upload
                        </span>
                      </button>
                    </div>
                    <input
                      ref={backgroundUpload}
                      hidden
                      aria-label="Upload your own image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={!paid || readonly || uploading || savedBackgrounds.length >= 5}
                      onChange={(event) => {
                        void uploadBackground(current.id, event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                    <small className="muted">
                      {!paid ? 'Available with Pro or Business. ' : ''}JPG, PNG or WebP, up to 10
                      MB. Images are cropped to fit and saved to this profile.{' '}
                      {savedBackgrounds.length}/5 saved.
                    </small>
                    {designNotice && <p role="status">{designNotice}</p>}
                  </fieldset>
                  {current.format === 'post' && (
                    <label>
                      <span className="field-label">
                        Caption <span>(optional)</span>
                      </span>
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
              <>
                <Button variant="outline" disabled={readonly || savingDraft} onClick={saveDraft}>
                  {savingDraft ? 'Saving…' : 'Save draft'}
                </Button>
                <Button disabled={readonly || savingDraft} onClick={publish}>
                  Publish <ArrowRight size={16} />
                </Button>
              </>
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
