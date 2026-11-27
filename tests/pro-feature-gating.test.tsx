import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnnouncementForm } from '../src/components/editors';
import { defaultSchedule } from '../src/lib/domain';

const draft = defaultSchedule('Test business');
const props = {
  draft,
  savedWidget: draft.widget,
  onSubmit: () => {},
  onCancel: () => {},
};

it('shows crowns only while Pro announcement scheduling is unavailable', () => {
  const free = renderToStaticMarkup(<AnnouncementForm {...props} paid={false} />);
  expect(free.match(/lucide-crown/g)).toHaveLength(2);
  expect(free.match(/type="datetime-local"[^>]*disabled=""/g)).toHaveLength(2);

  const pro = renderToStaticMarkup(<AnnouncementForm {...props} paid />);
  expect(pro).not.toContain('lucide-crown');
  expect(pro).not.toMatch(/type="datetime-local"[^>]*disabled=""/);
});
