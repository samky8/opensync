'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type SavedBackground = { id: string; image: string; createdAt: string };

const demoKey = (locationId: string) => `opensync-backgrounds-v1:${locationId}`;

export function useSavedBackgrounds(locationId: string, demo: boolean) {
  const [images, setImages] = useState<SavedBackground[]>([]);
  const [loading, setLoading] = useState(!demo);

  useEffect(() => {
    let cancelled = false;
    if (demo) {
      try {
        const saved = JSON.parse(localStorage.getItem(demoKey(locationId)) || '[]');
        if (Array.isArray(saved)) setImages(saved.slice(0, 5));
      } catch {
        setImages([]);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/social/backgrounds?id=${encodeURIComponent(locationId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load saved backgrounds.');
        if (!cancelled) setImages(data.images);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demo, locationId]);

  async function save(image: string) {
    let saved: SavedBackground;
    if (demo) {
      saved = { id: crypto.randomUUID(), image, createdAt: new Date().toISOString() };
      const next = [saved, ...images].slice(0, 5);
      localStorage.setItem(demoKey(locationId), JSON.stringify(next));
      setImages(next);
      return saved;
    }
    const response = await fetch('/api/social/backgrounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: locationId, image }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not save this background.');
    saved = data.image;
    setImages((current) => [saved, ...current].slice(0, 5));
    return saved;
  }

  async function remove(imageId: string) {
    if (demo) {
      const next = images.filter((image) => image.id !== imageId);
      localStorage.setItem(demoKey(locationId), JSON.stringify(next));
      setImages(next);
      return;
    }
    const response = await fetch('/api/social/backgrounds', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: locationId, imageId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not delete this background.');
    setImages((current) => current.filter((image) => image.id !== imageId));
  }

  return { images, loading, save, remove };
}

export function SavedBackgroundOptions({
  images,
  selected,
  disabled,
  onSelect,
  onDelete,
}: {
  images: SavedBackground[];
  selected?: string;
  disabled?: boolean;
  onSelect: (image: string) => void;
  onDelete: (image: SavedBackground) => Promise<void>;
}) {
  return images.map((image, index) => (
    <span className="social-saved-background" key={image.id}>
      <button
        type="button"
        aria-label={images.length === 1 ? 'Your image' : `Saved image ${index + 1}`}
        aria-pressed={selected === image.image}
        disabled={disabled}
        onClick={() => onSelect(image.image)}
      >
        <span
          className="social-background-thumb"
          style={{ backgroundImage: `url(${image.image})` }}
        />
        Saved
      </button>
      <button
        type="button"
        className="social-background-delete"
        aria-label={`Delete saved image ${index + 1}`}
        disabled={disabled}
        onClick={() => {
          if (confirm('Delete this saved background? This cannot be undone.')) void onDelete(image);
        }}
      >
        <X size={12} aria-hidden="true" />
      </button>
    </span>
  ));
}
