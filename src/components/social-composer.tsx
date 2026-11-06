'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Copy, Share2, SlidersHorizontal, Pencil, Check } from 'lucide-react';
import { ProBadge } from './ui/pro-badge';
import { Button } from './ui/button';
import { SocialPublishing } from './social-publishing';
import { days, formatIntervals, type Schedule } from '@/lib/domain';

const backgrounds = ['botanical', 'sunset', 'waves', 'arches'] as const;

type Design = {
  background?: string;
  customImage?: string;
  title: string;
  message: string;
  footer: string;
  caption: string;
  format: 'post' | 'story';
  platform: 'Instagram' | 'Facebook';
  platforms?: ('Instagram' | 'Facebook')[];
  fontColour?: string;
  theme: 'cream' | 'dark' | 'accent';
  accent: string;
};

// Break long words as well as paragraphs so exports never run beyond the artwork.
function lines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const result: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) {
        line = candidate;
        continue;
      }
      if (line) result.push(line);
      line = '';
      for (const char of word) {
        if (ctx.measureText(line + char).width > width) {
          result.push(line);
          line = '';
        }
        line += char;
      }
    }
    result.push(line);
  }
  return result;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  height: number,
  maxSize: number,
  bold = false,
) {
  let size = maxSize;
  let wrapped: string[] = [];
  do {
    ctx.font = `${bold ? '600' : '400'} ${size}px ${bold ? 'Georgia' : 'Arial'}`;
    wrapped = lines(ctx, text, 864);
    if (wrapped.length * size * 1.3 <= height) break;
    size--;
  } while (size > 12);
  wrapped.forEach((line, i) => ctx.fillText(line, 108, y + i * size * 1.3));
}

