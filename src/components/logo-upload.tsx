'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';

export function LogoUpload({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (logo: string) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const latest = useRef(onChange);
  const generation = useRef(0);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  return (
    <div className="logo-upload">
      <label>
        Business logo <span>optional</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || loading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            const current = ++generation.current;
            setError('');
            setLoading(true);
            try {
              if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
                throw new Error('Choose a PNG, JPEG, or WebP image.');
              if (file.size > 5 * 1024 * 1024)
                throw new Error('Choose an image smaller than 5 MB.');
              const bitmap = await createImageBitmap(file);
              try {
                const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(bitmap.width * scale));
                canvas.height = Math.max(1, Math.round(bitmap.height * scale));
                const context = canvas.getContext('2d');
                if (!context) throw new Error('Could not process this image.');
                context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                const logo = canvas.toDataURL('image/png');
                if (logo.length > 400000) throw new Error('Choose a smaller image.');
                if (current === generation.current) latest.current(logo);
              } finally {
                bitmap.close();
              }
            } catch (cause) {
              if (current === generation.current)
                setError(
                  cause instanceof Error && cause.name === 'Error'
                    ? cause.message
                    : 'Could not read this image. Choose another file.',
                );
            } finally {
              if (current === generation.current) setLoading(false);
            }
          }}
        />
      </label>
      <small className="muted">
        PNG, JPEG, or WebP, up to 5 MB. Save business details to keep your logo.
      </small>
      {loading && <p role="status">Preparing logo…</p>}
      {error && <p role="alert">{error}</p>}
      {value && (
        <div className="logo-preview">
          <Image src={value} alt="Business logo preview" width={64} height={64} unoptimized />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || loading}
            onClick={() => {
              setError('');
              onChange('');
            }}
          >
            Remove logo
          </Button>
        </div>
      )}
    </div>
  );
}
