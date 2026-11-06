'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import styles from './dashboard-overview.module.css';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  Clock,
  CalendarDays,
  Megaphone,
  Code2,
  Plug,
  History,
  Settings,
  HelpCircle,
  ChevronsUpDown,
  Plus,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Globe,
  Instagram,
  Facebook,
  Bell,
  Copy,
  LogOut,
  Menu,
  X,
  Sun,
  DoorOpen,
  PanelTop,
  Share2,
  MapPin,
  Store,
  ArrowDownToLine,
  RefreshCw,
  AlertCircle,
  Send,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { Button } from './ui/button';
import { ProfileMenu } from './profile-menu';
import { ProBadge } from './ui/pro-badge';
import { Widget, type WidgetType } from './widget';
import { SocialComposer } from './social-composer';
import { PublishWizard } from './publish-wizard';
import { scopedSchedule, publishScopes, type PublishScope } from '@/lib/publish-scope';
import { ProTrialCard } from './pro-trial';
import type { ProTrial } from '@/lib/trial';
import { AnnouncementForm, BusinessFields, ExceptionForm, WeeklyEditor } from './editors';
import {
  defaultSchedule,
  resetWidgetToDefaults,
  formatIntervals,
  getStatus,
  scheduleSchema,
  type Schedule,
  type Plan,
} from '@/lib/domain';
import { demoSchedule } from '@/lib/demo';
import { importGoogleHours } from '@/lib/google-import';
type Location = {
  id: string;
  organizationId: string;
  draft: Schedule;
  draftVersion: number;
  publishedVersion: number;
  onboardingStep: number;
};
const emptyLocations: Location[] = [];
type Job = {
  id: string;
  destination: string;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
};
type Detail = {
  location: Location;
  published: Schedule | null;
  trial: ProTrial;
  plan: Plan;
  role: string;
  connection: { status: string; remoteId: string | null } | null;
  history: { id: string; message: string; createdAt: string }[];
  jobs: Job[];
  notifications: { id: string; message: string; readAt: string | null }[];
  googleConfigured: boolean;
  billingConfigured: boolean;
};
const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'hours', label: 'Business hours', icon: Clock },
  { id: 'special', label: 'Holidays & exceptions', icon: CalendarDays },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'widgets', label: 'Add to your website', icon: Code2 },
  { id: 'social', label: 'Social posts', icon: Instagram },
  { id: 'integrations', label: 'Connections', icon: Plug },
  { id: 'activity', label: 'History', icon: History },
];
const titles: Record<string, [string, string]> = {
  overview: ['Overview', 'Manage your hours and updates.'],
  hours: ['Business hours', 'Set your regular weekly schedule.'],
  special: ['Holidays & exceptions', 'Set holiday hours and one-off closures.'],
  announcements: ['Announcements', 'Share updates on your website.'],
  widgets: ['Add to your website', 'Add your hours and updates to your website.'],
  social: ['Social posts', 'Create posts and stories for Instagram and Facebook.'],
  integrations: ['Connections', 'Manage your publishing channels.'],
  activity: ['History', 'Check published updates and sync results.'],
  settings: ['Business settings', 'Manage the selected business profile and team.'],
  account: ['Account settings', 'Manage your account and personal data.'],
  billing: ['Plans & billing', 'Manage your plan and subscription.'],
  notifications: ['Notifications', 'Updates that need your attention.'],
  help: ['Help', 'Find answers or contact support.'],
};
async function request(path: string, body: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not complete request');
  return result;
}
function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="modal-close icon-button" aria-label="Close dialog" onClick={onClose}>
        <X size={20} />
      </button>
      {children}
    </dialog>
  );
}
export function Dashboard({
  demo = false,
  sourceLocationId,
  initialLocations = emptyLocations,
  email = '',
  now: initialNow,
}: {
  demo?: boolean;
  sourceLocationId?: string;
  initialLocations?: Location[];
  email?: string;
  now: string;
}) {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>(initialLocations),
    [selected, setSelected] = useState(initialLocations[0]?.id || ''),
    [draft, setDraft] = useState<Schedule>(
      demo ? demoSchedule : initialLocations[0]?.draft || defaultSchedule(),
    ),
    [saved, setSaved] = useState<Schedule>(
      demo ? demoSchedule : initialLocations[0]?.draft || defaultSchedule(),
    ),
    [published, setPublished] = useState<Schedule>(demoSchedule),
    [version, setVersion] = useState(initialLocations[0]?.draftVersion || 1),
    [pubVersion, setPubVersion] = useState(demo ? 1 : initialLocations[0]?.publishedVersion || 0),
    [detail, setDetail] = useState<Detail | null>(null),
    [tab, setTab] = useState('overview'),
    [modal, setModal] = useState(''),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(''),
    [error, setError] = useState(''),
    [mobile, setMobile] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [demoTrial, setDemoTrial] = useState<ProTrial>({ status: 'available', endsAt: null }),
    [now, setNow] = useState(initialNow),
    [onboarding, setOnboarding] = useState(
      !demo && (!initialLocations.length || initialLocations[0].onboardingStep < 6),
    ),
    [step, setStep] = useState(initialLocations[0]?.onboardingStep || 1),
    [widgetType, setWidgetType] = useState<WidgetType>('hours'),
    [platform, setPlatform] = useState('Custom HTML'),
    [origin, setOrigin] = useState(''),
    [googleLocations, setGoogleLocations] = useState<
      {
        name: string;
        title: string;
        regularHours?: {
          periods?: {
            openDay: string;
            openTime: { hours?: number; minutes?: number };
            closeDay: string;
            closeTime: { hours?: number; minutes?: number };
          }[];
        };
        specialHours?: {
          specialHourPeriods?: {
            startDate: { year: number; month: number; day: number };
            endDate?: { year: number; month: number; day: number };
            closed?: boolean;
            openTime?: { hours?: number; minutes?: number };
            closeTime?: { hours?: number; minutes?: number };
          }[];
        };
      }[]
    >([]),
    [remote, setRemote] = useState(''),
    [demoHistory, setDemoHistory] = useState([
      {
        id: 'example',
        message: 'Example: published winter opening hours to website widgets',
        createdAt: initialNow,
      },
    ]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved),
    widgetPlanError = /widget customization requires Pro|custom branding requires Pro/i.test(error),
    publishedSchedule = demo ? (pubVersion ? published : null) : detail?.published,
    unpublished =
      (demo || !!detail) &&
      (!publishedSchedule ||
        JSON.stringify(scheduleSchema.parse(saved)) !==
          JSON.stringify(scheduleSchema.parse(publishedSchedule))),
    plan = demo ? 'pro' : detail?.plan || 'free';
  let status;
  try {
    status = getStatus(draft, new Date(now));
  } catch {
    status = getStatus(saved, new Date(now));
  }
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1),
    readonly = !demo && detail?.role === 'viewer';
  async function refresh(resetDraft = false) {
    if (demo) return;
    const res = await fetch(`/api/manage?id=${selected}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setDetail(data);
    if (resetDraft) {
      setDraft(data.location.draft);
      setSaved(data.location.draft);
      setVersion(data.location.draftVersion);
    }
    setPubVersion(data.location.publishedVersion);
    return data as Detail;
  }
  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      setSidebarCollapsed(localStorage.getItem('opensync-sidebar-collapsed') === 'true');
    } catch {
      /* Navigation works without saved preferences. */
    }
    if (!demo && !initialLocations.length)
      setDraft((value) => ({
        ...value,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }));
    const query = new URLSearchParams(window.location.search);
    if (query.get('tab') && titles[query.get('tab')!]) setTab(query.get('tab')!);
    if (!demo && initialLocations.some((item) => item.id === query.get('location')))
      setSelected(query.get('location')!);
    if (query.get('error')) setError(query.get('error')!);
    if (demo) {
      try {
        const stored = localStorage.getItem('opensync-demo-v1');
        if (stored) {
          const parsed = JSON.parse(stored),
            valid = scheduleSchema.parse(parsed.draft);
          setDraft(valid);
          setSaved(valid);
          setPublished(scheduleSchema.parse(parsed.published));
          setPubVersion(parsed.version ?? 1);
          setDemoHistory(parsed.history || []);
        }
      } catch {
        localStorage.removeItem('opensync-demo-v1');
      }
    }
  }, [demo, initialLocations]);
  useEffect(() => {
    const onBackOrForward = () => {
      const next = new URLSearchParams(window.location.search).get('tab') || 'overview';
      setTab(titles[next] ? next : 'overview');
      setMobile(false);
    };
    window.addEventListener('popstate', onBackOrForward);
    return () => window.removeEventListener('popstate', onBackOrForward);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobile(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobile]);
  useEffect(() => {
    if (selected && !demo) {
      let cancelled = false;
      fetch(`/api/manage?id=${selected}`, { cache: 'no-store' })
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          if (!cancelled) {
            setDetail(data);
            setDraft(data.location.draft);
            setSaved(data.location.draft);
            setVersion(data.location.draftVersion);
            setPubVersion(data.location.publishedVersion);
            setStep(data.location.onboardingStep);
            setOnboarding(data.location.onboardingStep < 6);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [selected, demo]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (
      demo ||
      detail?.trial?.status !== 'active' ||
      !detail.trial.endsAt ||
      Date.parse(detail.trial.endsAt) > Date.parse(now)
    )
      return;
    let cancelled = false;
    fetch(`/api/manage?id=${selected}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        /* Server-side entitlements still enforce expiry; retry on the next tick. */
      });
    return () => {
      cancelled = true;
    };
  }, [demo, detail?.trial?.status, detail?.trial?.endsAt, now, selected]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function notify(message: string) {
    setToast(message);
    setError('');
  }
  function resetWidget() {
    setDraft((current) => resetWidgetToDefaults(current));
    notify('Widget reset to Free defaults. Save or publish to apply.');
  }
  function persistDemo(d: Schedule, p = published, v = pubVersion, h = demoHistory) {
    localStorage.setItem(
      'opensync-demo-v1',
      JSON.stringify({ draft: d, published: p, version: v, history: h }),
    );
  }
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(d = draft, nextStep = step) {
    const result = scheduleSchema.safeParse(d);
    if (!result.success) throw new Error(result.error.issues.map((x) => x.message).join('. '));
    if (demo) {
      persistDemo(d);
      setSaved(structuredClone(d));
      setVersion((v) => v + 1);
      setStep(nextStep);
      return version + 1;
    }
    const resultSave = await request('/api/manage', {
      op: 'save',
      id: selected,
      draft: d,
      version,
      step: nextStep,
    });
    setSaved(d);
    setLocations((current) =>
      current.map((location) => (location.id === selected ? resultSave.location : location)),
    );
    setVersion(resultSave.location.draftVersion);
    setStep(nextStep);
    return resultSave.location.draftVersion as number;
  }
  const [publishScope, setPublishScope] = useState<PublishScope>('all');
  function openPublish(scope?: string) {
    const pageScope = scope ?? new URLSearchParams(window.location.search).get('tab') ?? tab;
    setPublishScope(
      publishScopes.includes(pageScope as PublishScope) ? (pageScope as PublishScope) : 'all',
    );
    setModal('publish');
  }
  async function publish(includeGoogle: boolean) {
    const v = dirty ? await save() : version;
    if (demo) {
      const history = [
        {
          id: crypto.randomUUID(),
          message: `Published demo revision ${pubVersion + 1} to the local preview`,
          createdAt: new Date().toISOString(),
        },
        ...demoHistory,
      ];
      const snapshot = scopedSchedule(draft, published, publishScope);
      setPublished(structuredClone(snapshot));
      setPubVersion(pubVersion + 1);
      setDemoHistory(history);
      persistDemo(draft, snapshot, pubVersion + 1, history);
      await new Promise((resolve) => setTimeout(resolve, 450));
    } else {
      const key =
        sessionStorage.getItem(
          `publish-${selected}-${v}-${pubVersion}-${publishScope}-${includeGoogle}`,
        ) || crypto.randomUUID();
      sessionStorage.setItem(
        `publish-${selected}-${v}-${pubVersion}-${publishScope}-${includeGoogle}`,
        key,
      );
      await request('/api/manage', {
        op: 'publish',
        id: selected,
        version: v,
        key,
        scope: publishScope,
        google: includeGoogle,
        publishedVersion: pubVersion,
      });
      await refresh(true);
      sessionStorage.removeItem(
        `publish-${selected}-${v}-${pubVersion}-${publishScope}-${includeGoogle}`,
      );
    }
    setOnboarding(false);
    notify(
      demo
        ? 'Demo published. Your local widget preview is up to date.'
        : 'Published to website widgets. Check History for destination outcomes.',
    );
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify('Copied to clipboard');
    } catch {
      setError('Clipboard unavailable. Select the code and copy it manually.');
    }
  }
  function switchTab(next: string) {
    if (demo) setOnboarding(false);
    if (next !== tab) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', next);
      window.history.pushState(null, '', url);
    }
    setTab(next);
    setMobile(false);
  }
  function startDemoOnboarding() {
    if (!demo) return;
    const fresh = defaultSchedule(
      'Your business',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    persistDemo(fresh, fresh, 0, []);
    setDraft(fresh);
    setSaved(structuredClone(fresh));
    setPublished(structuredClone(fresh));
    setVersion(1);
    setPubVersion(0);
    setDemoHistory([]);
    setDemoTrial({ status: 'available', endsAt: null });
    setWidgetType('hours');
    setPlatform('Custom HTML');
    setModal('');
    setError('');
    setToast('');
    switchTab('overview');
    setStep(1);
    setOnboarding(true);
  }
  async function claimTrial(): Promise<ProTrial> {
    if (demo) {
      const trial: ProTrial = {
        status: 'active',
        endsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      };
      setDemoTrial(trial);
      return trial;
    }
    const result = await request('/api/trial', { id: selected });
    setDetail((current) =>
      current?.location.id === selected
        ? { ...current, plan: result.plan, trial: result.trial }
        : current,
    );
    return result.trial;
  }
  const snippet = `<div data-opensync="${selected || 'YOUR_LOCATION_ID'}" data-type="${widgetType}"></div>\n<script src="${origin}/embed.js" defer></script>`;
  async function connect() {
    if (demo) {
      notify('Demo only. Create an account to connect a real business.');
      return;
    }
    await act(async () => {
      const result = await request('/api/google/connect', { id: selected });
      window.location.href = result.url;
    });
  }
  async function billing(tier: string, portal = false) {
    if (demo) {
      notify('Billing is disabled in the demo. No payment will be taken.');
      return;
    }
    await act(async () => {
      const result = await request('/api/billing', { id: selected, plan: tier, portal });
      window.location.href = result.url;
    });
  }
  const upcoming = draft.exceptions
    .filter((e) => e.end >= status.date)
    .sort((a, b) => a.start.localeCompare(b.start));
  const history = demo ? demoHistory : detail?.history || [];
  const localHour = Number(
    new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: draft.timezone,
    }).format(new Date(now)),
  );
  const greeting =
    localHour < 12 ? 'Good morning' : localHour < 18 ? 'Good afternoon' : 'Good evening';
  const overviewChannels = [
    {
      label: 'Website hours',
      icon: Globe,
      tab: 'widgets',
      state: pubVersion ? 'Published' : 'Not published',
      ready: !!pubVersion,
    },
    {
      label: 'Website announcement',
      icon: PanelTop,
      tab: 'widgets',
      state: pubVersion ? 'Published' : 'Not published',
      ready: !!pubVersion,
    },
    {
      label: 'Facebook / Instagram',
      icon: Share2,
      tab: 'social',
      state: 'Open studio',
      ready: false,
    },
    {
      label: 'Google Business Profile',
      icon: MapPin,
      tab: 'integrations',
      state:
        detail?.connection?.status === 'connected'
          ? 'Sync paused'
          : detail?.googleConfigured
            ? 'Connect'
            : 'Unavailable',
      ready: false,
    },
  ];
  const goPublish = (value: Schedule) => {
    setDraft(value);
    openPublish(
      modal.startsWith('announcement:') || modal === 'Post announcement'
        ? 'announcements'
        : 'special',
    );
  };
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside
        id="dashboard-sidebar"
        aria-label="Sidebar"
        className={`sidebar ${mobile ? 'mobile-open' : ''}`}
      >
        <Link href="/" className="brand" aria-label="OpenSync home">
          <span className="brand-mark">o</span>
          <span className="sidebar-brand-name">
            OpenSync<span className="brand-dot">.</span>
          </span>
        </Link>
        <button
          className="sidebar-toggle"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="dashboard-sidebar"
          onClick={() => {
            const collapsed = !sidebarCollapsed;
            setSidebarCollapsed(collapsed);
            try {
              localStorage.setItem('opensync-sidebar-collapsed', String(collapsed));
            } catch {
              /* Optional preference. */
            }
          }}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span className="sidebar-text">Collapse menu</span>
        </button>
        <button
          className="sidebar-mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <ProfileMenu
          name={draft.name}
          logo={draft.logo}
          locations={locations}
          selected={selected}
          paid={plan !== 'free'}
          disabled={busy}
          canCreate={demo || detail?.role === 'owner' || detail?.role === 'admin'}
          demo={demo}
          onSelect={(id) => {
            if (
              id !== selected &&
              (!dirty || confirm('Discard unsaved changes and switch location?'))
            ) {
              setDetail(null);
              const next = locations.find((location) => location.id === id);
              if (next) {
                setDraft(next.draft);
                setSaved(next.draft);
              }
              setSelected(id);
            }
          }}
          onCreate={() => !dirty || confirm('Discard unsaved changes and create a new profile?')}
        />
        {[
          { label: 'Overview', items: navigation.slice(0, 1), hideLabel: true },
          { label: 'Publishing', items: navigation.slice(1, 4) },
          { label: 'Connections & setup', items: navigation.slice(4) },
        ].map((group) => (
          <div className="nav-group" key={group.label}>
            {!group.hideLabel && <div className="nav-label">{group.label}</div>}
            <nav aria-label={group.label}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={!onboarding && tab === item.id ? 'page' : undefined}
                  className={`${!onboarding && tab === item.id ? 'active' : ''} nav-${item.id}`}
                  onClick={() => switchTab(item.id)}
                >
                  <item.icon size={18} />
                  <span className="sidebar-text">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        ))}
        {demo && (
          <div className="nav-group">
            <nav aria-label="Demo">
              <button
                aria-label="Onboarding"
                title="Onboarding"
                aria-current={onboarding ? 'page' : undefined}
                className={onboarding ? 'active' : ''}
                disabled={busy}
                onClick={startDemoOnboarding}
              >
                <Store size={18} />
                <span className="sidebar-text">Onboarding</span>
              </button>
            </nav>
          </div>
        )}
        <div className="sidebar-bottom">
          <nav aria-label="Account">
            <button
              aria-label="Plans & billing"
              title="Plans & billing"
              aria-current={tab === 'billing' ? 'page' : undefined}
              className={tab === 'billing' ? 'active' : ''}
              onClick={() => switchTab('billing')}
            >
              <CreditCard size={18} />
              <span className="sidebar-text">Plans & billing</span>
            </button>
            <button
              aria-label="Settings"
              title="Settings"
              aria-current={tab === 'settings' ? 'page' : undefined}
              className={tab === 'settings' ? 'active' : ''}
              onClick={() => switchTab('settings')}
            >
              <Settings size={18} />
              <span className="sidebar-text">Settings</span>
            </button>
            <button
              aria-label="Help"
              title="Help"
              aria-current={tab === 'help' ? 'page' : undefined}
              className={tab === 'help' ? 'active' : ''}
              onClick={() => switchTab('help')}
            >
              <HelpCircle size={18} />
              <span className="sidebar-text">Help</span>
            </button>
          </nav>
          <button
            aria-label="Account settings"
            title="Account settings"
            className="account-button"
            onClick={() => switchTab('account')}
          >
            <div className="account-avatar">
              {demo ? 'JD' : (email || 'You').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{demo ? 'Jamie Davis' : email || 'Your account'}</strong>
              <small>{demo ? 'Demo workspace' : `${planLabel} plan`}</small>
            </div>
            <ChevronsUpDown size={14} />
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="dashboard-sidebar"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={21} />
            </button>
            <Store size={15} />
            <span>{draft.name}</span>
            <ChevronRight size={13} />
            <strong>
              {onboarding
                ? 'Getting started'
                : navigation.find((x) => x.id === tab)?.label || titles[tab]?.[0]}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="local-clock">
              {new Intl.DateTimeFormat('en-CA', {
                timeZone: saved.timezone,
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(now))}
            </span>
            <button
              className="icon-button notification-bell"
              aria-label="Notifications"
              onClick={() => switchTab('notifications')}
            >
              <Bell size={19} />
              {detail?.notifications.some((n) => !n.readAt) && <i />}
            </button>
            <button
              className="mini-avatar"
              onClick={() => switchTab('account')}
              aria-label="Account settings"
            >
              {demo ? 'JD' : (email || 'Y').slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-ribbon">
            <span>
              <span className="demo-pill">DEMO</span> Take a look around. Changes stay in this
              browser.
            </span>
            <Link href="/signup">
              Make it yours <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <main className="dashboard-main" id="main-content">
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              {widgetPlanError && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || readonly}
                  onClick={resetWidget}
                >
                  <RotateCcw size={15} />
                  Reset to Free defaults
                </Button>
              )}
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {onboarding ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A FRESH START</span>
                  <h1>Let’s get your business in sync.</h1>
                  <p>Just the essentials. You can fine-tune everything later.</p>
                </div>
                <span className="pill">Step {step} of 6</span>
              </div>
              <div className="onboarding-progress">
                {[
                  'Welcome',
                  'Your business',
                  'Business hours',
                  'Google',
                  'Your website',
                  'Ready to go',
                ].map((label, i) => (
                  <div key={label} className={i + 1 <= step ? 'done' : ''}>
                    <span>{i + 1 < step ? <Check size={14} /> : i + 1}</span>
                    <small>{label}</small>
                  </div>
                ))}
              </div>
              <div className="onboarding-body">
                {step === 1 ? (
                  <div className="card welcome-card">
                    <span className="welcome-art">
                      <Store size={48} />
                    </span>
                    <h2>More time for what you opened for.</h2>
                    <p>
                      Add your business, set your hours, and bring your website up to date. Google
                      and website installation can wait until you’re ready.
                    </p>
                    <Button
                      onClick={() => {
                        setStep(2);
                      }}
                    >
                      Let’s get started <ArrowRight size={16} />
                    </Button>
                  </div>
                ) : step === 2 ? (
                  <div className="card padded">
                    <h2>Tell us about your business.</h2>
                    <BusinessFields
                      key={selected}
                      draft={draft}
                      onChange={setDraft}
                      disabled={busy || readonly}
                    />
                    <div className="modal-actions">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            if (!demo && !selected) {
                              const created = await request('/api/manage', {
                                op: 'create',
                                sourceLocationId,
                                name: draft.name,
                                timezone: draft.timezone,
                              });
                              const data = await request('/api/manage', {
                                op: 'save',
                                id: created.location.id,
                                draft,
                                version: created.location.draftVersion,
                                step: 3,
                              });
                              setLocations([...locations, data.location]);
                              setSelected(data.location.id);
                              setVersion(data.location.draftVersion);
                              setSaved(draft);
                            } else await save(draft, 3);
                            setStep(3);
                          })
                        }
                      >
                        Save & continue <ArrowRight size={16} />
                      </Button>
                    </div>
                  </div>
                ) : step === 3 ? (
                  <>
                    <WeeklyEditor draft={draft} onChange={setDraft} />
                    <div className="modal-actions">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await save(draft, 4);
                            setStep(4);
                          })
                        }
                      >
                        Save hours & continue <ArrowRight size={16} />
                      </Button>
                    </div>
                  </>
                ) : step === 4 ? (
                  <div className="card padded">
                    <div className="provider-icon blue">
                      <Globe />
                    </div>
                    <h2>Meet your customers on Google.</h2>
                    <p className="muted">
                      Automatic Google sync is paused. Connecting a profile requires Pro, approved
                      API access, and your authorization. You can connect later.
                    </p>
                    <div className="notice">
                      {detail?.googleConfigured
                        ? 'Google integration is configured. Upgrade to Pro to connect.'
                        : 'Google integration is not configured yet. Your website features will still work.'}
                    </div>
                    {detail?.googleConfigured && plan !== 'free' && (
                      <Button onClick={connect} disabled={busy}>
                        Connect Google
                      </Button>
                    )}
                    <div className="modal-actions">
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await save(draft, 5);
                          })
                        }
                      >
                        Skip for now
                      </Button>
                      <Button
                        onClick={() =>
                          act(async () => {
                            await save(draft, 5);
                            setStep(5);
                          })
                        }
                        disabled={busy}
                      >
                        Continue to website <ArrowRight size={16} />
                      </Button>
                    </div>
                  </div>
                ) : step === 5 ? (
                  <div className="two-columns">
                    <div className="card padded">
                      <h2>A small addition. Always up to date.</h2>
                      <p className="muted">
                        Copy this code into an HTML block on your website. The widget becomes
                        available after you publish.
                      </p>
                      <select
                        aria-label="Widget type"
                        value={widgetType}
                        onChange={(e) => setWidgetType(e.target.value as WidgetType)}
                      >
                        <option value="hours">Business hours</option>
                        <option value="banner">Announcement banner</option>
                        <option value="status">Status badge</option>
                      </select>
                      <pre className="code-block">{snippet}</pre>
                      <Button variant="outline" onClick={() => copy(snippet)}>
                        <Copy size={16} />
                        Copy embed code
                      </Button>
                      <div className="modal-actions">
                        <Button variant="ghost" onClick={() => setStep(6)}>
                          Skip for now
                        </Button>
                        <Button onClick={() => setStep(6)}>
                          Continue <ArrowRight size={16} />
                        </Button>
                      </div>
                    </div>
                    <Widget schedule={draft} type={widgetType} now={now} />
                  </div>
                ) : (
                  <div className="card welcome-card">
                    <span className="welcome-art">
                      <CheckCircle2 size={48} />
                    </span>
                    <h2>You’re ready for your first update.</h2>
                    <p>
                      Publish your hours to activate your public website widgets. Google is optional
                      and will only receive updates after connection.
                    </p>
                    <Button onClick={() => openPublish()}>
                      Review & publish <ArrowRight size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className={`page-heading ${tab === 'overview' ? styles.overviewHeading : ''}`}>
                {tab !== 'overview' && (
                  <div>
                    <h1>{titles[tab]?.[0]}</h1>
                    <p>{titles[tab]?.[1]}</p>
                  </div>
                )}
                {['overview', 'hours', 'special', 'announcements', 'widgets', 'settings'].includes(
                  tab,
                ) && (
                  <div className="heading-actions">
                    {dirty && (
                      <Button
                        variant="outline"
                        disabled={busy || readonly}
                        onClick={() =>
                          act(async () => {
                            await save();
                            notify('Draft saved. Publish when you’re ready.');
                          })
                        }
                      >
                        Save draft
                      </Button>
                    )}
                    <Button disabled={busy || readonly} onClick={() => openPublish()}>
                      <Send size={16} />
                      Publish changes
                    </Button>
                  </div>
                )}
              </div>
              {(dirty || unpublished) && (
                <div className="draft-notice">
                  <span className="status-dot orange" />
                  {dirty
                    ? 'Unsaved changes'
                    : pubVersion
                      ? 'Saved draft · not published'
                      : 'Not published yet'}
                  <span>
                    {pubVersion
                      ? 'Publish to update your website widgets.'
                      : 'Publish your hours to activate your widgets.'}
                  </span>
                </div>
              )}
              {tab === 'billing' && (demo || detail?.trial) && (
                <ProTrialCard
                  key={selected || 'demo'}
                  trial={demo ? demoTrial : detail!.trial}
                  canClaim={demo || detail?.role === 'owner'}
                  demo={demo}
                  onClaim={claimTrial}
                  onPlans={() => switchTab('billing')}
                />
              )}
              {tab === 'overview' && (
                <section className={styles.panel} aria-label="Business overview">
                  <header className={styles.header}>
                    <span className={styles.mark}>
                      <RefreshCw size={18} />
                    </span>
                    <div className={styles.identity}>
                      <strong>OpenSync</strong>
                      <span>{draft.name}</span>
                    </div>
                    <button
                      className={`${styles.badge} ${pubVersion ? styles.ready : ''}`}
                      onClick={() => switchTab('widgets')}
                    >
                      {pubVersion ? <CheckCircle2 size={13} /> : <Globe size={13} />}
                      {demo
                        ? 'Demo preview'
                        : !detail
                          ? 'Loading'
                          : pubVersion
                            ? 'Website published'
                            : 'Set up website'}
                    </button>
                  </header>
                  <div className={styles.greeting}>
                    <h1>
                      {greeting}
                      {demo ? ', Jamie' : ''} <Sun size={25} aria-hidden="true" />
                    </h1>
                    <p>Here&apos;s what&apos;s happening with your business today.</p>
                  </div>
                  <div className={styles.summaries}>
                    <section className={styles.summary}>
                      <span>
                        Business status{dirty || unpublished ? ' \u00b7 Draft preview' : ''}
                      </span>
                      <strong>
                        <CheckCircle2 size={16} className={status.open ? styles.open : ''} />
                        {status.open ? 'Open now' : 'Closed now'}
                      </strong>
                      <p>{status.nextLabel}</p>
                    </section>
                    <button className={styles.summary} onClick={() => switchTab('special')}>
                      <span>Next change</span>
                      <strong>
                        {upcoming[0]?.label ||
                          (upcoming.length ? 'Holidays & exceptions' : 'No upcoming changes')}
                      </strong>
                      <p>
                        {upcoming[0] ? (
                          <>
                            {formatIntervals(upcoming[0].intervals)} &middot;{' '}
                            {new Intl.DateTimeFormat('en', {
                              month: 'short',
                              day: 'numeric',
                              timeZone: 'UTC',
                            }).format(new Date(upcoming[0].start))}
                          </>
                        ) : (
                          'Your regular schedule applies'
                        )}
                      </p>
                    </button>
                  </div>
                  <section className={styles.actions}>
                    <h2>What would you like to do?</h2>
                    <div className={styles.actionGrid}>
                      <button onClick={() => switchTab('hours')} disabled={readonly}>
                        <Clock size={20} />
                        <span>Change hours</span>
                      </button>
                      <button onClick={() => setModal('Close early')} disabled={readonly}>
                        <DoorOpen size={20} />
                        <span>Close early</span>
                      </button>
                      <button onClick={() => setModal('Post announcement')} disabled={readonly}>
                        <Megaphone size={20} />
                        <span>Post an update</span>
                      </button>
                      <button onClick={() => setModal('Add special hours')} disabled={readonly}>
                        <CalendarDays size={20} />
                        <span>Holiday hours</span>
                      </button>
                    </div>
                  </section>
                  <section className={styles.channels}>
                    <div className={styles.sectionHeading}>
                      <h2>Where your updates appear</h2>
                      {demo && <span>Demo</span>}
                    </div>
                    {overviewChannels.map((channel) => (
                      <button
                        key={channel.label}
                        className={styles.channel}
                        onClick={() => switchTab(channel.tab)}
                      >
                        <channel.icon size={17} />
                        <span>{channel.label}</span>
                        <span className={`${styles.badge} ${channel.ready ? styles.ready : ''}`}>
                          {channel.state}
                        </span>
                      </button>
                    ))}
                  </section>
                  <button className={styles.activity} onClick={() => switchTab('activity')}>
                    <strong>
                      Recent activity <ChevronRight size={15} />
                    </strong>
                    <p>
                      {history[0] ? (
                        <>
                          <time>
                            {new Date(history[0].createdAt).toLocaleDateString('en-CA', {
                              timeZone: draft.timezone,
                            })}
                          </time>{' '}
                          &middot; {history[0].message}
                        </>
                      ) : (
                        'No published updates yet.'
                      )}
                    </p>
                  </button>
                  <p className={styles.footnote}>
                    {demo
                      ? 'Demo changes stay in this browser. Channel availability is shown above.'
                      : 'Published widgets appear on your website once installed.'}
                  </p>
                </section>
              )}
              {tab === 'hours' && (
                <WeeklyEditor
                  draft={draft}
                  onChange={setDraft}
                  onSpecialHours={() => switchTab('special')}
                />
              )}
              {tab === 'special' && (
                <section className="card">
                  <div className="card-heading">
                    <div>
                      <h3>Holidays & exceptions</h3>
                      <p>These take priority over your regular hours for the selected dates.</p>
                    </div>
                    <Button size="sm" onClick={() => setModal('Add special hours')}>
                      <Plus size={16} />
                      Add special hours
                    </Button>
                  </div>
                  {draft.exceptions.length ? (
                    draft.exceptions.map((e) => (
                      <div className="list-row" key={e.id}>
                        <span className="provider-icon orange">
                          <CalendarDays size={20} />
                        </span>
                        <div className="grow">
                          <strong>{e.label || 'Holidays & exceptions'}</strong>
                          <p>
                            {e.start}
                            {e.start !== e.end ? ` → ${e.end}` : ''} ·{' '}
                            {formatIntervals(e.intervals)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal(`exception:${e.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Remove this special-hours exception from your draft?'))
                              setDraft({
                                ...draft,
                                exceptions: draft.exceptions.filter((x) => x.id !== e.id),
                              });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <CalendarDays size={36} />
                      <h3>No special hours</h3>
                      <p>Add a holiday closure or a one-off change.</p>
                    </div>
                  )}
                </section>
              )}
              {tab === 'announcements' && (
                <div className="two-columns">
                  <section className="card">
                    <div className="card-heading">
                      <h3>Your announcements</h3>
                      <Button size="sm" onClick={() => setModal('Post announcement')}>
                        <Plus size={15} />
                        New
                      </Button>
                    </div>
                    {draft.announcements.length ? (
                      draft.announcements.map((a) => (
                        <div className="announcement-item" key={a.id}>
                          <div className="section-heading">
                            <span className="pill">
                              {!a.enabled
                                ? 'Disabled'
                                : a.end && Date.parse(a.end) <= Date.parse(now)
                                  ? 'Expired'
                                  : Date.parse(a.start) > Date.parse(now)
                                    ? 'Scheduled'
                                    : 'Active'}
                            </span>
                            <label className="check-label">
                              <input
                                type="checkbox"
                                checked={a.enabled}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    announcements: draft.announcements.map((x) =>
                                      x.id === a.id ? { ...x, enabled: e.target.checked } : x,
                                    ),
                                  })
                                }
                              />
                              Enabled
                            </label>
                          </div>
                          <h3>{a.title || 'Announcement'}</h3>
                          <p>{a.message}</p>
                          <small className="muted">
                            Starts{' '}
                            {new Date(a.start).toLocaleString('en-CA', {
                              timeZone: draft.timezone,
                            })}
                            {a.end
                              ? ` · Expires ${new Date(a.end).toLocaleString('en-CA', { timeZone: draft.timezone })}`
                              : ''}
                          </small>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModal(`announcement:${a.id}`)}
                          >
                            Edit announcement
                          </Button>
                          <button
                            className="text-link danger"
                            onClick={() => {
                              if (confirm('Remove this announcement from your draft?'))
                                setDraft({
                                  ...draft,
                                  announcements: draft.announcements.filter((x) => x.id !== a.id),
                                });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <Megaphone size={32} />
                        <h3>Something to share?</h3>
                        <p>Your customers will see your latest active announcement here.</p>
                      </div>
                    )}
                  </section>
                  <div className="preview-panel">
                    <span className="eyebrow">LIVE DRAFT PREVIEW</span>
                    <Widget schedule={draft} type="banner" now={now} />
                    {!status.announcement && (
                      <p className="muted">No active banner at the moment.</p>
                    )}
                    <small>
                      Expired banners automatically disappear. No browser or manual reset needed.
                    </small>
                  </div>
                </div>
              )}
              {tab === 'widgets' && (
                <div className="two-columns widget-config">
                  <div>
                    <section className="card padded">
                      <h3>
                        Widget appearance <ProBadge />
                      </h3>
                      <p className="muted">
                        Customise with Pro, or use the included Free defaults.
                      </p>
                      <div className="segmented">
                        {(['hours', 'banner', 'status'] as WidgetType[]).map((t) => (
                          <button
                            key={t}
                            className={widgetType === t ? 'selected' : ''}
                            onClick={() => setWidgetType(t)}
                          >
                            {t === 'hours' ? 'Hours' : t === 'banner' ? 'Banner' : 'Status'}
                          </button>
                        ))}
                      </div>
                      <div className="form-grid">
                        <label>
                          <span className="pro-field-label">
                            Accent colour <ProBadge />
                          </span>
                          <input
                            type="color"
                            value={draft.widget.accent}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                widget: { ...draft.widget, accent: e.target.value },
                              })
                            }
                          />
                        </label>
                        <label>
                          <span className="pro-field-label">
                            Appearance <ProBadge />
                          </span>
                          <select
                            value={draft.widget.theme}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                widget: {
                                  ...draft.widget,
                                  theme: e.target.value as 'light' | 'dark',
                                },
                              })
                            }
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                          </select>
                        </label>
                        <label>
                          <span className="pro-field-label">
                            Typography <ProBadge />
                          </span>
                          <select
                            value={draft.widget.font}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                widget: {
                                  ...draft.widget,
                                  font: e.target.value as 'system' | 'serif',
                                },
                              })
                            }
                          >
                            <option value="system">Modern sans</option>
                            <option value="serif">Classic serif</option>
                          </select>
                        </label>
                        <label>
                          <span className="pro-field-label">
                            Corner radius <ProBadge />
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={32}
                            value={draft.widget.radius}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                widget: { ...draft.widget, radius: Number(e.target.value) },
                              })
                            }
                          />
                        </label>
                        <label>
                          <span className="pro-field-label">
                            Alignment <ProBadge />
                          </span>
                          <select
                            value={draft.widget.alignment}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                widget: {
                                  ...draft.widget,
                                  alignment: e.target.value as 'left' | 'center',
                                },
                              })
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Centre</option>
                          </select>
                        </label>
                        <label>
                          <span className="pro-field-label">
                            Layout <ProBadge />
                          </span>
                          <select
                            value={draft.widget.compact ? 'compact' : 'full'}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                widget: { ...draft.widget, compact: e.target.value === 'compact' },
                              })
                            }
                          >
                            <option value="full">Full</option>
                            <option value="compact">Compact</option>
                          </select>
                        </label>
                      </div>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={draft.widget.showName}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              widget: { ...draft.widget, showName: e.target.checked },
                            })
                          }
                        />
                        Show business name <ProBadge />
                      </label>
                      <Button
                        className="widget-reset"
                        variant="outline"
                        size="sm"
                        disabled={busy || readonly}
                        onClick={resetWidget}
                      >
                        <RotateCcw size={15} />
                        Reset to Free defaults
                      </Button>
                      {plan === 'free' && (
                        <p className="notice">
                          Custom branding requires Pro. All three standard widgets are included in
                          Free.
                        </p>
                      )}
                    </section>
                    <section className="card padded installation">
                      <h3>Make it part of your website.</h3>
                      <label>
                        Website platform
                        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                          {['Custom HTML', 'WordPress', 'Wix', 'Squarespace', 'Shopify'].map(
                            (p) => (
                              <option key={p}>{p}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <p className="muted">
                        {platform === 'WordPress'
                          ? 'Add a Custom HTML block to a page or widget area.'
                          : platform === 'Wix'
                            ? 'Use Embed Code → Embed HTML. Some plans restrict custom scripts; use the iframe alternative below.'
                            : platform === 'Squarespace'
                              ? 'Add a Code block with HTML enabled (plan-dependent).'
                              : platform === 'Shopify'
                                ? 'Add a Custom Liquid section in your theme editor.'
                                : 'Paste this snippet where you want the widget to appear.'}
                      </p>
                      <pre className="code-block">{snippet}</pre>
                      <Button
                        variant="outline"
                        onClick={() =>
                          demo
                            ? notify(
                                'Demo snippets are examples. Create a business to get your working location ID.',
                              )
                            : copy(snippet)
                        }
                      >
                        <Copy size={16} />
                        Copy embed code
                      </Button>
                      <details>
                        <summary>Iframe alternative & strict website policies</summary>
                        <pre className="code-block">{`<iframe src="${origin}/embed/${selected || 'YOUR_LOCATION_ID'}?type=${widgetType}" title="Business hours" style="width:100%;height:590px;border:0" loading="lazy"></iframe>`}</pre>
                        <p className="muted">
                          Allow {origin} in your site’s frame-src and script-src policies. For a top
                          banner, install above your header. For floating placement, put the embed
                          container in your site’s fixed-position element.
                        </p>
                      </details>
                      {!demo && pubVersion > 0 && (
                        <a
                          className="text-link"
                          href={`/embed/${selected}?type=${widgetType}`}
                          target="_blank"
                          rel="noopener"
                        >
                          Test published widget <ExternalLink size={14} />
                        </a>
                      )}
                      <small className="muted">
                        Published endpoint availability does not verify installation on another
                        website.
                      </small>
                    </section>
                  </div>
                  <div className="preview-panel sticky">
                    <span className="eyebrow">YOUR WIDGET · DRAFT PREVIEW</span>
                    <div className="browser-preview">
                      <div className="browser-chrome">
                        <i />
                        <i />
                        <i />
                        <span>yourwebsite.com</span>
                      </div>
                      <div className="preview-body">
                        <Widget schedule={draft} type={widgetType} now={now} />
                        {widgetType === 'banner' && !status.announcement && (
                          <p className="muted">
                            Add an active announcement to preview your banner.
                          </p>
                        )}
                      </div>
                    </div>
                    <small>
                      Preview updates as you edit. Your live website updates when you publish.
                    </small>
                    {publishedSchedule && (
                      <details className="published-demo">
                        <summary>
                          {demo ? 'View last published demo' : 'View published version'}
                        </summary>
                        <Widget schedule={publishedSchedule} type={widgetType} now={now} />
                      </details>
                    )}
                  </div>
                </div>
              )}
              {tab === 'integrations' && (
                <>
                  <div className="integration-grid">
                    <section className="card padded">
                      <div className="section-heading">
                        <span className="google-g">G</span>
                        <span className="pill">
                          <ProBadge /> Pro
                        </span>
                      </div>
                      <h2>Google Business Profile</h2>
                      <p className="muted">
                        Automatic Google updates are paused. You can still manage your website
                        widgets and create social content.
                      </p>
                      <div className="notice">
                        {detail?.connection?.status === 'connected'
                          ? 'Account connected. Automatic sync is paused; queued hours will not be delivered until a scheduler is enabled.'
                          : detail?.googleConfigured
                            ? 'Ready to connect with your Google account.'
                            : 'Setup required: Google credentials and approved Business Profile API access.'}
                      </div>
                      <Button
                        disabled={busy || (!demo && !detail?.googleConfigured)}
                        onClick={connect}
                      >
                        {detail?.connection ? 'Reconnect Google' : 'Connect Google'}
                        <ArrowUpRight size={16} />
                      </Button>
                      {detail?.connection && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() =>
                              act(async () => {
                                const r = await fetch(`/api/google/locations?id=${selected}`);
                                const data = await r.json();
                                if (!r.ok) throw new Error(data.error);
                                setGoogleLocations(data.locations);
                              })
                            }
                          >
                            Choose / compare location
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Disconnect Google and revoke this authorization?'))
                                void act(async () => {
                                  await request('/api/manage', { op: 'disconnect', id: selected });
                                  await refresh();
                                  notify('Google disconnected');
                                });
                            }}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                      {googleLocations.length > 0 && (
                        <div className="google-selection">
                          <label>
                            Google business location
                            <select value={remote} onChange={(e) => setRemote(e.target.value)}>
                              <option value="">Select a location</option>
                              {googleLocations.map((l) => (
                                <option key={l.name} value={l.name}>
                                  {l.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Button
                            disabled={!remote || busy}
                            onClick={() =>
                              act(async () => {
                                await request('/api/google/locations', {
                                  id: selected,
                                  remoteId: remote,
                                });
                                await refresh();
                                notify(
                                  'Google location connected. Review hours before publishing.',
                                );
                              })
                            }
                          >
                            Manage hours for this location
                          </Button>
                          <details>
                            <summary>Compare Google’s hours</summary>
                            <pre className="code-block">
                              {JSON.stringify(
                                googleLocations.find((l) => l.name === remote),
                                null,
                                2,
                              )}
                            </pre>
                            <p>
                              Local hours are shown in Business hours. Import replaces the local
                              weekly schedule and special hours in your draft only.
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const g = googleLocations.find((l) => l.name === remote);
                                if (
                                  !g ||
                                  !confirm(
                                    'Replace your draft weekly and special hours with the hours from this Google location?',
                                  )
                                )
                                  return;
                                let next: Schedule;
                                try {
                                  next = importGoogleHours(g, draft);
                                } catch {
                                  setError(
                                    'Google hours cannot be represented safely. Review and enter them manually.',
                                  );
                                  return;
                                }
                                setDraft(next);
                                switchTab('hours');
                                notify('Imported to draft. Review and publish when ready.');
                              }}
                            >
                              Confirm import to draft
                            </Button>
                          </details>
                        </div>
                      )}
                      <a
                        className="text-link"
                        href="https://business.google.com/"
                        target="_blank"
                        rel="noopener"
                      >
                        Manage manually on Google <ExternalLink size={14} />
                      </a>
                    </section>
                    <section className="card padded">
                      <span className="provider-icon violet">
                        <Code2 size={24} />
                      </span>
                      <h2>Your website</h2>
                      <p className="muted">
                        Your hours, status, and announcements. Three small additions that make a big
                        difference.
                      </p>
                      <div className="notice subtle">
                        {pubVersion
                          ? `Revision ${pubVersion} published. Copy an embed snippet to install.`
                          : 'No published hours yet. Publish your first update to activate your widgets.'}
                      </div>
                      <Button variant="outline" onClick={() => switchTab('widgets')}>
                        Add to your website <ArrowRight size={16} />
                      </Button>
                    </section>
                    <section className="card padded social-card">
                      <div className="section-heading">
                        <Instagram size={28} />
                        <Facebook size={28} />
                        <span className="pill">Ready to create</span>
                      </div>
                      <h2>Posts &amp; stories</h2>
                      <p className="muted">
                        Turn your hours or a custom announcement into an Instagram or Facebook
                        image. Publish to a connected account or download it to share yourself.
                      </p>
                      <Button variant="outline" onClick={() => switchTab('social')}>
                        Open Social posts <ArrowRight size={16} />
                      </Button>
                    </section>
                  </div>
                </>
              )}
              {tab === 'social' && (
                <SocialComposer
                  paid={plan !== 'free'}
                  key={selected || 'demo'}
                  schedule={draft}
                  locationId={demo ? 'demo' : selected}
                  demo={demo}
                  readonly={readonly}
                />
              )}
              {tab === 'activity' && (
                <>
                  <section className="card">
                    <div className="card-heading">
                      <h3>Publication outcomes</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await refresh();
                            notify('History refreshed');
                          })
                        }
                      >
                        <RefreshCw size={14} />
                        Refresh
                      </Button>
                    </div>
                    {detail?.jobs.length ? (
                      detail.jobs.map((j) => (
                        <div className="list-row" key={j.id}>
                          <span
                            className={`provider-icon ${['failed', 'retry'].includes(j.status) ? 'orange' : ['published', 'accepted'].includes(j.status) ? 'green' : 'blue'}`}
                          >
                            {['failed', 'retry'].includes(j.status) ? (
                              <AlertCircle size={18} />
                            ) : ['published', 'accepted'].includes(j.status) ? (
                              <Check size={18} />
                            ) : (
                              <Clock size={18} />
                            )}
                          </span>
                          <div className="grow">
                            <strong>
                              {j.destination === 'google'
                                ? 'Google Business Profile'
                                : 'Website widgets'}
                            </strong>
                            <p>
                              {j.status === 'accepted'
                                ? 'Request accepted. Public Google visibility not confirmed.'
                                : j.status === 'queued'
                                  ? 'Waiting to send'
                                  : j.status === 'retry'
                                    ? 'Delivery delayed. Will retry automatically.'
                                    : j.status === 'superseded'
                                      ? 'Replaced by a newer update'
                                      : j.status === 'failed'
                                        ? 'Delivery failed'
                                        : j.status === 'published'
                                          ? 'Published'
                                          : j.status}
                              {j.error ? ` · ${j.error}` : ''}
                            </p>
                            <small>
                              {j.attempts} attempts · {new Date(j.createdAt).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state small">
                        <p>
                          {demo
                            ? 'Demo publications update the local preview only.'
                            : 'Your publication results will appear here.'}
                        </p>
                      </div>
                    )}
                  </section>
                  <section className="card activity-full">
                    <div className="card-heading">
                      <h3>Workspace activity</h3>
                    </div>
                    {history.map((h) => (
                      <div className="activity-row" key={h.id}>
                        <History size={16} />
                        <span>{h.message}</span>
                        <time>{new Date(h.createdAt).toLocaleString()}</time>
                      </div>
                    ))}
                    {!history.length && <div className="empty-state small">No activity yet.</div>}
                  </section>
                </>
              )}
              {tab === 'notifications' && (
                <section className="card">
                  <div className="card-heading">
                    <h3>Notifications</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        act(async () => {
                          if (!demo) {
                            await request('/api/manage', { op: 'read', id: selected });
                            await refresh();
                          }
                          notify('All caught up');
                        })
                      }
                    >
                      Mark all as read
                    </Button>
                  </div>
                  {detail?.notifications.length ? (
                    detail.notifications.map((n) => (
                      <div className="list-row" key={n.id}>
                        <Bell size={18} />
                        <p>{n.message}</p>
                        <span className="pill">{n.readAt ? 'Read' : 'New'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <CheckCircle2 size={34} />
                      <h3>All quiet here.</h3>
                      <p>We’ll flag sync issues and subscription updates here.</p>
                    </div>
                  )}
                </section>
              )}
              {tab === 'billing' && (
                <>
                  <div className="notice">
                    {demo
                      ? 'Demo billing is disabled. Prices shown in Canadian dollars.'
                      : detail?.billingConfigured
                        ? `Your organization is on the ${planLabel} plan. Changes take effect after Stripe confirms your subscription.`
                        : 'Billing setup required. Stripe credentials and CAD price IDs must be configured before checkout is available.'}
                  </div>
                  <div className="pricing-grid">
                    {[
                      {
                        id: 'free',
                        name: 'Free',
                        price: 0,
                        copy: 'The everyday essentials.',
                        features: [
                          '1 business location',
                          'Weekly & special hours',
                          'All 3 website widgets',
                          'Basic announcements',
                        ],
                      },
                      {
                        id: 'pro',
                        name: 'Pro',
                        price: 9,
                        copy: 'A little more peace of mind.',
                        features: [
                          'Everything in Free',
                          'Google sync paused for now',
                          'Scheduled announcements & expiry',
                          'Custom widget branding',
                        ],
                      },
                      {
                        id: 'business',
                        name: 'Business',
                        price: 19,
                        copy: 'Room for your next chapter.',
                        features: [
                          'Everything in Pro',
                          'Multiple locations',
                          'Staff roles & access',
                          'Shared organization billing',
                        ],
                      },
                    ].map((p) => (
                      <div
                        className={`card price-card ${p.id === 'pro' ? 'featured' : ''}`}
                        key={p.id}
                      >
                        <span className="eyebrow">
                          {p.name} {p.id === 'pro' && <ProBadge />}
                        </span>
                        <h2>
                          ${p.price}
                          <small>CAD / month</small>
                        </h2>
                        <p>{p.copy}</p>
                        <ul>
                          {p.features.map((f) => (
                            <li key={f}>
                              {p.id === 'pro' && f !== 'Everything in Free' ? (
                                <ProBadge />
                              ) : (
                                <Check size={15} />
                              )}
                              {f}
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant={p.id === 'pro' ? 'default' : 'outline'}
                          disabled={
                            p.id === 'free' || (!demo && !detail?.billingConfigured) || busy
                          }
                          onClick={() => billing(p.id)}
                        >
                          {p.id === 'pro' && detail?.trial?.status === 'active'
                            ? 'Keep Pro after trial'
                            : plan === p.id
                              ? 'Manage plan'
                              : `Choose ${p.name}`}
                        </Button>
                      </div>
                    ))}
                  </div>
                  {!demo && detail?.billingConfigured && (
                    <Button variant="outline" onClick={() => billing(plan, true)}>
                      <CreditCard size={16} />
                      Open billing portal
                    </Button>
                  )}
                  <p className="muted">
                    Your data stays yours if your plan changes. Export is always available.
                  </p>
                </>
              )}
              {tab === 'settings' && (
                <div className="settings-grid">
                  <section className="card padded">
                    <h3>Business profile</h3>
                    <BusinessFields
                      key={selected}
                      draft={draft}
                      onChange={setDraft}
                      disabled={busy || readonly}
                    />
                    <div className="modal-actions">
                      <Button
                        disabled={busy || readonly}
                        onClick={() =>
                          act(async () => {
                            await save();
                            notify('Business profile saved to draft. Publish to update widgets.');
                          })
                        }
                      >
                        Save business details
                      </Button>
                    </div>
                  </section>
                  <section className="card padded">
                    <h3>Locations & team</h3>
                    <p className="muted">
                      Add locations with independent hours and time zones. Requires Pro.
                    </p>
                    <Button variant="outline" onClick={() => setModal('location')}>
                      <Plus size={15} />
                      Add a location
                    </Button>
                    <Button variant="ghost" onClick={() => setModal('team')}>
                      Add a staff member
                    </Button>
                  </section>
                </div>
              )}
              {tab === 'account' && (
                <section className="card padded">
                  <h3>Your account</h3>
                  <p className="muted">{demo ? 'Jamie Davis · Demo account' : email}</p>
                  <Button variant="outline" onClick={() => switchTab('billing')}>
                    Manage {planLabel} plan <ArrowUpRight size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (demo) {
                        router.push('/login');
                        return;
                      }
                      void act(async () => {
                        await request('/auth', { op: 'logout' });
                        router.push('/login');
                        router.refresh();
                      });
                    }}
                  >
                    <LogOut size={15} />
                    Log out
                  </Button>
                  <hr />
                  <h4>Export your data</h4>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (demo) {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(
                          new Blob([JSON.stringify({ demo: true, draft, published }, null, 2)], {
                            type: 'application/json',
                          }),
                        );
                        a.download = 'opensync-demo.json';
                        a.click();
                        URL.revokeObjectURL(a.href);
                      } else {
                        const a = document.createElement('a');
                        a.href = '/api/export';
                        a.download = 'opensync-export.json';
                        a.click();
                      }
                    }}
                  >
                    <ArrowDownToLine size={15} />
                    Export data
                  </Button>
                  {demo ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Reset this browser’s demo changes?')) {
                          localStorage.removeItem('opensync-demo-v1');
                          window.location.reload();
                        }
                      }}
                    >
                      Reset demo
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={() => setModal('delete')}>
                      Delete account
                    </Button>
                  )}
                </section>
              )}
              {tab === 'help' && (
                <section className="card padded help-card">
                  <h2>Common questions</h2>
                  {[
                    [
                      'How do I update today’s hours?',
                      'Choose Close early on Overview, or Holiday hours for other one-off changes. Edit the times, review affected destinations, and publish. This creates an exception without changing your usual week.',
                    ],
                    [
                      'How do I install a widget?',
                      'Open Add to your website, choose a type, and copy the embed snippet into an HTML block on your website. Publish your first revision before testing. Published updates appear within about 45 seconds.',
                    ],
                    [
                      'Why hasn’t Google changed yet?',
                      'Google needs approved API access, a connected location, and an eligible subscription. The worker retries transient errors. “Accepted” means Google accepted the request; it does not confirm that Search or Maps has refreshed.',
                    ],
                    [
                      'What happens when an announcement expires?',
                      'The public endpoint calculates active announcements on every request. The banner disappears after its expiry even if you close your browser. The previous active announcement may show if its own active period still applies.',
                    ],
                    [
                      'Can I leave the service?',
                      'Yes. Export your data in Account settings at any time. Cancel a paid subscription through the billing portal before deleting your account.',
                    ],
                  ].map(([q, a]) => (
                    <details key={q}>
                      <summary>{q}</summary>
                      <p>{a}</p>
                    </details>
                  ))}
                  <h3>Need a hand?</h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget,
                        message = String(new FormData(form).get('message'));
                      void act(async () => {
                        if (demo) {
                          notify('Demo only. Sign in to submit a support request.');
                          return;
                        }
                        await request('/api/manage', { op: 'support', message });
                        form.reset();
                        notify('Your support request has been saved.');
                      });
                    }}
                  >
                    <label>
                      What can we help with?
                      <textarea
                        name="message"
                        minLength={10}
                        maxLength={3000}
                        required
                        placeholder="Tell us what’s happening…"
                      />
                    </label>
                    <Button disabled={busy}>
                      Send support request <ArrowRight size={16} />
                    </Button>
                  </form>
                </section>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>© {new Date(now).getFullYear()} OpenSync</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <button onClick={() => switchTab('help')}>Need a hand?</button>
          </div>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <Modal
          onClose={() => {
            if (!busy) setModal('');
          }}
        >
          {[
            'Close early',
            'Open late',
            'Closed today',
            'Add special hours',
            'Change today’s hours',
          ].includes(modal) || modal.startsWith('exception:') ? (
            <ExceptionForm
              draft={draft}
              kind={modal.startsWith('exception:') ? 'Edit special hours' : modal}
              existing={draft.exceptions.find((e) => `exception:${e.id}` === modal)}
              onSubmit={goPublish}
              onCancel={() => setModal('')}
            />
          ) : modal === 'Post announcement' || modal.startsWith('announcement:') ? (
            <AnnouncementForm
              draft={draft}
              existing={draft.announcements.find((a) => `announcement:${a.id}` === modal)}
              onSubmit={goPublish}
              onCancel={() => setModal('')}
            />
          ) : modal === 'publish' ? (
            <PublishWizard
              draft={draft}
              published={publishedSchedule}
              scope={publishScope}
              locationId={demo ? 'demo' : selected}
              demo={demo}
              readonly={readonly}
              google={
                !demo &&
                ['hours', 'special', 'all'].includes(publishScope) &&
                detail?.connection?.status === 'connected' &&
                !!detail.connection.remoteId &&
                plan !== 'free'
              }
              onPublish={publish}
              onClose={() => setModal('')}
              onBusy={setBusy}
              error={error}
              onResetWidget={widgetPlanError ? resetWidget : undefined}
            />
          ) : modal === 'location' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void act(async () => {
                  if (demo) {
                    notify('Multiple real locations are available on Pro.');
                    setModal('');
                    return;
                  }
                  const result = await request('/api/manage', {
                    op: 'create',
                    name: data.get('name'),
                    timezone: data.get('timezone'),
                    sourceLocationId: selected,
                  });
                  setLocations([...locations, result.location]);
                  setSelected(result.location.id);
                  setOnboarding(true);
                  setModal('');
                });
              }}
            >
              <h2>Add a location</h2>
              <label>
                Business name
                <input name="name" required maxLength={100} />
              </label>
              <label>
                Time zone
                <input name="timezone" required defaultValue={draft.timezone} />
              </label>
              {error && <p className="form-error">{error}</p>}
              <Button disabled={busy}>Add location</Button>
            </form>
          ) : modal === 'team' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void act(async () => {
                  if (demo) {
                    notify('Staff access requires a real Business account.');
                    setModal('');
                    return;
                  }
                  await request('/api/manage', {
                    op: 'team',
                    id: selected,
                    email: data.get('email'),
                    role: data.get('role'),
                  });
                  notify('Staff access saved');
                  setModal('');
                });
              }}
            >
              <h2>Add a staff member</h2>
              <p className="muted">
                The staff member must first sign up and verify their email. Business owners can
                grant access here.
              </p>
              <label>
                Staff email
                <input name="email" type="email" required />
              </label>
              <label>
                Role
                <select name="role">
                  <option value="editor">Editor — update and publish</option>
                  <option value="viewer">Viewer — read only</option>
                  <option value="admin">Admin — manage locations</option>
                </select>
              </label>
              {error && <p className="form-error">{error}</p>}
              <Button disabled={busy}>Grant access</Button>
            </form>
          ) : modal === 'delete' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const confirmation = new FormData(e.currentTarget).get('confirmation');
                void act(async () => {
                  await request('/api/manage', { op: 'delete', confirmation });
                  await request('/auth', { op: 'logout' });
                  router.push('/');
                  router.refresh();
                });
              }}
            >
              <h2>Delete your account?</h2>
              <p>
                Your owned organizations, locations, publications, and embeds will be permanently
                removed. Export your data first. Active subscriptions must be cancelled before
                deletion.
              </p>
              <label>
                Type DELETE to confirm
                <input name="confirmation" pattern="DELETE" required />
              </label>
              {error && <p className="form-error">{error}</p>}
              <Button variant="destructive" disabled={busy}>
                Permanently delete account
              </Button>
            </form>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