export function SocialComposer({
  schedule,
  locationId,
  demo = false,
  readonly = false,
  compact = false,
  selected = true,
  initialPlatform,
  paid = false,
}: {
  paid?: boolean;
  schedule: Schedule;
  locationId: string;
  demo?: boolean;
  readonly?: boolean;
  compact?: boolean;
  selected?: boolean;
  initialPlatform?: Design['platform'];
}) {
  const [design, setDesign] = useState<Design>({
    title: 'A little update.',
    message: 'Our hours are changing. Here’s what to know before your next visit.',
    footer: schedule.website || schedule.name,
    caption: '',
    format: 'post',
    platform: initialPlatform || 'Instagram',
    theme: 'cream',
    accent: schedule.widget.accent,
  });
  const [editing, setEditing] = useState<'title' | 'message' | 'footer' | null>(null);
  const platforms = design.platforms || [design.platform];
  const [notice, setNotice] = useState('');
  const [customizing, setCustomizing] = useState(false);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<{
    source: string;
    image: HTMLImageElement;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const backgroundSource =
    design.background === 'custom'
      ? design.customImage || ''
      : backgrounds.includes(design.background as (typeof backgrounds)[number])
        ? '/social-backgrounds/' + design.background + '.svg'
        : '';
  const backgroundReady = !backgroundSource || backgroundImage?.source === backgroundSource;
  useEffect(() => {
    if (!backgroundSource) return;
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (!cancelled) setBackgroundImage({ source: backgroundSource, image });
    };
    image.onerror = () => {
      if (!cancelled) setNotice('This background could not load. Choose another image.');
    };
    image.src = backgroundSource;
    return () => {
      cancelled = true;
    };
  }, [backgroundSource]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const storageKey = `opensync-social-v1:${locationId}`;
  const platformStorageKey = initialPlatform ? `${storageKey}:${initialPlatform}` : storageKey;
  const height = design.format === 'story' ? 1920 : 1080;
  const caption =
    design.caption ||
    `${design.title}\n${design.message}${design.footer && design.footer !== schedule.name ? `\n\n${design.footer}` : ''}`;
  function update(patch: Partial<Design>) {
    setDesign((current) => ({ ...current, ...patch }));
    setNotice('');
  }

  useEffect(() => {
    restore(true);
    setRestored(true);
    // Restore once for each location/platform, before autosaving edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, initialPlatform]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(platformStorageKey, JSON.stringify(design));
    } catch {
      /* Image exports still work when browser storage is unavailable. */
    }
  }, [design, platformStorageKey, restored]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const rgb = design.accent
      .slice(1)
      .match(/.{2}/g)!
      .map((v) => parseInt(v, 16));
    const dark =
      design.theme === 'dark' ||
      (design.theme === 'accent' && rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 < 150);
    ctx.fillStyle = design.theme === 'accent' ? design.accent : dark ? '#182b27' : '#faf5eb';
    ctx.textBaseline = 'top';
    ctx.fillRect(0, 0, 1080, height);
    if (backgroundSource && backgroundImage?.source === backgroundSource) {
      const image = backgroundImage.image;
      const scale = Math.max(1080 / image.width, height / image.height);
      ctx.drawImage(
        image,
        (1080 - image.width * scale) / 2,
        (height - image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
      ctx.fillStyle = dark ? 'rgba(24,43,39,.65)' : 'rgba(250,245,235,.32)';
      ctx.fillRect(0, 0, 1080, height);
    }
    // A quiet frame and generous safe space keep story content clear of app controls.
    ctx.strokeStyle = dark ? '#52645e' : '#b5b0a5';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 984, height - 96);
    const start = design.format === 'story' ? 300 : 110;
    ctx.fillStyle = design.fontColour || (dark ? '#faf5eb' : '#152823');
    drawText(ctx, schedule.name, start, 100, 32);
    ctx.fillRect(108, start + 125, 78, 5);
    drawText(ctx, design.title, start + 185, 230, 82, true);
    drawText(ctx, design.message, start + 440, height - start - 660, 40);
    ctx.globalAlpha = 0.75;
    drawText(ctx, design.footer, height - (design.format === 'story' ? 300 : 145), 90, 28);
    ctx.globalAlpha = 1;
  }, [design, schedule.name, height, backgroundImage, backgroundSource]);

  function applyContent(title: string, message: string) {
    update({ title, message, caption: '' });
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(design));
      localStorage.setItem(platformStorageKey, JSON.stringify(design));
      setNotice('Draft saved on this browser for this location.');
    } catch {
      setNotice('This browser could not save the draft. You can still download your image.');
    }
  }
  function restore(silent = false) {
    try {
      const raw = localStorage.getItem(platformStorageKey) || localStorage.getItem(storageKey);
      if (!raw) {
        if (!silent) setNotice('No saved social draft for this location yet.');
        return;
      }
      const value = JSON.parse(raw);
      if (
        !value ||
        !['post', 'story'].includes(value.format) ||
        !['Instagram', 'Facebook'].includes(value.platform) ||
        !['cream', 'dark', 'accent'].includes(value.theme) ||
        !/^#[a-f\d]{6}$/i.test(value.accent) ||
        !['title', 'message', 'footer', 'caption'].every((key) => typeof value[key] === 'string') ||
        value.title.length > 100 ||
        value.message.length > 700 ||
        value.footer.length > 120 ||
        value.caption.length > 2200
      )
        throw new Error();
      if (value.background && !['custom', ...backgrounds].includes(value.background))
        throw new Error();
      if (
        value.customImage &&
        (typeof value.customImage !== 'string' ||
          value.customImage.length > 6000000 ||
          !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value.customImage))
      )
        throw new Error();
      if (value.fontColour && !/^#[a-f\d]{6}$/i.test(value.fontColour)) throw new Error();
      if (
        value.platforms &&
        (!Array.isArray(value.platforms) ||
          !value.platforms.length ||
          !value.platforms.every((platform: string) =>
            ['Instagram', 'Facebook'].includes(platform),
          ))
      )
        throw new Error();
      setDesign({
        ...value,
        platform: initialPlatform || value.platform,
        platforms: initialPlatform ? [initialPlatform] : value.platforms,
      });
      if (!silent) setNotice('Saved draft restored. Review it before sharing.');
    } catch {
      setNotice('The saved draft could not be read. Create a fresh draft below.');
    }
  }
  async function uploadBackground(asset?: File) {
    if (!asset || !paid || uploading) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(asset.type) ||
      asset.size > 10 * 1024 * 1024
    ) {
      setNotice('Choose a JPG, PNG or WebP image up to 10 MB.');
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
      update({ background: 'custom', customImage: resized.toDataURL('image/jpeg', 0.8) });
    } catch {
      setNotice('Could not read this image. Try another JPG, PNG or WebP.');
    } finally {
      URL.revokeObjectURL(url);
      setUploading(false);
    }
  }
  async function file() {
    if (!backgroundReady || uploading) throw new Error('Background is still loading.');
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.current?.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Image export failed.'))),
        'image/png',
      ),
    );
    return new File([blob], `opensync-${platforms.join('-').toLowerCase()}-${design.format}.png`, {
      type: 'image/png',
    });
  }
  async function download(share = false) {
    setBusy(true);
    setNotice('');
    try {
      const asset = await file();
      if (share && navigator.canShare?.({ files: [asset] })) {
        await navigator.share({ files: [asset] });
        setNotice(
          'Image shared to your selected app. Finish publishing there; copy the caption separately if needed.',
        );
      } else {
        const url = URL.createObjectURL(asset);
        const link = document.createElement('a');
        link.href = url;
        link.download = asset.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        setNotice(
          share
            ? 'File sharing is unavailable here. Image downloaded; upload it in your social app.'
            : 'Image downloaded. Upload it as a post or story in your social app.',
        );
      }
    } catch (error) {
      setNotice(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Sharing cancelled. Your draft is still here.'
          : 'Could not export or share the image. Try downloading again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`social-workspace${compact ? ' social-workspace-compact' : ''}`}>
      {compact && (
        <Button
          variant="outline"
          size="sm"
          aria-expanded={customizing}
          onClick={() => setCustomizing(!customizing)}
        >
          <SlidersHorizontal size={14} /> {customizing ? 'Done customizing' : 'Customize'}
        </Button>
      )}
      <section className="card padded social-output">
        <div className="section-heading">
          <h3>
            {platforms.join(' & ')} {design.format}
          </h3>
          <span className="pill">Preview</span>
        </div>
        <div className="social-preview-toolbar">
          <fieldset className="social-platforms">
            <legend>Platform</legend>
            {(['Instagram', 'Facebook'] as const).map((platform) => (
              <label key={platform}>
                <input
                  type="checkbox"
                  aria-label={platform}
                  checked={platforms.includes(platform)}
                  disabled={compact}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...platforms, platform]
                      : platforms.filter((item) => item !== platform);
                    if (next.length) update({ platforms: next, platform: next[0] });
                  }}
                />
                {platform === 'Instagram' ? 'IG' : 'FB'}
              </label>
            ))}
          </fieldset>
          <label>
            Format
            <select
              value={design.format}
              onChange={(e) => update({ format: e.target.value as Design['format'] })}
            >
              <option value="post">Square post · 1080 × 1080</option>
              <option value="story">Story · 1080 × 1920</option>
            </select>
          </label>

          <label>
            Font colour
            <input
              type="color"
              value={design.fontColour || '#152823'}
              onChange={(event) => update({ fontColour: event.target.value })}
            />
          </label>
          {design.fontColour && (
            <Button variant="ghost" size="sm" onClick={() => update({ fontColour: undefined })}>
              Auto colour
            </Button>
          )}
        </div>
        <fieldset className="social-background-picker">
          <legend>Background image</legend>
          <div className="social-background-options">
            <button
              type="button"
              aria-pressed={!design.background}
              onClick={() => update({ background: undefined })}
            >
              <span className="social-background-thumb" style={{ background: '#faf5eb' }} />
              None
            </button>
            {backgrounds.map((background) => (
              <button
                type="button"
                key={background}
                aria-pressed={design.background === background}
                onClick={() => update({ background })}
              >
                <span
                  className="social-background-thumb"
                  style={{ backgroundImage: 'url(/social-backgrounds/' + background + '.svg)' }}
                />
                {background.charAt(0).toUpperCase() + background.slice(1)}
              </button>
            ))}
            {design.customImage && (
              <button
                type="button"
                aria-pressed={design.background === 'custom'}
                onClick={() => update({ background: 'custom' })}
              >
                <span
                  className="social-background-thumb"
                  style={{ backgroundImage: 'url(' + design.customImage + ')' }}
                />
                Your image
              </button>
            )}
          </div>
          <label className="social-background-upload">
            Upload your own image <ProBadge />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!paid || uploading}
              onChange={(event) => {
                void uploadBackground(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          <small className="muted">
            {!paid ? 'Available with Pro or Business. ' : ''}JPG, PNG or WebP, up to 10 MB. Images
            are cropped to fit.
          </small>
          {(uploading || !backgroundReady) && <p role="status">Preparing background?</p>}
        </fieldset>
        <div className="social-editable-preview" style={{ maxWidth: height === 1920 ? 366 : 650 }}>
          <canvas
            ref={canvas}
            width={1080}
            height={height}
            className="social-artwork"
            role="img"
            aria-label={`${schedule.name}: ${design.title}. ${design.message}. ${design.footer}`}
          />
          {(
            [
              {
                key: 'title',
                label: 'Headline',
                top: design.format === 'story' ? 485 : 295,
                limit: 100,
              },
              {
                key: 'message',
                label: 'Announcement',
                top: design.format === 'story' ? 740 : 550,
                limit: 700,
              },
              {
                key: 'footer',
                label: 'Footer / website',
                top: height - (design.format === 'story' ? 300 : 145),
                limit: 120,
              },
            ] as const
          ).map(({ key, label, top, limit }) => (
            <div
              className={editing === key ? 'social-inline-edit is-editing' : 'social-inline-edit'}
              key={key}
              style={{ top: (top / height) * 100 + '%' }}
            >
              {editing === key ? (
                <div className="social-inline-field">
                  <label>
                    {label}
                    <textarea
                      autoFocus
                      aria-label={label}
                      rows={key === 'message' ? 4 : 2}
                      maxLength={limit}
                      value={design[key]}
                      onChange={(event) => update({ [key]: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') setEditing(null);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={'Done editing ' + label}
                    onClick={() => setEditing(null)}
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="social-edit-pen"
                  aria-label={'Edit ' + label}
                  onClick={() => setEditing(key)}
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="muted">
          {design.format === 'story'
            ? '9:16 story with space above and below your announcement.'
            : '1:1 image for your feed.'}{' '}
          Preview matches the downloaded image.
        </p>
        {(!compact || selected) && (
          <>
            <div className="social-actions">
              <Button
                disabled={busy || uploading || !backgroundReady || !design.message.trim()}
                onClick={() => download()}
              >
                <Download size={16} /> Download PNG
              </Button>
              <Button
                variant="outline"
                disabled={busy || !design.message.trim()}
                onClick={() => download(true)}
              >
                <Share2 size={16} /> Share image
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(caption);
                    setNotice('Caption copied. Paste it into your post.');
                  } catch {
                    setNotice('Clipboard unavailable. Select and copy the caption field.');
                  }
                }}
              >
                <Copy size={16} /> Copy caption
              </Button>
            </div>
            <p className="notice subtle">
              In {platforms.join(' and ')}, create a {design.format}, select your downloaded image,
              and review before publishing. For stories, your announcement is already on the image.
            </p>
            <p role="status" aria-live="polite">
              {notice}
            </p>
            {platforms.map((platform) => (
              <SocialPublishing
                key={platform}
                locationId={locationId}
                platform={platform}
                format={design.format}
                caption={caption}
                demo={demo}
                readonly={readonly}
                saveDraft={save}
                getImage={() => {
                  if (!canvas.current || !backgroundReady || uploading || !design.message.trim())
                    throw new Error('Add an announcement first.');
                  return canvas.current.toDataURL('image/jpeg', 0.92);
                }}
              />
            ))}
          </>
        )}
      </section>
      {(!compact || customizing) && (
        <section className="card padded social-controls">
          <span className="eyebrow">FROM YOUR BUSINESS TO THEIR FEED</span>
          <h2>Create a social update</h2>
          <p className="muted">
            Create a post or story, then publish to a connected Instagram or Facebook account or
            download the image to share yourself.
          </p>
          <label>
            Start with your business details
            <select
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'weekly')
                  applyContent(
                    'Our opening hours.',
                    schedule.weekly
                      .map((hours, i) => `${days[i]}: ${formatIntervals(hours)}`)
                      .join('\n'),
                  );
                if (value.startsWith('exception:')) {
                  const item = schedule.exceptions[Number(value.split(':')[1])];
                  applyContent(
                    item.label || 'An update to our hours.',
                    `${item.start}${item.end !== item.start ? ` – ${item.end}` : ''}\n${formatIntervals(item.intervals)}`,
                  );
                }
                if (value.startsWith('announcement:')) {
                  const item = schedule.announcements[Number(value.split(':')[1])];
                  applyContent(item.title || 'A little update.', item.message);
                }
                e.target.value = '';
              }}
            >
              <option value="" disabled>
                Choose hours or an announcement…
              </option>
              <option value="weekly">Regular opening hours</option>
              {schedule.exceptions.map((item, i) => (
                <option key={item.id} value={`exception:${i}`}>
                  {item.label || 'Holidays & exceptions'} · {item.start}
                </option>
              ))}
              {schedule.announcements.map((item, i) => (
                <option key={item.id} value={`announcement:${i}`}>
                  {item.title || 'Announcement'}
                  {!item.enabled ? ' (disabled)' : ''}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            Uses your current business draft. Check dates and hours before sharing.
          </p>
          <div className="form-grid">
            <label>
              Style
              <select
                value={design.theme}
                onChange={(e) => update({ theme: e.target.value as Design['theme'] })}
              >
                <option value="cream">Warm paper</option>
                <option value="dark">After hours</option>
                <option value="accent">Brand colour</option>
              </select>
            </label>
            <label>
              Brand colour
              <input
                type="color"
                value={design.accent}
                onChange={(e) => update({ accent: e.target.value })}
              />
            </label>
          </div>
          <label>
            Post caption
            <textarea
              rows={5}
              maxLength={2200}
              value={caption}
              onChange={(e) => update({ caption: e.target.value })}
            />
          </label>
          <div className="social-actions">
            <Button variant="outline" onClick={save}>
              Save draft
            </Button>
            <Button variant="ghost" onClick={() => restore()}>
              Restore saved draft
            </Button>
          </div>
          <small className="muted">
            Designs save automatically on this browser. Saving here does not publish or change your
            website.
          </small>
        </section>
      )}
    </div>
  );
}
