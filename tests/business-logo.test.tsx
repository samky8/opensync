import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { defaultSchedule, scheduleSchema } from '../src/lib/domain';
import { ProfileMenu } from '../src/components/profile-menu';

it('accepts uploaded PNG logos while rejecting unsafe and oversized data URLs', () => {
  const schedule = defaultSchedule();
  const logo =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7X8AAAAASUVORK5CYII=';
  expect(scheduleSchema.safeParse({ ...schedule, logo }).success).toBe(true);
  for (const value of [
    'data:image/svg+xml;base64,PHN2Zz4=',
    'javascript:alert(1)',
    logo + 'A'.repeat(400000),
  ]) {
    expect(scheduleSchema.safeParse({ ...schedule, logo: value }).success).toBe(false);
  }
});

it('renders each selected business logo and falls back to its initial when absent', () => {
  const locations = [
    { id: 'a', draft: { name: 'Alpha', logo: 'https://example.com/a.png' } },
    { id: 'b', draft: { name: 'Beta', logo: 'https://example.com/b.png' } },
  ];
  for (const location of locations) {
    const props = {
      name: location.draft.name,
      locations,
      selected: location.id,
      paid: true,
      disabled: false,
      canCreate: true,
      demo: false,
      onSelect: () => {},
      onCreate: () => true,
    };
    const html = renderToStaticMarkup(<ProfileMenu {...props} logo={location.draft.logo} />);
    expect(html).toContain(`alt="${location.draft.name} logo"`);
    expect(html).toContain(`src="${location.draft.logo}"`);
    expect(renderToStaticMarkup(<ProfileMenu {...props} />)).toContain(
      `class="business-avatar">${location.draft.name[0]}</div>`,
    );
  }
});
