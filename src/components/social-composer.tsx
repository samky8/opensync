'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  Download,
  Copy,
  Share2,
  Pencil,
  Check,
  Upload,
  Instagram,
  Facebook,
  Maximize2,
  X,
  Paintbrush,
  LayoutGrid,
  ListChecks,
} from 'lucide-react';
import { ProBadge } from './ui/pro-badge';
import { Button } from './ui/button';
import { SocialPublishing } from './social-publishing';
import { SavedBackgroundOptions, useSavedBackgrounds } from './saved-backgrounds';
import { type Schedule } from '@/lib/domain';
import {
  readSocialPresets,
  quickSocialPresets,
  scaledSocialLogo,
  scaledSocialText,
  socialBackgrounds,
  socialCanvasFont,
  socialFonts,
  socialLogoSize,
  socialLogoSource,
  socialPalette,
  socialStyle,
  socialTextSize,
  writeSocialPresets,
  type SocialPreset,
  type SocialStyle,
} from '@/lib/social-presets';

type Design = SocialStyle & {
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
};

const quickStyleDefaults: Partial<SocialStyle> = {
  background: undefined,
  fontColour: undefined,
  titleSize: undefined,
  bodySize: undefined,
  alignment: undefined,
};

const studioSections = [
  ['appearance', Paintbrush, 'Appearance'],
  ['layout', LayoutGrid, 'Layout'],
  ['content', ListChecks, 'Content'],
] as const;

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
  style: SocialStyle,
  bold = false,
  x = 108,
  width = 864,
) {
  let size = maxSize;
  let wrapped: string[] = [];
  do {
    ctx.font = socialCanvasFont(style.font, size, bold);
    wrapped = lines(ctx, text, width);
    if (wrapped.length * size * 1.3 <= height) break;
    size--;
  } while (size > 12);
  ctx.save();
  const align = style.alignment ?? 'left';
  ctx.textAlign = align;
  const anchor = x + (align === 'center' ? width / 2 : align === 'right' ? width : 0);
  wrapped.forEach((line, i) => ctx.fillText(line, anchor, y + i * size * 1.3, width));
  ctx.restore();
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
  onManageConnections,
}: {
  paid?: boolean;
  schedule: Schedule;
  locationId: string;
  demo?: boolean;
  readonly?: boolean;
  compact?: boolean;
  selected?: boolean;
  initialPlatform?: Design['platform'];
  onManageConnections?: () => void;
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
  const [studioSection, setStudioSection] =
    useState<(typeof studioSections)[number][0]>('appearance');
  const platforms = design.platforms || [design.platform];
  const formats = design.formats || [design.format];
  const showHeaderText = design.showHeaderText ?? false;
  const showBusinessName = design.showBusinessName ?? true;
  const showBusinessLogo = design.showBusinessLogo ?? false;
  const logoSource = socialLogoSource(schedule, design.businessLogoVariant);
  const appearanceId = useId();
  const palette = socialPalette(design);
  const fontColour = design.fontColour || palette.ink;
  const logoSize = design.logoSize ?? socialLogoSize.default;
  const [notice, setNotice] = useState('');
  const [presets, setPresets] = useState<SocialPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
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
  const {
    images: savedBackgrounds,
    loading: loadingBackgrounds,
    save: saveBackground,
    remove: removeBackground,
  } = useSavedBackgrounds(locationId, demo);
  const backgroundSource =
    design.background === 'custom'
      ? design.customImage || ''
      : socialBackgrounds.includes(design.background as (typeof socialBackgrounds)[number])
        ? '/social-backgrounds/' + design.background + '.svg'
        : '';
  const backgroundReady = !backgroundSource || backgroundImage?.source === backgroundSource;
  const businessLogoReady =
    !showBusinessLogo || !logoSource || businessLogoImage?.source === logoSource;
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
    if (!logoSource) return;
    let cancelled = false;
    const image = new window.Image();
    if (/^https?:/i.test(logoSource)) image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!cancelled) setBusinessLogoImage({ source: logoSource, image });
    };
    image.onerror = () => {
      if (!cancelled)
        setNotice('Your business logo could not load. Deselect it or upload it again.');
    };
    image.src = logoSource;
    return () => {
      cancelled = true;
    };
  }, [logoSource]);
  const canvases = useRef<Partial<Record<Design['format'], HTMLCanvasElement | null>>>({});
  const expandedDialog = useRef<HTMLDialogElement>(null);
  const expandedCanvas = useRef<HTMLCanvasElement>(null);

  function expandPreview(format: Design['format']) {
    const source = canvases.current[format];
    const target = expandedCanvas.current;
    const dialog = expandedDialog.current;
    const context = target?.getContext('2d');
    if (!source || !target || !dialog || !context || dialog.open) return;
    target.width = source.width;
    target.height = source.height;
    target.setAttribute('aria-label', source.getAttribute('aria-label') || `${format} preview`);
    context.drawImage(source, 0, 0);
    dialog.showModal();
  }
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
        ['showHeaderText', 'showBusinessName', 'showBusinessLogo', 'showFrame', 'showFooter'].some(
          (key) => value[key] !== undefined && typeof value[key] !== 'boolean',
        ) ||
        (value.headerText?.length || 0) > 98 ||
        value.title.length > 100 ||
        value.message.length > 700 ||
        value.footer.length > 120 ||
        value.caption.length > 2200
      )
        throw new Error();
      if (value.background && !['custom', ...socialBackgrounds].includes(value.background))
        throw new Error();
      if (
        value.customImage &&
        (typeof value.customImage !== 'string' ||
          value.customImage.length > 6000000 ||
          !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value.customImage))
      )
        throw new Error();
      if (value.fontColour && !/^#[a-f\d]{6}$/i.test(value.fontColour)) throw new Error();
      if (value.font !== undefined && !Object.hasOwn(socialFonts, value.font)) throw new Error();
      if (value.alignment !== undefined && !['left', 'center', 'right'].includes(value.alignment))
        throw new Error();
      for (const size of [value.titleSize, value.bodySize]) {
        if (
          size !== undefined &&
          (!Number.isInteger(size) || size < socialTextSize.min || size > socialTextSize.max)
        )
          throw new Error();
      }
      if (
        value.logoSize !== undefined &&
        (!Number.isInteger(value.logoSize) ||
          value.logoSize < socialLogoSize.min ||
          value.logoSize > socialLogoSize.max)
      )
        throw new Error();
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
    setPresets(readSocialPresets(locationId));
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
      const palette = socialPalette(design);
      ctx.fillStyle = palette.background;
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
        ctx.fillStyle = palette.dark ? 'rgba(24,43,39,.65)' : 'rgba(250,245,235,.32)';
        ctx.fillRect(0, 0, 1080, height);
      }
      // A quiet frame and generous safe space keep story content clear of app controls.
      if (design.showFrame !== false) {
        ctx.strokeStyle = palette.frame;
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 48, 984, height - 96);
      }
      const start = format === 'story' ? 300 : 110;
      ctx.fillStyle = design.fontColour || palette.ink;
      let headerX = 108;
      if (showBusinessLogo && logoSource && businessLogoImage?.source === logoSource) {
        const logo = businessLogoImage.image;
        const size = scaledSocialLogo(78, design.logoSize);
        const scale = Math.min(size / logo.width, size / logo.height);
        const width = logo.width * scale;
        const logoHeight = logo.height * scale;
        ctx.drawImage(
          logo,
          108 + (size - width) / 2,
          start + (78 - logoHeight) / 2,
          width,
          logoHeight,
        );
        headerX += size + 30;
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
          design,
          index === 0 && showBusinessName,
          headerX,
          972 - headerX,
        ),
      );
      const dividerX =
        design.alignment === 'center' ? 501 : design.alignment === 'right' ? 894 : 108;
      ctx.fillRect(dividerX, start + 125, 78, 5);
      drawText(
        ctx,
        design.title,
        start + 185,
        230,
        scaledSocialText(82, design.titleSize),
        design,
        true,
      );
      drawText(
        ctx,
        design.message,
        start + 440,
        height - start - 660,
        scaledSocialText(40, design.bodySize),
        design,
      );
      if (design.showFooter !== false) {
        ctx.globalAlpha = 0.75;
        drawText(ctx, design.footer, height - (format === 'story' ? 300 : 145), 90, 28, design);
        ctx.globalAlpha = 1;
      }
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
    logoSource,
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
  function savePreset() {
    const name = presetName.trim() || `Style ${presets.length + 1}`;
    const id = selectedPreset || crypto.randomUUID();
    const next = [
      ...presets.filter((preset) => preset.id !== id),
      { id, name, style: socialStyle({ ...design, showFrame: design.showFrame ?? true }) },
    ];
    try {
      writeSocialPresets(locationId, next);
      setPresets(next);
      setSelectedPreset(id);
      setPresetName(name);
      setNotice(`Saved “${name}” as a style preset.`);
    } catch {
      setNotice('This browser could not save the style preset.');
    }
  }
  async function uploadBackground(asset?: File) {
    if (!asset || !paid || uploading) return;
    if (savedBackgrounds.length >= 5) {
      setNotice('Background limit reached. Delete one before uploading another.');
      return;
    }
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
      const data = resized.toDataURL('image/jpeg', 0.8);
      await saveBackground(data);
      update({ background: 'custom', customImage: data });
      setNotice('Custom background saved to this profile.');
    } catch (error) {
      setNotice(
        error instanceof Error && error.message
          ? error.message
          : 'Could not read this image. Try another JPG, PNG or WebP.',
      );
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
    <div className={`social-workspace ${compact ? 'social-workspace-compact' : 'social-studio'}`}>
      <section className="card padded social-output">
        {compact && (
          <div className="section-heading">
            <h3>
              {platforms.join(' & ')} {formats.join(' & ')}
            </h3>
            <span className="pill">Preview</span>
          </div>
        )}
        <div className="social-setup-panel">
          <div className="social-setup-heading">
            <div>
              <h4>Post setup</h4>
              <p>Choose where the artwork appears and how it should be sized.</p>
            </div>
          </div>
          <div className="social-preview-toolbar">
            <fieldset className="social-control-group social-platforms">
              <legend>Platform</legend>
              <div className="social-control-options">
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
                        <Instagram size={21} aria-hidden="true" />
                      ) : (
                        <Facebook size={21} aria-hidden="true" />
                      )}
                      <span>{platform}</span>
                      <Check className="social-platform-check" size={12} aria-hidden="true" />
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="social-control-group social-format-options">
              <legend>Format</legend>
              <div className="social-control-options">
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
                    <span className="social-format-shape" aria-hidden="true" />
                    <span>
                      <strong>{format === 'post' ? 'Post' : 'Story'}</strong>
                      <small>{format === 'post' ? 'Square' : 'Portrait'}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
        <div className="social-customization">
          <section className="social-setup-panel">
            <div className="social-setup-heading">
              <h4>Preset builder</h4>
            </div>
            <div className="social-quick-presets">
              <h5>Quick presets</h5>
              <div className="widget-presets" role="group" aria-label="Quick presets">
                {quickSocialPresets.map(({ name, style }) => {
                  const patch = { ...quickStyleDefaults, ...style };
                  const active = Object.entries(patch).every(
                    ([key, value]) => design[key as keyof SocialStyle] === value,
                  );
                  const palette = socialPalette({ ...design, ...patch });
                  return (
                    <button
                      key={name}
                      type="button"
                      className={active ? 'selected' : undefined}
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedPreset('');
                        setPresetName('');
                        update(patch);
                      }}
                    >
                      <span
                        className="social-preset-thumbnail"
                        style={{
                          background: palette.background,
                          color: palette.ink,
                          alignItems: style.alignment === 'center' ? 'center' : 'start',
                        }}
                        aria-hidden="true"
                      >
                        <span className={style.font === 'sans' ? undefined : 'social-preset-serif'}>
                          Aa
                        </span>
                        <i />
                        <i />
                      </span>
                      <strong>{name}</strong>
                      {active && <Check size={13} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="social-preset-bar">
              <label>
                Style preset
                <select
                  value={selectedPreset}
                  onChange={(event) => {
                    const preset = presets.find((item) => item.id === event.target.value);
                    setSelectedPreset(event.target.value);
                    if (!preset) return;
                    setPresetName(preset.name);
                    update({
                      ...socialStyle(preset.style),
                      footer: preset.style.footer ?? design.footer,
                    });
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
              <label>
                <span className="field-label">
                  Preset name <span>(optional)</span>
                </span>
                <input
                  aria-label="Preset name"
                  maxLength={60}
                  value={presetName}
                  placeholder="e.g. Weekly update"
                  onChange={(event) => setPresetName(event.target.value)}
                />
              </label>
              <Button variant="outline" size="sm" onClick={savePreset}>
                Save style preset
              </Button>
            </div>
            <div
              className="widget-studio-tabs social-studio-tabs"
              role="group"
              aria-label="Preset settings"
            >
              {studioSections.map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  className={studioSection === id ? 'active' : undefined}
                  aria-pressed={studioSection === id}
                  onClick={() => setStudioSection(id)}
                >
                  <Icon size={14} aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
            <div hidden={studioSection !== 'appearance'}>
              <div className="social-style-fields social-typography-fields">
                <label className="social-font-field">
                  Font
                  <select
                    value={design.font ?? 'classic'}
                    onChange={(event) =>
                      update({ font: event.target.value as SocialStyle['font'] })
                    }
                  >
                    {Object.entries(socialFonts).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    ['titleSize', 'Title size'],
                    ['bodySize', 'Body text size'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <span className="widget-range-control">
                      <input
                        type="range"
                        aria-label={label}
                        aria-valuetext={`${design[key] ?? socialTextSize.default}%`}
                        min={socialTextSize.min}
                        max={socialTextSize.max}
                        value={design[key] ?? socialTextSize.default}
                        onChange={(event) => update({ [key]: Number(event.target.value) })}
                      />
                      <span>{design[key] ?? socialTextSize.default}%</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="social-style-fields social-colour-fields">
                <div className="social-colour-field">
                  <label htmlFor={`${appearanceId}-background`}>Background colour</label>
                  <div className="widget-colour-control">
                    <select
                      id={`${appearanceId}-background`}
                      aria-label="Background colour mode"
                      value={design.theme}
                      onChange={(event) =>
                        update({ theme: event.target.value as SocialStyle['theme'] })
                      }
                    >
                      <option value="cream">Cream</option>
                      <option value="dark">Dark</option>
                      <option value="accent">Custom</option>
                    </select>
                    <input
                      type="color"
                      aria-label="Background colour"
                      value={palette.background}
                      onChange={(event) => update({ theme: 'accent', accent: event.target.value })}
                    />
                  </div>
                </div>
                <div className="social-colour-field">
                  <label htmlFor={`${appearanceId}-font`}>Font colour</label>
                  <div className="widget-colour-control">
                    <select
                      id={`${appearanceId}-font`}
                      aria-label="Font colour mode"
                      value={design.fontColour ? 'custom' : 'auto'}
                      onChange={(event) =>
                        update({
                          fontColour: event.target.value === 'custom' ? fontColour : undefined,
                        })
                      }
                    >
                      <option value="auto">Auto</option>
                      <option value="custom">Custom</option>
                    </select>
                    <input
                      type="color"
                      aria-label="Font colour"
                      value={fontColour}
                      onChange={(event) => update({ fontColour: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div hidden={studioSection !== 'layout'}>
              <div className="social-style-fields">
                <label>
                  Text alignment
                  <select
                    value={design.alignment ?? 'left'}
                    onChange={(event) =>
                      update({ alignment: event.target.value as SocialStyle['alignment'] })
                    }
                  >
                    <option value="left">Left</option>
                    <option value="center">Centre</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </div>
              <div className="social-branding-options">
                <label>
                  <input
                    type="checkbox"
                    checked={design.showFrame !== false}
                    onChange={(event) => update({ showFrame: event.target.checked })}
                  />
                  Show artwork border
                </label>
              </div>
            </div>
            <div hidden={studioSection !== 'content'}>
              <div className="social-branding-options">
                <label>
                  <input
                    type="checkbox"
                    checked={showBusinessName}
                    onChange={(event) => update({ showBusinessName: event.target.checked })}
                  />{' '}
                  Show business name
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showBusinessLogo}
                    disabled={!logoSource}
                    onChange={(event) => update({ showBusinessLogo: event.target.checked })}
                  />{' '}
                  Show business logo
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showHeaderText}
                    onChange={(event) => update({ showHeaderText: event.target.checked })}
                  />
                  Show header text
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={design.showFooter !== false}
                    onChange={(event) => update({ showFooter: event.target.checked })}
                  />{' '}
                  Show footer
                </label>
              </div>
              {!logoSource && (
                <small className="muted">Upload a logo in business settings to use it here.</small>
              )}
              {showBusinessLogo && logoSource && (
                <div className="social-style-fields social-logo-settings">
                  {schedule.logo && schedule.monogram && (
                    <label>
                      Logo version
                      <select
                        value={design.businessLogoVariant ?? 'primary'}
                        onChange={(event) =>
                          update({
                            businessLogoVariant:
                              event.target.value === 'monogram' ? 'monogram' : 'primary',
                          })
                        }
                      >
                        <option value="primary">Business logo</option>
                        <option value="monogram">Monogram</option>
                      </select>
                    </label>
                  )}
                  <label>
                    Logo size
                    <span className="widget-range-control">
                      <input
                        type="range"
                        aria-label="Logo size"
                        aria-valuetext={`${logoSize}%`}
                        min={socialLogoSize.min}
                        max={socialLogoSize.max}
                        value={logoSize}
                        onChange={(event) => update({ logoSize: Number(event.target.value) })}
                      />
                      <span>{logoSize}%</span>
                    </span>
                  </label>
                </div>
              )}
              <div className="social-style-fields social-content-fields">
                {showHeaderText && (
                  <label>
                    Artwork header
                    <input
                      maxLength={98}
                      value={design.headerText ?? ''}
                      onChange={(event) => update({ headerText: event.target.value })}
                    />
                  </label>
                )}
                <label>
                  Artwork title
                  <input
                    maxLength={100}
                    value={design.title}
                    onChange={(event) => update({ title: event.target.value })}
                  />
                </label>
                <label>
                  Artwork message
                  <textarea
                    maxLength={700}
                    rows={4}
                    value={design.message}
                    onChange={(event) => update({ message: event.target.value })}
                  />
                </label>
                {design.showFooter !== false && (
                  <label>
                    Artwork footer
                    <input
                      maxLength={120}
                      value={design.footer}
                      onChange={(event) => update({ footer: event.target.value })}
                    />
                  </label>
                )}
              </div>
            </div>
          </section>
          <section
            className="social-setup-panel social-background-picker"
            hidden={studioSection !== 'appearance'}
          >
            <div className="social-setup-heading">
              <h4>Background image</h4>
            </div>
            <div className="social-background-options" role="group" aria-label="Background image">
              <button
                type="button"
                aria-pressed={!design.background}
                onClick={() => update({ background: undefined })}
              >
                <span
                  className="social-background-thumb"
                  style={{ background: palette.background }}
                />
                None
              </button>
              {socialBackgrounds.map((background) => (
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
              {design.customImage &&
                !savedBackgrounds.some((background) => background.image === design.customImage) && (
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
              <SavedBackgroundOptions
                images={savedBackgrounds}
                selected={design.background === 'custom' ? design.customImage : undefined}
                disabled={readonly}
                onSelect={(image) => update({ background: 'custom', customImage: image })}
                onDelete={async (image) => {
                  try {
                    await removeBackground(image.id);
                    if (design.customImage === image.image)
                      update({ background: undefined, customImage: undefined });
                    setNotice('Saved background deleted.');
                  } catch (error) {
                    setNotice(
                      error instanceof Error ? error.message : 'Could not delete this background.',
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
                  {!paid && <ProBadge />} Upload
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
                void uploadBackground(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <small className="muted">
              {!paid ? 'Available with Pro or Business. ' : ''}JPG, PNG or WebP, up to 10 MB. Images
              are cropped to fit and saved to this profile. {savedBackgrounds.length}/5 saved.
            </small>
            {(uploading || !backgroundReady) && <p role="status">Preparing background…</p>}
          </section>
        </div>
        <div className="social-preview-panel">
          <div className={`social-preview-grid${formats.length > 1 ? ' has-both-formats' : ''}`}>
            {formats.map((format) => {
              const height = format === 'story' ? 1920 : 1080;
              return (
                <section
                  key={format}
                  className="social-format-preview"
                  aria-label={`${format} preview`}
                >
                  <h4>{format === 'post' ? 'Post · 1080 × 1080' : 'Story · 1080 × 1920'}</h4>
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
                      aria-label={`${format} preview: ${showBusinessName ? schedule.name : ''}${showHeaderText ? ` ${design.headerText}` : ''}. ${design.title}. ${design.message}. ${design.showFooter !== false ? design.footer : ''}`}
                    />
                    <button
                      type="button"
                      className="social-edit-pen social-expand-preview"
                      aria-label={`Expand ${format} preview`}
                      aria-haspopup="dialog"
                      onClick={() => expandPreview(format)}
                    >
                      <Maximize2 size={16} aria-hidden="true" />
                    </button>
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
                                onChange={(event) =>
                                  update({ showHeaderText: event.target.checked })
                                }
                              />
                              Text
                            </label>
                            {showHeaderText && (
                              <label className="social-header-text">
                                <span className="field-label">
                                  Header text <span>(optional)</span>
                                </span>
                                <input
                                  autoFocus
                                  aria-label="Header text (optional)"
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
                                disabled={!logoSource}
                                onChange={(event) =>
                                  update({ showBusinessLogo: event.target.checked })
                                }
                              />
                              Business logo
                              {!logoSource && <small>No logo uploaded</small>}
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
                          label: 'Title',
                          top: format === 'story' ? 485 : 295,
                          limit: 100,
                        },
                        {
                          key: 'message',
                          label: 'Message',
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
                              {key === 'message' ? (
                                label
                              ) : (
                                <span className="field-label">
                                  {label} <span>(optional)</span>
                                </span>
                              )}
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
            </>
          )}
        </div>
        {(!compact || selected) && (
          <>
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
                  onManageConnections={onManageConnections}
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
      <dialog
        ref={expandedDialog}
        className="social-expanded-preview"
        aria-label="Expanded artwork preview"
        onClick={() => expandedDialog.current?.close()}
      >
        <button type="button" className="social-expanded-close" aria-label="Close preview">
          <X size={22} aria-hidden="true" />
        </button>
        <canvas ref={expandedCanvas} role="img" />
      </dialog>
    </div>
  );
}
