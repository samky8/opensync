'use client';
import { useEffect } from 'react';
export function EmbedBridge({ id }: { id: string }) {
  useEffect(() => {
    const el = document.querySelector('.embed-page');
    if (!el) return;
    const receiveHostStyles = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        !event.data ||
        event.data.type !== 'opensync:style' ||
        event.data.id !== id
      )
        return;
      const { fontFamily, fontSize } = event.data;
      if (typeof fontFamily === 'string' && fontFamily.length <= 300)
        (el as HTMLElement).style.fontFamily = fontFamily;
      if (typeof fontSize === 'string' && /^\d+(?:\.\d+)?px$/.test(fontSize)) {
        const pixels = Number.parseFloat(fontSize);
        if (pixels >= 6 && pixels <= 72) (el as HTMLElement).style.fontSize = fontSize;
      }
    };
    const update = () => {
      const height = el.querySelector('.widget') ? Math.ceil(el.getBoundingClientRect().height) : 0;
      window.parent.postMessage({ type: 'opensync:resize', id, height }, '*');
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('message', receiveHostStyles);
    window.parent.postMessage({ type: 'opensync:ready', id }, '*');
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('message', receiveHostStyles);
    };
  }, [id]);
  return null;
}
