'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Copy, Share2, Pencil, Check, Upload, Instagram, Facebook } from 'lucide-react';
import { ProBadge } from './ui/pro-badge';
import { Button } from './ui/button';
import { SocialPublishing } from './social-publishing';
import { type Schedule } from '@/lib/domain';

const backgrounds = ['botanical', 'sunset', 'waves', 'arches'] as const;

type Design = {
  background?: string;
  customImage?: string;
  headerText?: string;
  showHeaderText?: boolean;
  showBusinessName?: boolean;
  showBusinessLogo?: boolean;
  title: string;
  message: string;
  footer: string;
  caption: string;
  format: 'post' | 'story';
  formats?: ('post' | 'story')[];
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
  x = 108,
  width = 864,
) {
  let size = maxSize;
  let wrapped: string[] = [];
  do {
    ctx.font = `${bold ? '600' : '400'} ${size}px ${bold ? 'Georgia' : 'Arial'}`;
    wrapped = lines(ctx, text, width);
    if (wrapped.length * size * 1.3 <= height) break;
    size--;
  } while (size > 12);
  wrapped.forEach((line, i) => ctx.fillText(line, x, y + i * size * 1.3));
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
  const backgroundUpload = useRef<HTMLInputElement>(null);
  const [design, setDesign] = useState<Design>({
    headerText: '',
    showHeaderText: false,
    showBusinessName: true,
    showBusinessLogo: false,
    title: 'A little update.',
    message: 'Our hours are changing. Here’s what to know before your next visit.',
    footer: schedule.website || schedule.name,
    caption: '',
    format: 'post',
    platform: initialPlatform || 'Instagram',
    theme: 'cream',
    accent: schedule.widget.accent,
  });
  const [editing, setEditing] = useState<string | null>(null);
  const platforms = design.platforms || [design.platform];
  const formats = design.formats || [design.format];
  const showHeaderText = design.showHeaderText ?? false;
  const showBusinessName = design.showBusinessName ?? true;
  const showBusinessLogo = design.showBusinessLogo ?? false;
  const [notice, setNotice] = useState('');
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<{
    source: string;
    image: HTMLImageElement;
  } | null>(null);
  const [businessLogoImage, setBusinessLogoImage] = useState<{
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
  const businessLogoReady =
    !showBusinessLogo || !schedule.logo || businessLogoImage?.source === schedule.logo;
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
  useEffect(() => {
    if (!schedule.logo) return;
    let cancelled = false;
    const image = new window.Image();
    if (/^https?:/i.test(schedule.logo)) image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!cancelled) setBusinessLogoImage({ source: schedule.logo, image });
    };
    image.onerror = () => {
      if (!cancelled)
        setNotice('Your business logo could not load. Deselect it or upload it again.');
    };
    image.src = schedule.logo;
    return () => {
      cancelled = true;
    };
  }, [schedule.logo]);
  const canvases = useRef<Partial<Record<Design['format'], HTMLCanvasElement | null>>>({});
  const storageKey = `opensync-social-v1:${locationId}`;
  const platformStorageKey = initialPlatform ? `${storageKey}:${initialPlatform}` : storageKey;
  const caption =
    design.caption ||
    `${design.title}\n${design.message}${design.footer && design.footer !== schedule.name ? `\n\n${design.footer}` : ''}`;
  function update(patch: Partial<Design>) {
    setDesign((current) => ({ ...current, ...patch }));
    setNotice('');
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
        (value.headerText !== undefined && typeof value.headerText !== 'string') ||
        ['showHeaderText', 'showBusinessName', 'showBusinessLogo'].some(
          (key) => value[key] !== undefined && typeof value[key] !== 'boolean',
        ) ||
        (value.headerText?.length || 0) > 98 ||
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
      if (
        value.formats &&
        (!Array.isArray(value.formats) ||
          !value.formats.length ||
          !value.formats.every((format: string) => ['post', 'story'].includes(format)) ||
          new Set(value.formats).size !== value.formats.length)
      )
        throw new Error();
      setDesign({
        ...value,
        headerText: value.headerText || '',
        showHeaderText: value.showHeaderText ?? false,
        showBusinessName: value.showBusinessName ?? true,
        showBusinessLogo: value.showBusinessLogo ?? false,
        platform: initialPlatform || value.platform,
        platforms: initialPlatform ? [initialPlatform] : value.platforms,
      });
      if (!silent) setNotice('Saved draft restored. Review it before sharing.');
    } catch {
      setNotice('The saved draft could not be read. Create a fresh draft below.');
    }
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
    for (const format of design.formats || [design.format]) {
      const height = format === 'story' ? 1920 : 1080;
      const ctx = canvases.current[format]?.getContext('2d');
      if (!ctx) continue;
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
      const start = format === 'story' ? 300 : 110;
      ctx.fillStyle = design.fontColour || (dark ? '#faf5eb' : '#152823');
      let headerX = 108;
      if (showBusinessLogo && schedule.logo && businessLogoImage?.source === schedule.logo) {
        const logo = businessLogoImage.image;
        const size = 78;
        const scale = Math.min(size / logo.width, size / logo.height);
        const width = logo.width * scale;
        const logoHeight = logo.height * scale;
        ctx.drawImage(
          logo,
          108 + (size - width) / 2,
          start + (size - logoHeight) / 2,
          width,
          logoHeight,
        );
        headerX += 108;
      }
      const headerItems = [
        showBusinessName ? schedule.name : '',
        showHeaderText ? design.headerText || '' : '',
      ].filter(Boolean);
      headerItems.forEach((item, index) =>
        drawText(
          ctx,
          item,
          start + (headerItems.length === 1 ? 18 : index * 42),
          headerItems.length === 1 ? 64 : 38,
          headerItems.length === 1 ? 32 : 28,
          index === 0 && showBusinessName,
          headerX,
          972 - headerX,
        ),
      );
      ctx.fillRect(108, start + 125, 78, 5);
      drawText(ctx, design.title, start + 185, 230, 82, true);
      drawText(ctx, design.message, start + 440, height - start - 660, 40);
      ctx.globalAlpha = 0.75;
      drawText(ctx, design.footer, height - (format === 'story' ? 300 : 145), 90, 28);
      ctx.globalAlpha = 1;
      if (!paid) {
        ctx.font = '600 26px Arial';
        const label = 'Opensync.ca';
        const width = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(24,43,39,.85)';
        ctx.fillRect(1032 - width - 24, height - 94, width + 40, 46);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(label, 1024, height - 84);
        ctx.textAlign = 'left';
      }
    }
  }, [
    design,
    schedule.name,
    schedule.logo,
    paid,
    backgroundImage,
    backgroundSource,
    businessLogoImage,
    showBusinessLogo,
    showBusinessName,
    showHeaderText,
  ]);

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(design));
      localStorage.setItem(platformStorageKey, JSON.stringify(design));
      setNotice('Draft saved on this browser for this location.');
    } catch {
      setNotice('This browser could not save the draft. You can still download your image.');
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
  async function file(format: Design['format']) {
    if (!backgroundReady || !businessLogoReady || uploading)
      throw new Error('Artwork is still loading.');
    const canvas = canvases.current[format];
    if (!canvas) throw new Error('Preview unavailable.');
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Image export failed.'))),
        'image/png',
      ),
    );
    return new File([blob], `opensync-${platforms.join('-').toLowerCase()}-${format}.png`, {
      type: 'image/png',
    });
  }
  async function download(share = false) {
    setBusy(true);
    setNotice('');
    try {
      const assets = await Promise.all(formats.map(file));
      if (share && navigator.canShare?.({ files: assets })) {
        await navigator.share({ files: assets });
        setNotice(
          'Image shared to your selected app. Finish publishing there; copy the caption separately if needed.',
        );
      } else {
        for (const asset of assets) {
          const url = URL.createObjectURL(asset);
          const link = document.createElement('a');
          link.href = url;
          link.download = asset.name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
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
      <section className="card padded social-output">
        <div className="section-heading">
          <h3>
            {platforms.join(' & ')} {formats.join(' & ')}
          </h3>
          <span className="pill">Preview</span>
        </div>
        <div className="social-preview-toolbar">
          <fieldset className="social-platforms">
            <legend>Platform</legend>
            {(['Instagram', 'Facebook'] as const).map((platform) => (
              <label key={platform} className="social-platform-toggle" title={platform}>
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
                <span className="social-platform-logo">
                  {platform === 'Instagram' ? (
                    <Instagram size={24} aria-hidden="true" />
                  ) : (
                    <Facebook size={24} aria-hidden="true" />
                  )}
                  <Check className="social-platform-check" size={12} aria-hidden="true" />
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="social-platforms">
            <legend>Format</legend>
            {(['post', 'story'] as const).map((format) => (
              <label key={format}>
                <input
                  type="checkbox"
                  aria-label={format === 'post' ? 'Post' : 'Story'}
                  checked={formats.includes(format)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...formats, format]
                      : formats.filter((item) => item !== format);
                    if (next.length) update({ formats: next, format: next[0] });
                  }}
                />
                {format === 'post' ? 'Post' : 'Story'}
              </label>
            ))}
          </fieldset>

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
            <button
              type="button"
              className="social-background-upload"
              disabled={!paid || uploading}
              onClick={() => backgroundUpload.current?.click()}
            >
              <span className="social-background-thumb">
                <Upload size={22} aria-hidden="true" />
              </span>
              <span className="social-background-upload-name">
                Upload <ProBadge />
              </span>
            </button>
          </div>
          <input
            ref={backgroundUpload}
            hidden
            aria-label="Upload your own image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!paid || uploading}
            onChange={(event) => {
              void uploadBackground(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <small className="muted">
            {!paid ? 'Available with Pro or Business. ' : ''}JPG, PNG or WebP, up to 10 MB. Images
            are cropped to fit.
          </small>
          {(uploading || !backgroundReady) && <p role="status">Preparing background?</p>}
        </fieldset>
        <div className={`social-preview-grid${formats.length > 1 ? ' has-both-formats' : ''}`}>
          {formats.map((format) => {
            const height = format === 'story' ? 1920 : 1080;
            return (
              <section
                key={format}
                className="social-format-preview"
                aria-label={`${format} preview`}
              >
                <h4>{format === 'post' ? 'Post ? 1080 ? 1080' : 'Story ? 1080 ? 1920'}</h4>
                <div
                  className="social-editable-preview"
                  style={{ maxWidth: height === 1920 ? 366 : 650 }}
                >
                  <canvas
                    ref={(node) => {
                      canvases.current[format] = node;
                    }}
                    width={1080}
                    height={height}
                    className="social-artwork"
                    role="img"
                    aria-label={`${format} preview: ${showBusinessName ? schedule.name : ''}${showHeaderText ? ` ${design.headerText}` : ''}. ${design.title}. ${design.message}. ${design.footer}`}
                  />
                  <div
                    className={
                      editing === `${format}:header`
                        ? 'social-inline-edit social-header-edit is-editing'
                        : 'social-inline-edit social-header-edit'
                    }
                    style={{ top: ((format === 'story' ? 300 : 110) / height) * 100 + '%' }}
                  >
                    {editing === `${format}:header` ? (
                      <div className="social-inline-field social-header-field">
                        <fieldset>
                          <legend>Header</legend>
                          <label className="social-header-option">
                            <input
                              type="checkbox"
                              checked={showHeaderText}
                              onChange={(event) => update({ showHeaderText: event.target.checked })}
                            />
                            Text
                          </label>
                          {showHeaderText && (
                            <label className="social-header-text">
                              Header text
                              <input
                                autoFocus
                                aria-label="Header text"
                                maxLength={98}
                                value={design.headerText || ''}
                                onChange={(event) => update({ headerText: event.target.value })}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') setEditing(null);
                                }}
                              />
                              <span className="character-counter" aria-live="polite">
                                ({(design.headerText || '').length}/98)
                              </span>
                            </label>
                          )}
                          <label className="social-header-option">
                            <input
                              type="checkbox"
                              checked={showBusinessName}
                              onChange={(event) =>
                                update({ showBusinessName: event.target.checked })
                              }
                            />
                            Business name
                          </label>
                          <label className="social-header-option">
                            <input
                              type="checkbox"
                              checked={showBusinessLogo}
                              disabled={!schedule.logo}
                              onChange={(event) =>
                                update({ showBusinessLogo: event.target.checked })
                              }
                            />
                            Business logo
                            {!schedule.logo && <small>No logo uploaded</small>}
                          </label>
                        </fieldset>
                        <button
                          type="button"
                          aria-label="Done editing Header"
                          onClick={() => setEditing(null)}
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="social-edit-pen"
                        aria-label="Edit Header"
                        onClick={() => setEditing(`${format}:header`)}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                  {(
                    [
                      {
                        key: 'title',
                        label: 'Headline',
                        top: format === 'story' ? 485 : 295,
                        limit: 100,
                      },
                      {
                        key: 'message',
                        label: 'Announcement',
                        top: format === 'story' ? 740 : 550,
                        limit: 700,
                      },
                      {
                        key: 'footer',
                        label: 'Footer / website',
                        top: height - (format === 'story' ? 300 : 145),
                        limit: 120,
                      },
                    ] as const
                  ).map(({ key, label, top, limit }) => (
                    <div
                      className={
                        editing === `${format}:${key}`
                          ? 'social-inline-edit is-editing'
                          : 'social-inline-edit'
                      }
                      key={key}
                      style={{ top: (top / height) * 100 + '%' }}
                    >
                      {editing === `${format}:${key}` ? (
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
                            <span className="character-counter" aria-live="polite">
                              ({design[key].length}/{limit})
                            </span>
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
                          onClick={() => setEditing(`${format}:${key}`)}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        {(!compact || selected) && (
          <>
            <div className="social-actions">
              <Button
                disabled={
                  busy ||
                  uploading ||
                  !backgroundReady ||
                  !businessLogoReady ||
                  !design.message.trim()
                }
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
            <p role="status" aria-live="polite">
              {notice}
            </p>
            {platforms.flatMap((platform) =>
              formats.map((format) => (
                <SocialPublishing
                  key={`${platform}-${format}`}
                  locationId={locationId}
                  platform={platform}
                  format={format}
                  caption={caption}
                  demo={demo}
                  readonly={readonly}
                  saveDraft={save}
                  getImage={() => {
                    const canvas = canvases.current[format];
                    if (
                      !canvas ||
                      !backgroundReady ||
                      !businessLogoReady ||
                      uploading ||
                      !design.message.trim()
                    )
                      throw new Error('Add an announcement first.');
                    return canvas.toDataURL('image/jpeg', 0.92);
                  }}
                />
              )),
            )}
          </>
        )}
      </section>
    </div>
  );
}
