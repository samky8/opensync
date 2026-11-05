import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileMenu } from '../src/components/profile-menu';

const props = {
  name: 'Test business',
  locations: [{ id: 'profile-1', draft: { name: 'Test business' } }],
  selected: 'profile-1',
  disabled: false,
  canCreate: true,
  demo: false,
  onSelect: () => {},
  onCreate: () => true,
};

it('shows a disabled creation button with a crown for Free accounts', () => {
  const html = renderToStaticMarkup(<ProfileMenu {...props} paid={false} />);
  expect(html).toContain('disabled="" title="Requires Pro"');
  expect(html).toContain('lucide-crown');
  expect(html).toContain('Create new profile');
  expect(html).not.toContain('href=');
});

it('links paid accounts to fresh setup scoped to the selected profile', () => {
  const html = renderToStaticMarkup(<ProfileMenu {...props} paid />);
  expect(html).toContain('href="/onboarding?source=profile-1"');
  expect(html).not.toContain('lucide-crown');
});

it('keeps profile switching available for paid accounts without creation permission', () => {
  const html = renderToStaticMarkup(<ProfileMenu {...props} paid canCreate={false} />);
  expect(html).toContain('data-profile-id="profile-1"');
  expect(html).toContain('Only an owner or admin can create profiles');
  expect(html).not.toContain('href=');
});
