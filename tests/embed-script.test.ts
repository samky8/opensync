import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

it('keeps the banner collapsed until the embed reports visible content', () => {
  const messageListeners: Array<(event: Record<string, unknown>) => void> = [];
  const contentWindow = {};
  const frame = {
    contentWindow,
    height: '',
    loading: '',
    style: { cssText: '', visibility: '' },
    addEventListener() {},
    setAttribute() {},
  };
  const host = {
    appendChild() {},
    getAttribute(name: string) {
      if (name === 'data-opensync') return '00000000-0000-4000-8000-000000000000';
      if (name === 'data-type') return 'banner';
      return null;
    },
    setAttribute() {},
  };
  const document = {
    currentScript: { src: 'https://opensync.example/embed.js' },
    createElement: () => frame,
    querySelectorAll: () => [host],
  };
  const window = {
    addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
      if (type === 'message') messageListeners.push(listener);
    },
    getComputedStyle: () => ({ fontFamily: 'Arial', fontSize: '16px' }),
  };

  runInNewContext(readFileSync('public/embed.js', 'utf8'), {
    URL,
    document,
    encodeURIComponent,
    Number,
    window,
  });

  expect(frame.loading).toBe('eager');
  expect(frame.height).toBe('0');
  expect(frame.style.visibility).toBe('hidden');

  messageListeners[0]({
    origin: 'https://opensync.example',
    source: contentWindow,
    data: {
      type: 'opensync:resize',
      id: '00000000-0000-4000-8000-000000000000',
      height: 72.2,
    },
  });

  expect(frame.height).toBe('73');
  expect(frame.style.visibility).toBe('visible');
});
