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

it('shows a disabled creation button with a crown without a Business plan', () => {
  const html = renderToStaticMarkup(<ProfileMenu {...props} canCreate={false} />);
  expect(html).toContain('disabled="" title="Requires Business on your account"');
  expect(html).toContain('lucide-crown');
  expect(html).toContain('Create new workspace');
  expect(html).not.toContain('href=');
});

it('links eligible accounts to workspace setup without a source profile', () => {
  const html = renderToStaticMarkup(<ProfileMenu {...props} />);
  expect(html).toContain('href="/onboarding?workspace=new"');
  expect(html).not.toContain('lucide-crown');
});

it('keeps profile switching available when the personal plan limits workspace creation', () => {
  const html = renderToStaticMarkup(<ProfileMenu {...props} canCreate={false} />);
  expect(html).toContain('data-profile-id="profile-1"');
  expect(html).not.toContain('href=');
});
