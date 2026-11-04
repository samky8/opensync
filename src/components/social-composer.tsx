'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Copy, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { SocialPublishing } from './social-publishing';
import { days, formatIntervals, type Schedule } from '@/lib/domain';

type Design = {
  title: string;
  message: string;
  footer: string;
  caption: string;
  format: 'post' | 'story';
  platform: 'Instagram' | 'Facebook';
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
}: {
  schedule: Schedule;
  locationId: string;
  demo?: boolean;
  readonly?: boolean;
}) {
  const [design, setDesign] = useState<Design>({
    title: 'A little update.',
    message: 'Our hours are changing. Here’s what to know before your next visit.',
    footer: schedule.website || schedule.name,
    caption: '',
    format: 'post',
    platform: 'Instagram',
    theme: 'cream',
    accent: schedule.widget.accent,
  });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const storageKey = `opensync-social-v1:${locationId}`;
  const height = design.format === 'story' ? 1920 : 1080;
  const caption =
    design.caption ||
    `${schedule.name}\n\n${design.title}\n${design.message}${design.footer ? `\n\n${design.footer}` : ''}`;
  function update(patch: Partial<Design>) {
    setDesign((current) => ({ ...current, ...patch }));
    setNotice('');
  }

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
    // A quiet frame and generous safe space keep story content clear of app controls.
    ctx.strokeStyle = dark ? '#52645e' : '#b5b0a5';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 984, height - 96);
    const start = design.format === 'story' ? 300 : 110;
    ctx.fillStyle = dark ? '#faf5eb' : '#152823';
    drawText(ctx, schedule.name, start, 100, 32);
    ctx.fillRect(108, start + 125, 78, 5);
    drawText(ctx, design.title, start + 185, 230, 82, true);
    drawText(ctx, design.message, start + 440, height - start - 660, 40);
    ctx.globalAlpha = 0.75;
    drawText(ctx, design.footer, height - (design.format === 'story' ? 300 : 145), 90, 28);
    ctx.globalAlpha = 1;
  }, [design, schedule.name, height]);

  function applyContent(title: string, message: string) {
    update({ title, message, caption: '' });
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(design));
      setNotice('Draft saved on this browser for this location.');
    } catch {
      setNotice('This browser could not save the draft. You can still download your image.');
    }
  }
  function restore() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setNotice('No saved social draft for this location yet.');
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
      setDesign(value);
      setNotice('Saved draft restored. Review it before sharing.');
    } catch {
      setNotice('The saved draft could not be read. Create a fresh draft below.');
    }
  }
  async function file() {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.current?.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Image export failed.'))),
        'image/png',
      ),
    );
    return new File([blob], `opensync-${design.platform.toLowerCase()}-${design.format}.png`, {
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
    <div className="social-workspace">
      <section className="card padded social-controls">
        <span className="eyebrow">FROM YOUR BUSINESS TO THEIR FEED</span>
        <h2>Create a social update</h2>
        <p className="muted">
          Create a post or story, then publish to a connected Instagram or Facebook account or
          download the image to share yourself.
        </p>
        <div className="form-grid">
          <label>
            Platform
            <select
              value={design.platform}
              onChange={(e) => update({ platform: e.target.value as Design['platform'] })}
            >
              <option>Instagram</option>
              <option>Facebook</option>
            </select>
          </label>
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
        </div>
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
                {item.label || 'Special hours'} · {item.start}
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
        <label>
          Headline
          <input
            maxLength={100}
            value={design.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </label>
        <label>
          Announcement
          <textarea
            rows={6}
            maxLength={700}
            value={design.message}
            onChange={(e) => update({ message: e.target.value })}
          />
        </label>
        <label>
          Footer / website
          <input
            maxLength={120}
            value={design.footer}
            onChange={(e) => update({ footer: e.target.value })}
          />
        </label>
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
          <Button variant="ghost" onClick={restore}>
            Restore saved draft
          </Button>
        </div>
        <small className="muted">
          Saved drafts stay on this browser. Saving here does not publish or change your website.
        </small>
      </section>
      <section className="card padded social-output">
        <div className="section-heading">
          <h3>
            {design.platform} {design.format}
          </h3>
          <span className="pill">Preview</span>
        </div>
        <canvas
          ref={canvas}
          width={1080}
          height={height}
          className="social-artwork"
          role="img"
          aria-label={`${schedule.name}: ${design.title}. ${design.message}. ${design.footer}`}
        />
        <p className="muted">
          {design.format === 'story'
            ? '9:16 story with space above and below your announcement.'
            : '1:1 image for your feed.'}{' '}
          Preview matches the downloaded image.
        </p>
        <div className="social-actions">
          <Button disabled={busy || !design.message.trim()} onClick={() => download()}>
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
          In {design.platform}, create a {design.format}, select your downloaded image, and review
          before publishing. For stories, your announcement is already on the image.
        </p>
        <p role="status" aria-live="polite">
          {notice}
        </p>
        <SocialPublishing
          locationId={locationId}
          platform={design.platform}
          format={design.format}
          caption={caption}
          demo={demo}
          readonly={readonly}
          saveDraft={save}
          getImage={() => {
            if (!canvas.current || !design.message.trim())
              throw new Error('Add an announcement first.');
            return canvas.current.toDataURL('image/jpeg', 0.92);
          }}
        />
      </section>
    </div>
  );
}
