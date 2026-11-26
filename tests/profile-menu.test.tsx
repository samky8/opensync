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
  const html = renderToStaticMarkup(<ProfileMenu {...props} paid={false} />);
  expect(html).toContain('disabled="" title="Requires Business"');
  expect(html).toContain('lucide-crown');
  expect(html).toContain('Create new workspace');
  expect(html).not.toContain('href=');
});

it('links Business accounts to fresh workspace setup from the selected profile', () => {
  const html = renderToStaticMarkup(<ProfileMenu {...props} paid />);
  expect(html).toContain('href="/onboarding?source=profile-1"');
  expect(html).not.toContain('lucide-crown');
});

it('keeps profile switching available for paid accounts without creation permission', () => {
  const html = renderToStaticMarkup(<ProfileMenu {...props} paid canCreate={false} />);
  expect(html).toContain('data-profile-id="profile-1"');
  expect(html).toContain('Only an owner or admin can create workspaces');
  expect(html).not.toContain('lucide-crown');
  expect(html).not.toContain('href=');
});
