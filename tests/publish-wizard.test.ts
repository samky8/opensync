import { describe, expect, it } from 'vitest';
import { defaultSchedule } from '../src/lib/domain';
import { socialPublishCopy } from '../src/components/publish-wizard';

describe('publish wizard social copy', () => {
  it('maps an announcement title and message directly into the social design', () => {
    const draft = defaultSchedule('Juniper & Oak');
    draft.announcements = [
      {
        id: 'late',
        title: 'Open late tonight!',
        message: 'The kitchen is serving until 10 pm.',
        type: 'special hours',
        start: '2026-11-18T15:00:00Z',
        end: '',
        enabled: true,
        ctaText: '',
        ctaUrl: '',
      },
    ];

    expect(socialPublishCopy(draft, defaultSchedule('Juniper & Oak'), 'announcements', [])).toEqual(
      {
        title: 'Open late tonight!',
        message: 'The kitchen is serving until 10 pm.',
      },
    );
  });

  it('uses the default social title only when an announcement has no title', () => {
    const draft = defaultSchedule('Juniper & Oak');
    draft.announcements = [
      {
        id: 'late',
        title: '',
        message: 'The kitchen is serving until 10 pm.',
        type: 'special hours',
        start: '2026-11-18T15:00:00Z',
        end: '',
        enabled: true,
        ctaText: '',
        ctaUrl: '',
      },
    ];

    expect(socialPublishCopy(draft, null, 'announcements', [])).toMatchObject({
      title: 'An update from Juniper & Oak',
      message: 'The kitchen is serving until 10 pm.',
    });
  });
});
