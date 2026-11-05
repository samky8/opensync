'use client';

import { useState } from 'react';
import { Clock, Megaphone, Globe, Instagram, Facebook } from 'lucide-react';
import { SocialComposer } from './social-composer';
import type { Schedule } from '@/lib/domain';

export function PublishDestinations({
  schedule,
  locationId,
  demo,
  readonly,
  google,
  paid = false,
}: {
  schedule: Schedule;
  locationId: string;
  demo: boolean;
  readonly: boolean;
  google: boolean;
  paid?: boolean;
}) {
  const [social, setSocial] = useState({ Instagram: false, Facebook: false });
  return (
    <section className="publish-destinations" aria-labelledby="publish-destinations-heading">
      <h3 id="publish-destinations-heading">Where this update will go</h3>
      <p className="destination-help">
        Website widgets share one published version and update together.
      </p>
      <div className="publish-channel-list">
        {[
          {
            label: 'Website hours widget',
            detail: 'Regular and special opening hours',
            Icon: Clock,
          },
          { label: 'Announcement banner', detail: 'Enabled announcements', Icon: Megaphone },
          { label: 'Status badge', detail: 'Your current open / closed status', Icon: Globe },
        ].map(({ label, detail, Icon }) => (
          <label className="publish-channel" key={label}>
            <input type="checkbox" checked disabled />
            <span className="publish-channel-logo website">
              <Icon size={21} />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <span className="publish-channel-tag">Included</span>
          </label>
        ))}
        <label className="publish-channel">
          <input type="checkbox" checked={google} disabled />
          <span className="publish-channel-logo google" aria-hidden="true">
            <svg width="23" height="23" viewBox="0 0 48 48">
              <path
                fill="#4285f4"
                d="M43.6 24.5c0-1.5-.1-3-.4-4.5H24v8.5h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-15.2Z"
              />
              <path
                fill="#34a853"
                d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"
              />
              <path
                fill="#fbbc05"
                d="M12.6 27.7a12.2 12.2 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8Z"
              />
              <path
                fill="#ea4335"
                d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.1l6.8 5.2C14.2 15.5 18.7 11.9 24 11.9Z"
              />
            </svg>
          </span>
          <span>
            <strong>Google Business Profile</strong>
            <small>
              {google
                ? 'Regular and special hours · queued automatically'
                : demo
                  ? 'Not connected in demo'
                  : 'Not included · requires an eligible connected profile'}
            </small>
          </span>
        </label>
      </div>
      <h4>Social media</h4>
      <p className="destination-help">
        Preview your last saved design, or customize it below. Select a channel to review its
        account and publish the image separately. The Publish changes button updates your website
        {google ? ' and queues Google' : ''}.
      </p>
      <div className="publish-social-list">
        {(['Instagram', 'Facebook'] as const).map((platform) => {
          const Icon = platform === 'Instagram' ? Instagram : Facebook;
          return (
            <section className="publish-social-channel" key={platform}>
              <label className="publish-channel">
                <input
                  type="checkbox"
                  checked={social[platform]}
                  disabled={readonly}
                  onChange={(event) =>
                    setSocial((current) => ({ ...current, [platform]: event.target.checked }))
                  }
                />
                <span className={`publish-channel-logo ${platform.toLowerCase()}`}>
                  <Icon size={21} />
                </span>
                <span>
                  <strong>{platform}</strong>
                  <small>
                    {social[platform]
                      ? 'Review and publish below'
                      : 'Select to prepare a social post'}
                  </small>
                </span>
              </label>
              <SocialComposer
                paid={paid}
                schedule={schedule}
                locationId={locationId}
                demo={demo}
                readonly={readonly}
                compact
                selected={social[platform]}
                initialPlatform={platform}
              />
            </section>
          );
        })}
      </div>
      {demo && (
        <p className="destination-help">
          Demo mode: website changes update this browser’s preview only. Social images can be
          downloaded; nothing is posted to external services.
        </p>
      )}
    </section>
  );
}
