'use client';
import { useEffect } from 'react';
export function Pwa() {
  useEffect(() => {
    if (
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production' &&
      !location.pathname.startsWith('/embed/')
    )
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
