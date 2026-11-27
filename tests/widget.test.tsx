import { it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Widget } from '../src/components/widget';
import { customizeWidget, defaultSchedule, scheduleSchema } from '../src/lib/domain';
it('renders escaped business content, current status and schedule', () => {
  const s = defaultSchedule('<script>alert(1)</script>');
  const html = renderToStaticMarkup(<Widget schedule={s} now="2026-11-02T15:00:00Z" />);
  expect(html).toContain('Open now');
  expect(html).toContain('Monday');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
});
it('hides normal hours during an active multi-day closure', () => {
  const schedule = defaultSchedule('Seasonal Cafe');
  schedule.exceptions = [
    {
      id: 'seasonal-break',
      start: '2026-11-01',
      end: '2026-11-20',
      label: 'Closed for the season',
      intervals: [],
    },
  ];
  const html = renderToStaticMarkup(<Widget schedule={schedule} now="2026-11-02T15:00:00Z" />);
  expect(html).toContain('Closed for the season');
  expect(html).toContain('Nov 1, 2026');
  expect(html).toContain('Nov 20, 2026');
  expect(html).toContain('Opens Sat');
  expect(html).not.toContain('class="widget-today"');
  expect(html).not.toContain('class="widget-week"');
  expect(html).not.toContain('class="widget-expand"');
});
it('uses semantic open and closed status treatments', () => {
  const schedule = defaultSchedule();
  const open = renderToStaticMarkup(
    <Widget schedule={schedule} type="status" now="2026-11-02T15:00:00Z" />,
  );
  const closed = renderToStaticMarkup(
    <Widget schedule={schedule} type="status" now="2026-11-02T23:00:00Z" />,
  );
  expect(open).toContain('widget-status open-now');
  expect(open).toContain('status-dot green');
  expect(closed).toContain('widget-status closed-now');
  expect(closed).toContain('status-dot red');
});
it.each(['', '2026-11-26'])('shows a closure date once with the label %j', (label) => {
  const schedule = defaultSchedule();
  schedule.widget.collapsible = false;
  schedule.exceptions = [
    { id: 'day-off', start: '2026-11-26', end: '2026-11-26', label, intervals: [] },
  ];
  const html = renderToStaticMarkup(
    <Widget schedule={schedule} type="hours" now="2026-11-26T15:00:00Z" />,
  );
  expect(html).toContain('class="widget-special"><span>2026-11-26</span><span>Closed</span>');
});
it('places the hours credit in the footer opposite the time zone', () => {
  const html = renderToStaticMarkup(
    <Widget schedule={defaultSchedule()} type="hours" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('<div class="widget-footer"><div class="widget-zone"><svg');
  expect(html).toContain('<span>Eastern Time (ET)</span>');
  expect(html).not.toContain(
    '<div class="widget-heading"><div class="widget-name">Your business</div><a',
  );
});
it.each(['hours', 'status'] as const)('can hide the OpenSync credit in the %s widget', (type) => {
  const schedule = defaultSchedule();
  schedule.widget.showBranding = false;
  const html = renderToStaticMarkup(
    <Widget schedule={schedule} type={type} now="2026-11-02T15:00:00Z" />,
  );
  expect(html).not.toContain('widget-credit');
  expect(html).toContain('Open now');
});
it.each(['hours', 'status'] as const)(
  'can hide the business logo only in the %s widget',
  (type) => {
    const schedule = defaultSchedule();
    schedule.logo = 'https://example.com/logo.png';
    const legacyWidget = { ...schedule.widget, showLogo: undefined };
    const saved = scheduleSchema.parse({
      ...schedule,
      widget: customizeWidget(schedule.widget, type, { showLogo: false }),
    });
    const otherType = type === 'hours' ? 'status' : 'hours';
    const render = (data: typeof schedule, widgetType: 'hours' | 'status') =>
      renderToStaticMarkup(<Widget schedule={data} type={widgetType} now="2026-11-02T15:00:00Z" />);

    expect(render(scheduleSchema.parse({ ...schedule, widget: legacyWidget }), type)).toContain(
      'class="widget-logo"',
    );
    expect(render(saved, type)).not.toContain('class="widget-logo"');
    expect(render(saved, otherType)).toContain('class="widget-logo"');
  },
);
it('can hide optional hours content while keeping a non-collapsible week visible', () => {
  const schedule = defaultSchedule();
  schedule.widget.showStatus = false;
  schedule.widget.highlightToday = false;
  schedule.widget.collapsible = false;
  const html = renderToStaticMarkup(
    <Widget schedule={schedule} type="hours" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).not.toContain('class="widget-status"');
  expect(html).not.toContain('class="widget-today"');
  expect(html).not.toContain('class="widget-expand"');
  expect(html).toContain('class="widget-week"');
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
it('lets banner appearance override announcement colours and border thickness', () => {
  const s = defaultSchedule();
  s.announcements = [
    {
      id: 'styled-banner',
      title: 'Customer update',
      message: 'Please note this change.',
      start: '2026-01-01T00:00:00Z',
      end: '',
      type: 'warning',
      enabled: true,
      ctaText: '',
      ctaUrl: '',
    },
  ];
  s.widget = customizeWidget(s.widget, 'banner', {
    accent: '#123456',
    background: '#abcdef',
    borderColour: '#654321',
    borderWidth: 5,
  });
  const html = renderToStaticMarkup(
    <Widget schedule={scheduleSchema.parse(s)} type="banner" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('--announcement-font-colour:#123456');
  expect(html).toContain('--announcement-background-colour:#abcdef');
  expect(html).toContain('--announcement-border-colour:#654321');
  expect(html).toContain('border-left-width:5px');
});
it('does not render a widget that is disabled in published settings', () => {
  const s = defaultSchedule();
  s.widgetVisibility.status = false;
  expect(
    renderToStaticMarkup(<Widget schedule={s} type="status" now="2026-11-02T15:00:00Z" />),
  ).toBe('');
});
it('renders the status credit in the top heading beside the business name', () => {
  const s = defaultSchedule('Responsive Coffee');
  const html = renderToStaticMarkup(
    <Widget schedule={s} type="status" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('widget widget-type-status');
  expect(html).toContain(
    '<div class="widget-heading"><div class="widget-name">Responsive Coffee</div><a class="widget-credit"',
  );
  expect(html).not.toContain('class="widget-footer"');
});
it('applies custom widget typography, font size, background and border', () => {
  const s = defaultSchedule('Styled Coffee');
  s.widget.font = 'mono';
  s.widget.fontSize = 18;
  s.widget.background = '#f0f1f2';
  s.widget.borderColour = '#123456';
  s.widget.borderWidth = 4;
  const html = renderToStaticMarkup(
    <Widget schedule={s} type="status" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('font-family:ui-monospace');
  expect(html).toContain('font-size:18px');
  expect(html).toContain('--widget-background:#f0f1f2');
  expect(html).toContain('--widget-border-colour:#123456');
  expect(html).toContain('border-width:4px');
});
it('renders a none background as transparent', () => {
  const s = defaultSchedule();
  s.widget.background = 'none';
  const html = renderToStaticMarkup(
    <Widget schedule={s} type="hours" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('--widget-background:transparent');
});
it('leaves automatic widget typography and font size inheritable', () => {
  const s = defaultSchedule();
  s.widget.font = 'auto';
  s.widget.fontSize = 'auto';
  const html = renderToStaticMarkup(
    <Widget schedule={s} type="status" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('font-family:inherit');
  expect(html).toContain('font-size:inherit');
});

it('uses configurable soon indicators, custom labels, and next-opening visibility', () => {
  const schedule = defaultSchedule();
  schedule.widget.closingSoonMinutes = 30;
  schedule.widget.closingSoonLabel = 'Last orders';
  let html = renderToStaticMarkup(
    <Widget schedule={schedule} type="status" now="2026-11-02T21:45:00Z" />,
  );
  expect(html).toContain('Last orders');

  schedule.widget.openingSoonMinutes = 30;
  schedule.widget.openingSoonLabel = 'Doors open shortly';
  html = renderToStaticMarkup(
    <Widget schedule={schedule} type="status" now="2026-11-02T13:45:00Z" />,
  );
  expect(html).toContain('Doors open shortly');

  schedule.widget.showNextOpening = false;
  html = renderToStaticMarkup(
    <Widget schedule={schedule} type="status" now="2026-11-02T23:00:00Z" />,
  );
  expect(html).not.toContain('Opens Tue');
});

it('applies week start, day format, time format, and the special-hours horizon', () => {
  const schedule = defaultSchedule();
  schedule.widget.collapsible = false;
  schedule.widget.weekStart = 'sunday';
  schedule.widget.dayFormat = 'short';
  schedule.widget.timeFormat = '24';
  schedule.widget.upcomingSpecialDays = 7;
  schedule.exceptions = [
    {
      id: 'nearby',
      start: '2026-11-08',
      end: '2026-11-08',
      label: 'Nearby holiday',
      intervals: [],
    },
    {
      id: 'later',
      start: '2026-11-20',
      end: '2026-11-20',
      label: 'Later holiday',
      intervals: [],
    },
  ];
  const html = renderToStaticMarkup(
    <Widget schedule={schedule} type="hours" now="2026-11-02T15:00:00Z" />,
  );
  expect(html.indexOf('<span>Sun</span>')).toBeLessThan(html.indexOf('<span>Mon</span>'));
  expect(html).toContain('09:00 – 17:00');
  expect(html).toContain('Nearby holiday');
  expect(html).not.toContain('Later holiday');
});

it('supports French labels and can hide the time zone', () => {
  const schedule = defaultSchedule();
  schedule.widget.language = 'fr';
  schedule.widget.collapsible = false;
  schedule.widget.showTimezone = false;
  const html = renderToStaticMarkup(
    <Widget schedule={schedule} type="hours" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('Ouvert');
  expect(html).toContain('Aujourd’hui');
  expect(html).toContain('lundi');
  expect(html).not.toContain('widget-zone');
});

it('applies an adjustable shadow and defaults new options for older saved widgets', () => {
  const legacy = defaultSchedule();
  const legacyWidget = { ...legacy.widget } as Partial<typeof legacy.widget>;
  delete legacyWidget.shadow;
  delete legacyWidget.timeFormat;
  delete legacyWidget.showTimezone;
  const parsed = scheduleSchema.parse({ ...legacy, widget: legacyWidget });
  expect(parsed.widget.shadow).toBe(0);
  expect(parsed.widget.timeFormat).toBe('auto');
  expect(parsed.widget.showTimezone).toBe(true);

  parsed.widget.shadow = 3;
  const html = renderToStaticMarkup(
    <Widget schedule={parsed} type="hours" now="2026-11-02T15:00:00Z" />,
  );
  expect(html).toContain('box-shadow:0 12px 30px rgba(23, 33, 60, 0.16)');
});
