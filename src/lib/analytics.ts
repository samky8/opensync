'use client';

import { sendGAEvent } from '@next/third-parties/google';

export function trackEvent(name: string, parameters: Record<string, string | number> = {}) {
  sendGAEvent('event', name, parameters);
}
