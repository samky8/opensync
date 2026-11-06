import { describe, expect, it } from 'vitest';
import { defaultSchedule, formatIntervals } from '../src/lib/domain';
import { publishChanges, scopedSchedule } from '../src/lib/publish-scope';
describe('page-specific publication', () => {
  it('publishes hours without including unrelated drafts', () => {
    const published = defaultSchedule('Cafe');
    const draft = structuredClone(published);
    draft.weekly[0] = [{ open: '10:00', close: '18:00' }];
    draft.name = 'Unpublished name';
    draft.exceptions = [
      { id: 'holiday', label: 'Holiday', start: '2026-12-25', end: '2026-12-25', intervals: [] },
    ];
    const snapshot = scopedSchedule(draft, published, 'hours');
    expect(snapshot.weekly).toEqual(draft.weekly);
    expect(snapshot.name).toBe(published.name);
    expect(snapshot.exceptions).toEqual([]);
    expect(publishChanges(draft, published, 'hours')).toEqual([
      {
        label: 'Monday',
        before: formatIntervals(published.weekly[0]),
        after: formatIntervals(draft.weekly[0]),
      },
    ]);
  });
  it('does not include unrelated content in first publication', () => {
    const draft = defaultSchedule('Cafe');
    draft.exceptions = [
      { id: 'a', label: 'Holiday', start: '2026-12-25', end: '2026-12-25', intervals: [] },
    ];
    expect(scopedSchedule(draft, null, 'hours').exceptions).toEqual([]);
    expect(scopedSchedule(draft, null, 'special').weekly).toEqual(
      Array.from({ length: 7 }, () => []),
    );
  });
  it('reviews removed special hours', () => {
    const published = defaultSchedule();
    published.exceptions = [
      { id: 'a', label: 'Holiday', start: '2026-12-25', end: '2026-12-25', intervals: [] },
    ];
    expect(publishChanges({ ...published, exceptions: [] }, published, 'special')[0]).toMatchObject(
      { after: '' },
    );
  });
});
