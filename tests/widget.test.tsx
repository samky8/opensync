import { it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Widget } from '../src/components/widget';
import { defaultSchedule } from '../src/lib/domain';
it('renders escaped business content, current status and schedule', () => {
  const s = defaultSchedule('<script>alert(1)</script>');
  const html = renderToStaticMarkup(<Widget schedule={s} now="2026-11-02T15:00:00Z" />);
  expect(html).toContain('Open now');
  expect(html).toContain('Monday');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
});
it('does not render an expired banner', () => {
  const s = defaultSchedule();
  s.announcements = [
    {
      id: 'x',
      title: 'Old',
      message: 'Expired',
      start: '2026-01-01T00:00:00Z',
      end: '2026-01-02T00:00:00Z',
      type: 'information',
      enabled: true,
      ctaText: '',
      ctaUrl: '',
    },
  ];
  expect(
    renderToStaticMarkup(<Widget schedule={s} type="banner" now="2026-11-02T15:00:00Z" />),
  ).toBe('');
});
