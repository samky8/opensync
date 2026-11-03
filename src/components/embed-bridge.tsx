'use client';
import { useEffect } from 'react';
export function EmbedBridge({ id }: { id: string }) {
  useEffect(() => {
    const el = document.querySelector('.embed-page');
    if (!el) return;
    const update = () => {
      const height = el.querySelector('.widget') ? Math.ceil(el.getBoundingClientRect().height) : 0;
      window.parent.postMessage({ type: 'opensync:resize', id, height }, '*');
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, [id]);
  return null;
}
