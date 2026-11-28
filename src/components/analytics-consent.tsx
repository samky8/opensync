'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from './ui/button';
import styles from './analytics-consent.module.css';

const preferenceKey = 'opensync-analytics-consent-v1';
const preferenceChanged = 'opensync-analytics-consent-change';
type Choice = 'accepted' | 'declined';
let inMemoryChoice: Choice | undefined;
type GoogleWindow = Window & { dataLayer?: unknown[] };

function readChoice() {
  if (inMemoryChoice) return inMemoryChoice;
  try {
    const value = localStorage.getItem(preferenceKey);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === preferenceKey || event.key === null) {
      inMemoryChoice = undefined;
      callback();
    }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(preferenceChanged, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(preferenceChanged, callback);
  };
}

function clearAnalyticsCookies(measurementId: string) {
  for (const name of ['_ga', `_ga_${measurementId.slice(2)}`]) {
    const expired = `${name}=; Max-Age=0; Path=/`;
    document.cookie = expired;
    const host = window.location.hostname.split('.');
    for (let index = 0; index < host.length - 1; index++)
      document.cookie = `${expired}; Domain=${host.slice(index).join('.')}`;
  }
}

// Google reads queued tag commands as arguments objects.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(...command: unknown[]) {
  const browser = window as GoogleWindow;
  // eslint-disable-next-line prefer-rest-params
  (browser.dataLayer ??= []).push(arguments);
}

export function AnalyticsConsent({
  measurementId,
  publicPaths,
}: {
  measurementId: string;
  publicPaths: string[];
}) {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribe, readChoice, () => null);
  const topLevel = useSyncExternalStore(subscribe, () => window.self === window.top, () => false);
  const [managing, setManaging] = useState(false);
  const declineButton = useRef<HTMLButtonElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const configured = useRef(false);
  const lastPage = useRef<string | null>(null);
  const eligible = topLevel && publicPaths.includes(pathname);

  useEffect(() => {
    if (!eligible || choice !== 'accepted') {
      lastPage.current = null;
      return;
    }
    const disableFlag = `ga-disable-${measurementId}`;
    Reflect.set(window, disableFlag, false);
    const adConsent = {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    };
    const pageLocation = new URL(pathname, window.location.origin).href;
    if (!configured.current) {
      gtag('consent', 'default', { ...adConsent, analytics_storage: 'denied' });
      gtag('consent', 'update', { ...adConsent, analytics_storage: 'granted' });
      gtag('js', new Date());
      gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: pageLocation,
        page_referrer: '',
      });
      const script = document.createElement('script');
      script.async = true;
      script.referrerPolicy = 'no-referrer';
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
      configured.current = true;
    }
    gtag('set', { page_location: pageLocation, page_referrer: '' });
    if (lastPage.current !== pathname) {
      gtag('event', 'page_view', {
        send_to: measurementId,
        page_location: pageLocation,
        page_referrer: '',
      });
      lastPage.current = pathname;
    }
    return () => {
      Reflect.set(window, disableFlag, true);
    };
  }, [choice, eligible, measurementId, pathname]);

  useEffect(() => {
    // Stop a previously loaded tag on withdrawal from this tab or another tab.
    if (choice === 'accepted' || !configured.current) return;
    clearAnalyticsCookies(measurementId);
    window.location.reload();
  }, [choice, measurementId]);

  function save(next: Choice) {
    if (next === 'declined') {
      Reflect.set(window, `ga-disable-${measurementId}`, true);
      clearAnalyticsCookies(measurementId);
    }
    inMemoryChoice = next;
    try {
      localStorage.setItem(preferenceKey, next);
    } catch {
      // Keep the choice for this document if browser storage is unavailable.
    }
    setManaging(false);
    window.dispatchEvent(new Event(preferenceChanged));
    if (managing) requestAnimationFrame(() => settingsButton.current?.focus());
  }

  useEffect(() => {
    if (managing) declineButton.current?.focus();
  }, [managing]);

  if (!eligible) return null;
  if (choice && !managing)
    return (
      <button
        ref={settingsButton}
        className={styles.settings}
        type="button"
        onClick={() => setManaging(true)}
      >
        Cookie settings
      </button>
    );

  return (
    <section className={styles.banner} aria-label="Analytics cookies">
      <div>
        <p className={styles.title}>Analytics cookies</p>
        <p>
          With your permission, OpenSync uses Google Analytics to count visits and understand how
          people use our public website. Google receives visit and browser information. You can
          change your choice anytime in Cookie settings. <Link href="/privacy">Privacy notice</Link>
        </p>
      </div>
      <div className={styles.actions}>
        <Button ref={declineButton} type="button" variant="outline" onClick={() => save('declined')}>
          Decline analytics
        </Button>
        <Button type="button" variant="outline" onClick={() => save('accepted')}>
          Accept analytics
        </Button>
      </div>
    </section>
  );
}
