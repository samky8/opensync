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
it.each([
  ['information', 'announcement-information', 'Information'],
  ['success', 'announcement-success', 'Success'],
  ['warning', 'announcement-warning', 'Warning'],
  ['closure', 'announcement-closure', 'Closure'],
  ['special hours', 'announcement-special-hours', 'Special hours'],
] as const)(
  'gives the %s announcement type a distinct banner treatment without a category label',
  (type, className, label) => {
    const s = defaultSchedule();
    s.announcements = [
      {
        id: type,
        title: 'Customer update',
        message: 'Please note this change.',
        start: '2026-01-01T00:00:00Z',
        end: '',
        type,
        enabled: true,
        ctaText: '',
        ctaUrl: '',
      },
    ];

    const html = renderToStaticMarkup(
      <Widget schedule={s} type="banner" now="2026-11-02T15:00:00Z" />,
    );
    expect(html).toContain(className);
    expect(html).toContain('Customer update');
    expect(html).not.toContain(`>${label}<`);
  },
);
it('renders the default announcement style without an icon or category label', () => {
  const s = defaultSchedule();
  s.announcements = [
    {
      id: 'plain',
      title: 'Customer update',
      message: 'Please note this change.',
      start: '2026-01-01T00:00:00Z',
      end: '',
      type: 'none',
      enabled: true,
      ctaText: '',
      ctaUrl: '',
    },
  ];
  const html = renderToStaticMarkup(
    <Widget schedule={s} type="banner" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('announcement-none');
  expect(html).toContain('announcement-widget-content is-inline');
  expect(html).toContain('--announcement-border-colour:#181b1a');
  expect(html).toContain(
    '<div class="announcement-widget-heading"><strong>Customer update</strong></div>',
  );
});
it('renders an announcement message inline or hides it based on its layout settings', () => {
  const s = defaultSchedule();
  s.announcements = [
    {
      id: 'layout',
      title: 'Customer update',
      message: 'Beside the title',
      messagePosition: 'inline',
      messageVisible: true,
      fontColour: '#123456',
      backgroundColour: '#abcdef',
      borderColour: '#654321',
      start: '2026-01-01T00:00:00Z',
      end: '',
      type: 'none',
      enabled: true,
      ctaText: '',
      ctaUrl: '',
    },
  ];
  const inline = renderToStaticMarkup(
    <Widget schedule={s} type="banner" now="2026-11-02T15:00:00Z" />,
  );
  expect(inline).toContain('announcement-widget-content is-inline');
  expect(inline).toContain('Beside the title');
  expect(inline).toContain('--announcement-font-colour:#123456');
  expect(inline).toContain('--announcement-background-colour:#abcdef');
  expect(inline).toContain('--announcement-border-colour:#654321');

  s.announcements[0].messageVisible = false;
  const hidden = renderToStaticMarkup(
    <Widget schedule={s} type="banner" now="2026-11-02T15:00:00Z" />,
  );
  expect(hidden).toContain('Customer update');
  expect(hidden).not.toContain('Beside the title');
});
it('does not render a widget that is disabled in published settings', () => {
  const s = defaultSchedule();
  s.widgetVisibility.status = false;
  expect(
    renderToStaticMarkup(<Widget schedule={s} type="status" now="2026-11-02T15:00:00Z" />),
  ).toBe('');
});
