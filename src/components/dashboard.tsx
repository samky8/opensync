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
  Plus,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Globe,
  Instagram,
  Palette,
  Bell,
  Copy,
  Sparkles,
  LogOut,
  Menu,
  X,
  DoorOpen,
  Store,
  ArrowDownToLine,
  RefreshCw,
  AlertCircle,
  Send,
  CreditCard,
  RotateCcw,
  Pencil,
  Trash2,
  UserRound,
  Monitor,
  Tablet,
  Smartphone,
  Paintbrush,
  LayoutGrid,
  ListChecks,
} from 'lucide-react';
import { Button } from './ui/button';
import { ProfileMenu } from './profile-menu';
import { ProBadge } from './ui/pro-badge';
import { Widget, type WidgetType } from './widget';
import { SocialComposer } from './social-composer';
import { SocialConnections } from './social-connections';
import { LogoUpload } from './logo-upload';
import { PublishWizard } from './publish-wizard';
import { TodayUpdate } from './today-update';
import {
  publishChanges,
  scopedSchedule,
  publishScopes,
  type PublishScope,
} from '@/lib/publish-scope';
import { ProTrialCard } from './pro-trial';
import type { ProTrial } from '@/lib/trial';
import { AnnouncementForm, BusinessFields, ExceptionForm, WeeklyEditor } from './editors';
import {
  defaultSchedule,
  customizeWidget,
  widgetAppearanceFor,
  resetWidgetToDefaults,
  formatIntervals,
  getStatus,
  localDate,
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
const sidebarSections = [
  {
    label: 'Home',
    showLabel: false,
    items: [{ id: 'overview', label: 'Home', icon: LayoutDashboard }],
  },
  {
    label: 'Manage',
    showLabel: true,
    items: [
      { id: 'schedule', label: 'Schedule', icon: CalendarDays },
      { id: 'announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    label: 'Customize',
    showLabel: true,
    items: [
      { id: 'widgets', label: 'Website widgets', icon: Code2 },
      { id: 'social', label: 'Social Studio', icon: Instagram },
    ],
  },
  {
    label: 'Publishing',
    showLabel: true,
    items: [
      { id: 'integrations', label: 'Connections', icon: Plug },
      { id: 'activity', label: 'Activity', icon: History },
    ],
  },
];
const scheduleNavigation = [
  { id: 'hours', label: 'Usual hours', icon: Clock },
  { id: 'special', label: 'One-time hours', icon: CalendarDays },
];
const settingsNavigation = [{ id: 'brand', label: 'Brand kit', icon: Palette }];
const navigation = [
  ...sidebarSections.flatMap((section) => section.items),
  ...scheduleNavigation,
  ...settingsNavigation,
];
const titles: Record<string, [string, string]> = {
  overview: ['Home', 'Manage your hours and updates.'],
  schedule: ['Schedule', 'View or change the hours customers see.'],
  hours: ['Regular hours', 'Set your regular weekly schedule.'],
  special: ['One-time hours', 'Set holiday hours and one-off closures.'],
  announcements: ['Announcements', 'Share updates on your website.'],
  widgets: ['Website widgets', 'Customize and preview your reusable website widgets.'],
  website: ['Add to your website', 'Install your OpenSync widgets on your website.'],
  social: ['Social Studio', 'Create posts and stories or save designs to reuse later.'],
  brand: ['Brand kit', 'Manage reusable identity defaults for widgets and social templates.'],
  integrations: ['Connections', 'Manage publishing destinations and account access.'],
  activity: ['Activity', 'Monitor publishing outcomes and synchronization events.'],
  settings: ['Business settings', 'Manage the selected business profile and team.'],
  account: ['Account settings', 'Manage your account and personal data.'],
  billing: ['Plans & billing', 'Manage your plan and subscription.'],
  notifications: ['Notifications', 'Updates that need your attention.'],
  help: ['Help', 'Find answers or contact support.'],
};
const titleIcons = {
  schedule: CalendarDays,
  hours: Clock,
  special: CalendarDays,
  announcements: Megaphone,
  widgets: Code2,
  website: Globe,
  social: Instagram,
  brand: Palette,
  integrations: Plug,
  activity: History,
  settings: Settings,
  account: UserRound,
  billing: CreditCard,
  notifications: Bell,
  help: HelpCircle,
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
function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal-wide' : ''}`}
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
    [widgetPreset, setWidgetPreset] = useState('modern'),
    [widgetStudioTab, setWidgetStudioTab] = useState<'appearance' | 'layout' | 'content'>(
      'appearance',
    ),
    [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop'),
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
    ]),
    [activityFilter, setActivityFilter] = useState('all'),
    [destinationFilter, setDestinationFilter] = useState('all');
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved),
    widgetPlanError = /widget customization requires Pro|custom branding requires Pro/i.test(error),
    publishedSchedule = demo ? (pubVersion ? published : null) : detail?.published,
    unpublished =
      (demo || !!detail) &&
      (!publishedSchedule ||
        JSON.stringify(scheduleSchema.parse(saved)) !==
          JSON.stringify(scheduleSchema.parse(publishedSchedule))),
    hoursHaveChanges = publishChanges(draft, publishedSchedule, 'hours').length > 0,
    plan = demo ? 'pro' : detail?.plan || 'free';
  let status;
  try {
    status = getStatus(draft, new Date(now));
  } catch {
    status = getStatus(saved, new Date(now));
  }
  const liveAnnouncement = publishedSchedule
      ? getStatus(publishedSchedule, new Date(now)).announcement
      : null,
    announcementDrafts = draft.announcements.filter(
      (announcement) =>
        !liveAnnouncement ||
        announcement.id !== liveAnnouncement.id ||
        JSON.stringify(announcement) !== JSON.stringify(liveAnnouncement),
    ),
    liveAnnouncementDraft = liveAnnouncement
      ? announcementDrafts.find((announcement) => announcement.id === liveAnnouncement.id)
      : undefined;
  const widgetSettings = widgetAppearanceFor(draft.widget, widgetType);
  const activeWidgetStudioTab =
    widgetType === 'banner' && widgetStudioTab === 'content' ? 'appearance' : widgetStudioTab;
  const widgetVisible = draft.widgetVisibility?.[widgetType] !== false;
  const widgetVisibilityLabels = {
    hours: 'Show business hours',
    banner: 'Show announcement banner',
    status: 'Show live status',
  };
  function updateWidgetAppearance(changes: Partial<typeof widgetSettings>) {
    setWidgetPreset('custom');
    setDraft((current) => ({
      ...current,
      widget: customizeWidget(current.widget, widgetType, changes),
    }));
  }
  function applyWidgetPreset(preset: 'modern' | 'minimal' | 'card' | 'dark') {
    const shared = {
      modern: { font: 'system', fontSize: 'auto', radius: 12, alignment: 'left' },
      minimal: { font: 'auto', fontSize: 'auto', radius: 4, alignment: 'left' },
      card: { font: 'system', fontSize: 'auto', radius: 14, alignment: 'left' },
      dark: { font: 'system', fontSize: 'auto', radius: 12, alignment: 'left' },
    }[preset] as Partial<typeof widgetSettings>;
    const settings =
      widgetType === 'banner'
        ? shared
        : ({
            ...shared,
            accent: preset === 'dark' ? '#a99cff' : '#6a56ff',
            theme: preset === 'dark' ? 'dark' : 'light',
            background: preset === 'card' ? '#ffffff' : 'auto',
            borderColour: preset === 'card' ? '#dfe1ec' : 'auto',
            borderWidth: preset === 'minimal' ? 0 : 1,
            compact: preset === 'minimal',
          } as Partial<typeof widgetSettings>);
    setWidgetPreset(preset);
    setDraft((current) => ({
      ...current,
      widget: customizeWidget(current.widget, widgetType, settings),
    }));
  }
  const showSampleBanner =
    tab === 'widgets' &&
    widgetType === 'banner' &&
    draft.widgetVisibility?.banner !== false &&
    !status.announcement;
  const previewSchedule = showSampleBanner
    ? {
        ...draft,
        announcements: [
          {
            ...demoSchedule.announcements[0],
            title: 'A quick update',
            message: 'Check our opening hours before your next visit.',
            start: now,
            end: '',
          },
        ],
      }
    : draft;
  const widgetPreview = tab === 'widgets' && (
    <div className="preview-panel sticky">
      <div className="widget-preview-heading">
        <span className="eyebrow">YOUR WIDGET · DRAFT PREVIEW</span>
        <div className="preview-device-switcher" role="group" aria-label="Preview size">
          {(
            [
              ['desktop', Monitor, 'Desktop'],
              ['tablet', Tablet, 'Tablet'],
              ['mobile', Smartphone, 'Mobile'],
            ] as const
          ).map(([device, Icon, label]) => (
            <button
              key={device}
              type="button"
              className={previewDevice === device ? 'active' : ''}
              aria-label={`Preview on ${label.toLowerCase()}`}
              aria-pressed={previewDevice === device}
              onClick={() => setPreviewDevice(device)}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (
              dirty &&
              !window.confirm(
                'You have unsaved widget changes. Continue to edit hours? Your changes will remain in this draft.',
              )
            )
              return;
            void switchTab('hours');
          }}
        >
          <Clock size={14} />
          Edit hours
        </Button>
      </div>
      <div className={`browser-preview preview-device-${previewDevice}`}>
        <div className="browser-chrome">
          <i />
          <i />
          <i />
          <span>yourwebsite.com</span>
        </div>
        <div className={`preview-body${widgetVisible ? '' : ' is-hidden'}`}>
          <Widget schedule={previewSchedule} type={widgetType} now={now} />
          {!widgetVisible && <p className="muted">Hidden after publishing.</p>}
        </div>
      </div>
      {publishedSchedule && (
        <details className="published-demo">
          <summary>{demo ? 'View last published demo' : 'View published version'}</summary>
          <Widget schedule={publishedSchedule} type={widgetType} now={now} />
        </details>
      )}
    </div>
  );
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
  const businessSave = useRef<Promise<void> | null>(null);
  async function autosaveBusiness(d = draft) {
    if (readonly) return;
    if (businessSave.current) {
      await businessSave.current;
      return;
    }
    const pending = save(d).then(() => undefined);
    businessSave.current = pending;
    try {
      await pending;
    } finally {
      if (businessSave.current === pending) businessSave.current = null;
    }
  }
  const [publishScope, setPublishScope] = useState<PublishScope>('all');
  const [todayUpdate, setTodayUpdate] = useState<{
    schedule: Schedule;
    date: string;
    intervals: ReturnType<typeof getStatus>['today'];
  }>();
  function openPublish(scope?: string) {
    const pageScope = scope ?? new URLSearchParams(window.location.search).get('tab') ?? tab;
    setPublishScope(
      publishScopes.includes(pageScope as PublishScope) ? (pageScope as PublishScope) : 'all',
    );
    setModal('publish');
  }
  async function publish(includeGoogle: boolean, value = draft, scope = publishScope) {
    const hasUnsavedChanges = JSON.stringify(value) !== JSON.stringify(saved);
    const v = hasUnsavedChanges ? await save(value) : version;
    if (value !== draft) setDraft(value);
    if (demo) {
      const history = [
        {
          id: crypto.randomUUID(),
          message: `Published demo revision ${pubVersion + 1} to the local preview`,
          createdAt: new Date().toISOString(),
        },
        ...demoHistory,
      ];
      const snapshot = scopedSchedule(value, published, scope);
      setPublished(structuredClone(snapshot));
      setPubVersion(pubVersion + 1);
      setDemoHistory(history);
      persistDemo(value, snapshot, pubVersion + 1, history);
      await new Promise((resolve) => setTimeout(resolve, 450));
    } else {
      const key =
        sessionStorage.getItem(
          `publish-${selected}-${v}-${pubVersion}-${scope}-${includeGoogle}`,
        ) || crypto.randomUUID();
      sessionStorage.setItem(
        `publish-${selected}-${v}-${pubVersion}-${scope}-${includeGoogle}`,
        key,
      );
      await request('/api/manage', {
        op: 'publish',
        id: selected,
        version: v,
        key,
        scope,
        google: includeGoogle,
        publishedVersion: pubVersion,
      });
      await refresh(true);
      sessionStorage.removeItem(`publish-${selected}-${v}-${pubVersion}-${scope}-${includeGoogle}`);
    }
    setOnboarding(false);
    notify(
      demo
        ? 'Demo published. Your local widget preview is up to date.'
        : 'Published to website widgets. Check Activity for destination outcomes.',
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
  async function switchTab(next: string) {
    if (next !== tab && tab === 'settings' && dirty && !readonly) {
      setBusy(true);
      setError('');
      try {
        await autosaveBusiness();
      } catch (cause) {
        setError((cause as Error).message);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
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
    setModal('');
    setError('');
    setToast('');
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'overview');
    window.history.pushState(null, '', url);
    setTab('overview');
    setMobile(false);
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
  const statusEmbedStyle = 'width:min(100%, 420px);border-radius:12px;overflow:hidden';
  const statusPlacement =
    'Place inside an existing footer column, below the business description if it fits there';
  const snippet = `<!-- Place directly above the site header -->
<div data-opensync="${selected || 'YOUR_LOCATION_ID'}" data-type="banner"></div>

<!-- Place in the business hours section -->
<div data-opensync="${selected || 'YOUR_LOCATION_ID'}" data-type="hours"></div>

<!-- ${statusPlacement} -->
<div data-opensync="${selected || 'YOUR_LOCATION_ID'}" data-type="status" style="${statusEmbedStyle}"></div>

<!-- Load OpenSync once, after the three placements -->
<script src="${origin}/embed.js" defer></script>`,
    aiIntegrationPrompt = `Integrate all three OpenSync website widgets into my existing website. You have access to the website's codebase, so inspect its framework, layout, components, and styling before making changes.

Place the announcement banner directly above the site header and the business hours widget in the most useful hours or contact section. Integrate the live status badge inside the existing footer layout where it fits naturally—prefer the business identity, contact, hours, or utility column. It must read as a compact footer item, not as a new full-width band above or below the footer, and it must not sit below the copyright row. Preserve the existing visual design, responsiveness, accessibility, and site behavior. Use the exact OpenSync embed code below; do not change its location ID, data attributes, widget types, or script URL:

${snippet}

Implementation requirements:
- Keep the three embed containers in their appropriate site regions; they do not need to remain adjacent in the source code.
- Keep the status container within the footer's existing content wrapper or grid. Reuse an existing footer column when possible; otherwise add a compact column that follows the footer's current spacing and alignment. Do not create a separate edge-to-edge section for it.
- Preserve the status container's responsive width, rounded corners, and clipping. The embed supplies its own top spacing and transparent surround so the site's footer background can show through.
- Reuse the existing status placement if OpenSync is already installed. Move it into the chosen footer column and remove any empty row left behind.
- Load the OpenSync script only once, even if the site uses reusable components or client-side navigation.
- Follow the website's existing conventions instead of introducing a new framework or styling system.
- Ensure every placement works on mobile and desktop without covering navigation or important content.
- Do not add fallback spacing around an empty widget. OpenSync intentionally collapses disabled widgets and inactive announcements to zero height.
- If the site has a Content Security Policy, allow ${origin || 'the OpenSync origin'} in its script-src and frame-src directives.
- Do not replace the embed with mocked or hard-coded business hours.
- After implementing it, verify the page still builds and briefly summarize what you changed and where.`;
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
  const liveStatus = publishedSchedule && getStatus(publishedSchedule, new Date(now));
  const upcoming = (publishedSchedule?.exceptions || [])
    .filter((e) => e.end >= (liveStatus?.date ?? status.date))
    .sort((a, b) => a.start.localeCompare(b.start));
  const history = demo ? demoHistory : detail?.history || [],
    filteredJobs = (detail?.jobs || []).filter((job) => {
      const statusMatches =
        activityFilter === 'all' ||
        (activityFilter === 'published' && ['published', 'accepted'].includes(job.status)) ||
        (activityFilter === 'pending' && ['queued', 'retry'].includes(job.status)) ||
        (activityFilter === 'failed' && job.status === 'failed');
      return (
        statusMatches && (destinationFilter === 'all' || job.destination === destinationFilter)
      );
    });
  const quickDisabled = busy || readonly || (!demo && detail?.location.id !== selected);
  const googleHours =
    !demo &&
    detail?.connection?.status === 'connected' &&
    !!detail.connection.remoteId &&
    plan !== 'free';
  const quickNeedsReview =
    !!todayUpdate &&
    (!publishedSchedule ||
      todayUpdate.schedule.timezone !== publishedSchedule.timezone ||
      publishChanges(todayUpdate.schedule, publishedSchedule, 'hours').length > 0 ||
      publishChanges(todayUpdate.schedule, publishedSchedule, 'special').length > 0);
  function openToday() {
    setError('');
    const today = getStatus(draft);
    setTodayUpdate({
      schedule: draft,
      date: today.date,
      intervals: today.today.sort((a, b) => a.open.localeCompare(b.open)),
    });
    setModal('today-update');
  }
  function confirmToday(value: Schedule, date: string) {
    if (quickDisabled) return;
    if (localDate(value.timezone) !== date) {
      setError('The date has changed. Close this window and start a new update for today.');
      return;
    }
    if (quickNeedsReview) {
      setDraft(value);
      openPublish(
        publishedSchedule && value.timezone === publishedSchedule.timezone ? 'special' : 'all',
      );
      return;
    }
    void act(async () => {
      await publish(googleHours, value, 'special');
      setModal('');
      notify(
        demo
          ? 'Demo published. Today’s hours were updated in your preview.'
          : 'Today’s hours were published to your website widgets. Check Activity for delivery status.',
      );
    });
  }
  const PageIcon = titleIcons[tab as keyof typeof titleIcons];
  const goPublish = (value: Schedule) => {
    setDraft(value);
    openPublish(
      modal.startsWith('announcement:') || modal === 'Post announcement'
        ? 'announcements'
        : 'special',
    );
  };
  function publishAnnouncement(id: string) {
    const activation = new Date(now).toISOString();
    let source =
      liveAnnouncement && !draft.announcements.some((item) => item.id === liveAnnouncement.id)
        ? [...draft.announcements, { ...liveAnnouncement, enabled: false }]
        : draft.announcements;
    const selected = source.find((announcement) => announcement.id === id);
    if (
      selected &&
      liveAnnouncement?.id === id &&
      JSON.stringify(selected) !== JSON.stringify(liveAnnouncement)
    )
      source = [...source, { ...liveAnnouncement, id: crypto.randomUUID(), enabled: false }];
    setDraft({
      ...draft,
      announcements: source.map((announcement) =>
        announcement.id === id
          ? {
              ...announcement,
              enabled: true,
              start: activation,
              end:
                announcement.end && Date.parse(announcement.end) <= Date.parse(activation)
                  ? ''
                  : announcement.end,
            }
          : { ...announcement, enabled: false },
      ),
    });
    openPublish('announcements');
  }
  function removeLiveAnnouncement() {
    if (!liveAnnouncement || !confirm('Remove this announcement from your website?')) return;
    const currentTime = Date.parse(now);
    const source = draft.announcements.some((item) => item.id === liveAnnouncement.id)
      ? draft.announcements
      : [...draft.announcements, liveAnnouncement];
    setDraft({
      ...draft,
      announcements: source.map((announcement) =>
        announcement.id === liveAnnouncement.id ||
        (announcement.enabled &&
          Date.parse(announcement.start) <= currentTime &&
          (!announcement.end || Date.parse(announcement.end) > currentTime))
          ? { ...announcement, enabled: false }
          : announcement,
      ),
    });
    openPublish('announcements');
  }
  function editAnnouncement(announcement: Schedule['announcements'][number]) {
    if (!draft.announcements.some((item) => item.id === announcement.id))
      setDraft({
        ...draft,
        announcements: [...draft.announcements, structuredClone(announcement)],
      });
    setModal(`announcement:${announcement.id}`);
  }
  function announcementPreview(announcement: Schedule['announcements'][number]) {
    return {
      ...draft,
      announcements: [{ ...announcement, enabled: true, start: now, end: '' }],
    };
  }
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
          paid={demo || plan === 'business'}
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
          onCreate={() => !dirty || confirm('Discard unsaved changes and create a new workspace?')}
        />
        {sidebarSections.map((section) => (
          <div className="nav-group" key={section.label}>
            {section.showLabel && <div className="nav-label">{section.label}</div>}
            <nav aria-label={section.label}>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={!onboarding && tab === item.id ? 'page' : undefined}
                  className={`${
                    !onboarding &&
                    (tab === item.id ||
                      (item.id === 'schedule' && ['hours', 'special'].includes(tab)))
                      ? 'active'
                      : ''
                  } nav-${item.id}`}
                  onClick={() => switchTab(item.id)}
                >
                  <item.icon size={18} />
                  <span className="sidebar-text">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        ))}
        <div className="sidebar-bottom">
          <nav aria-label="Account">
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
            <button
              type="button"
              className="breadcrumb-overview breadcrumb-overview-icon"
              aria-label="Go to overview"
              title="Overview"
              onClick={() => switchTab('overview')}
            >
              <Store size={15} />
            </button>
            <button
              type="button"
              className="breadcrumb-overview breadcrumb-business-name"
              onClick={() => switchTab('overview')}
            >
              {draft.name}
            </button>
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
          {error && modal !== 'today-update' && (
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
                      showLogo={false}
                    />
                    <p className="muted">
                      Logo and reusable visual defaults are managed in{' '}
                      <button
                        type="button"
                        className="text-link inline-link"
                        onClick={() => switchTab('brand')}
                      >
                        Brand kit
                      </button>
                      .
                    </p>
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
                        Copy this bundle into your website code. Each enabled widget becomes
                        available after you publish.
                      </p>
                      <label>
                        Preview widget
                        <select
                          value={widgetType}
                          onChange={(e) => setWidgetType(e.target.value as WidgetType)}
                        >
                          <option value="hours">Business hours</option>
                          <option value="banner">Announcement banner</option>
                          <option value="status">Status badge</option>
                        </select>
                      </label>
                      <pre className="code-block">{snippet}</pre>
                      <div className="installation-actions">
                        <Button variant="outline" onClick={() => copy(snippet)}>
                          <Copy size={16} />
                          Copy embed code
                        </Button>
                        <Button variant="outline" onClick={() => copy(aiIntegrationPrompt)}>
                          <Sparkles size={16} />
                          Copy prompt for AI
                        </Button>
                      </div>
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
                  <div className="page-title">
                    {PageIcon && (
                      <span className="page-title-icon" aria-hidden="true">
                        <PageIcon size={18} />
                      </span>
                    )}
                    <div>
                      <h1>{titles[tab]?.[0]}</h1>
                      <p>{titles[tab]?.[1]}</p>
                    </div>
                  </div>
                )}
                {['hours', 'special', 'widgets', 'brand', 'settings'].includes(tab) ||
                (tab === 'overview' && (dirty || unpublished)) ? (
                  <div className="heading-actions">
                    {tab === 'widgets' ? (
                      <Button
                        disabled={busy || readonly || !dirty}
                        onClick={() =>
                          act(async () => {
                            await save();
                            notify('Widget changes saved to your draft.');
                          })
                        }
                      >
                        <Check size={16} />
                        Save changes
                      </Button>
                    ) : (
                      <Button
                        disabled={
                          busy ||
                          readonly ||
                          (!dirty && !unpublished) ||
                          (tab === 'hours' && !hoursHaveChanges)
                        }
                        onClick={() => openPublish()}
                      >
                        <Send size={16} />
                        Publish changes
                      </Button>
                    )}
                  </div>
                ) : null}
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
                  <div className={styles.greeting}>
                    <h1>{draft.name}</h1>
                  </div>
                  <div className={styles.summaries}>
                    <section className={styles.summary}>
                      <span>What customers see</span>
                      <strong>
                        <CheckCircle2 size={16} className={liveStatus?.open ? styles.open : ''} />
                        {liveStatus
                          ? liveStatus.open
                            ? 'Open now'
                            : 'Closed now'
                          : 'Hours haven’t been published'}
                      </strong>
                      {liveStatus && <p>{liveStatus.nextLabel}</p>}
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
                        ) : liveStatus ? (
                          'Your usual hours apply'
                        ) : (
                          'No hours published yet'
                        )}
                      </p>
                    </button>
                  </div>
                  <section className={styles.actions}>
                    <h2>What changed?</h2>
                    <div className={styles.actionGrid}>
                      <button
                        className={styles.primaryAction}
                        onClick={openToday}
                        disabled={quickDisabled}
                      >
                        <DoorOpen size={20} />
                        <span>
                          Update today<small>Close early, open late, or close for the day</small>
                        </span>
                      </button>
                      <button
                        onClick={() => setModal('Plan a future change')}
                        disabled={quickDisabled}
                      >
                        <CalendarDays size={20} />
                        <span>
                          Plan a future change
                          <small>Holiday hours, vacations, or a one-time change</small>
                        </span>
                      </button>
                      <button onClick={() => switchTab('hours')} disabled={quickDisabled}>
                        <Clock size={20} />
                        <span>
                          Change usual hours<small>Edit your weekly schedule</small>
                        </span>
                      </button>
                      <button onClick={() => setModal('quick-message')} disabled={quickDisabled}>
                        <Megaphone size={20} />
                        <span>
                          Tell customers something<small>Put a message on your website</small>
                        </span>
                      </button>
                    </div>
                  </section>
                </section>
              )}
              {tab === 'schedule' && (
                <section className={styles.actionGrid} aria-label="Schedule options">
                  {scheduleNavigation.map((item) => (
                    <button key={item.id} onClick={() => switchTab(item.id)}>
                      <item.icon size={20} /> {item.label}
                    </button>
                  ))}
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
                <div className="announcement-workspace">
                  <section className="card announcement-library announcement-section">
                    <div className="card-heading">
                      <div>
                        <h3>Live announcements</h3>
                        <p className="muted">
                          This is the banner currently visible on your website.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          liveAnnouncementDraft && publishAnnouncement(liveAnnouncementDraft.id)
                        }
                        disabled={readonly || !liveAnnouncementDraft}
                      >
                        <Send size={14} />
                        Publish changes
                      </Button>
                    </div>
                    {liveAnnouncement && publishedSchedule ? (
                      <article className="announcement-banner-record is-live">
                        <div className="announcement-banner-preview">
                          <Widget schedule={publishedSchedule} type="banner" now={now} />
                        </div>
                        <div className="announcement-record-footer">
                          <div>
                            <span className="pill">Live on website</span>
                            <small className="muted">
                              {liveAnnouncement.end
                                ? `Expires ${new Intl.DateTimeFormat('en-CA', {
                                    timeZone: publishedSchedule.timezone,
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  }).format(new Date(liveAnnouncement.end))}`
                                : 'No expiry'}
                            </small>
                          </div>
                          <div className="announcement-actions">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editAnnouncement(liveAnnouncement)}
                              disabled={readonly}
                            >
                              <Pencil size={14} aria-hidden="true" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={removeLiveAnnouncement}
                              disabled={readonly}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </article>
                    ) : (
                      <div className="empty-state small">
                        <Megaphone size={28} />
                        <h4>No live announcement</h4>
                        <p>Publish a draft to show a banner on your website.</p>
                      </div>
                    )}
                  </section>

                  <section className="card announcement-library announcement-section">
                    <div className="card-heading">
                      <div>
                        <h3>Drafts</h3>
                        <p className="muted">
                          Publishing a draft replaces the live banner and moves the previous one
                          here.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setModal('Post announcement')}
                        disabled={readonly}
                      >
                        <Plus size={15} />
                        New announcement
                      </Button>
                    </div>
                    {announcementDrafts.length ? (
                      <div className="announcement-list">
                        {announcementDrafts.map((announcement) => (
                          <article className="announcement-banner-record" key={announcement.id}>
                            <div className="announcement-banner-preview">
                              <Widget
                                schedule={announcementPreview(announcement)}
                                type="banner"
                                now={now}
                              />
                            </div>
                            <div className="announcement-record-footer">
                              <div>
                                <span className="pill">Draft</span>
                                <small className="muted">
                                  {announcement.id === liveAnnouncement?.id
                                    ? 'Unpublished changes to the live banner'
                                    : 'Ready to replace the live banner'}
                                </small>
                              </div>
                              <div className="announcement-actions">
                                <Button
                                  size="sm"
                                  onClick={() => publishAnnouncement(announcement.id)}
                                  disabled={readonly}
                                >
                                  <Send size={14} aria-hidden="true" />
                                  Publish
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => editAnnouncement(announcement)}
                                  disabled={readonly}
                                >
                                  <Pencil size={14} aria-hidden="true" />
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={readonly}
                                  onClick={() => {
                                    if (confirm('Remove this announcement from your drafts?'))
                                      setDraft({
                                        ...draft,
                                        announcements: draft.announcements.filter(
                                          (item) => item.id !== announcement.id,
                                        ),
                                      });
                                  }}
                                >
                                  <Trash2 size={14} aria-hidden="true" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <Megaphone size={32} />
                        <h3>No drafts</h3>
                        <p>Create an announcement or edit the live banner to start a draft.</p>
                      </div>
                    )}
                  </section>
                </div>
              )}
              {tab === 'widgets' && (
                <div
                  className={`two-columns widget-config${widgetType === 'banner' ? ' widget-config-banner' : ''}`}
                >
                  <div
                    className="widget-type-tabs"
                    role="group"
                    aria-label="Choose a widget to customise"
                    data-selected={widgetType}
                  >
                    {(['hours', 'banner', 'status'] as WidgetType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={widgetType === type}
                        className={widgetType === type ? 'selected' : ''}
                        onClick={() => setWidgetType(type)}
                      >
                        {type === 'hours' ? (
                          <>
                            <CalendarDays size={15} /> Hours
                          </>
                        ) : type === 'banner' ? (
                          <>
                            <Megaphone size={15} /> Banner
                          </>
                        ) : (
                          <>
                            <Clock size={15} /> Status
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                  <div>
                    <section className="card padded widget-studio-card">
                      <div className="widget-settings-heading">
                        <h3 className="pro-feature-title">
                          {plan === 'free' && <ProBadge />} Design studio
                          <span className="sr-only">Widget appearance</span>
                        </h3>
                        <button
                          type="button"
                          className="widget-visibility-switch"
                          role="switch"
                          aria-label={widgetVisibilityLabels[widgetType]}
                          aria-checked={widgetVisible}
                          disabled={readonly}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              widgetVisibility: {
                                ...(current.widgetVisibility ?? {
                                  hours: true,
                                  banner: true,
                                  status: true,
                                }),
                                [widgetType]: current.widgetVisibility?.[widgetType] === false,
                              },
                            }))
                          }
                        >
                          <span className="widget-visibility-track" aria-hidden="true" />
                          <span className="widget-visibility-state" aria-hidden="true">
                            {widgetVisible ? 'Show' : 'Hide'}
                          </span>
                        </button>
                      </div>
                      <p className="widget-studio-intro">
                        Customize the look and feel of your{' '}
                        {widgetType === 'hours' ? 'hours' : widgetType} widget.
                      </p>
                      <div className="widget-presets-heading">
                        <div>
                          <strong>Style presets</strong>
                          <span>Quick starts you can customize.</span>
                        </div>
                      </div>
                      <div className="widget-presets" role="group" aria-label="Style presets">
                        {(['modern', 'minimal', 'card', 'dark'] as const).map((preset) => (
                          <button
                            type="button"
                            key={preset}
                            className={`preset-${preset}${widgetPreset === preset ? ' selected' : ''}`}
                            aria-pressed={widgetPreset === preset}
                            disabled={readonly || plan === 'free'}
                            onClick={() => applyWidgetPreset(preset)}
                          >
                            <span className="preset-preview" aria-hidden="true">
                              <i />
                              <i />
                              <i />
                            </span>
                            <strong>{preset.charAt(0).toUpperCase() + preset.slice(1)}</strong>
                            {widgetPreset === preset && <Check size={13} aria-hidden="true" />}
                          </button>
                        ))}
                      </div>
                      <div
                        className="widget-studio-tabs"
                        role="group"
                        aria-label="Widget settings groups"
                      >
                        {(
                          [
                            ['appearance', Paintbrush, 'Appearance'],
                            ['layout', LayoutGrid, 'Layout'],
                            ['content', ListChecks, 'Content'],
                          ] as const
                        )
                          .filter(([id]) => widgetType !== 'banner' || id !== 'content')
                          .map(([id, Icon, label]) => (
                            <button
                              type="button"
                              key={id}
                              aria-pressed={activeWidgetStudioTab === id}
                              className={activeWidgetStudioTab === id ? 'active' : ''}
                              onClick={() => setWidgetStudioTab(id)}
                            >
                              <Icon size={14} /> {label}
                            </button>
                          ))}
                      </div>
                      <div className="form-grid" hidden={activeWidgetStudioTab !== 'appearance'}>
                        {widgetType !== 'banner' && (
                          <label className={plan === 'free' ? 'pro-locked' : undefined}>
                            <span className="pro-field-label">
                              {plan === 'free' && <ProBadge />} Accent colour
                            </span>
                            <div className="widget-accent-control">
                              <input
                                type="color"
                                disabled={readonly || plan === 'free'}
                                value={widgetSettings.accent}
                                onChange={(e) => updateWidgetAppearance({ accent: e.target.value })}
                              />
                              <span>{widgetSettings.accent.toUpperCase()}</span>
                            </div>
                          </label>
                        )}
                        {widgetType !== 'banner' && (
                          <label className={plan === 'free' ? 'pro-locked' : undefined}>
                            <span className="pro-field-label">
                              {plan === 'free' && <ProBadge />} Appearance
                            </span>
                            <select
                              disabled={readonly || plan === 'free'}
                              value={widgetSettings.theme}
                              onChange={(e) =>
                                updateWidgetAppearance({
                                  theme: e.target.value as 'light' | 'dark',
                                })
                              }
                            >
                              <option value="light">Light</option>
                              <option value="dark">Dark</option>
                            </select>
                          </label>
                        )}
                        {widgetType !== 'banner' && (
                          <label className={plan === 'free' ? 'pro-locked' : undefined}>
                            <span className="pro-field-label">
                              {plan === 'free' && <ProBadge />} Background colour
                            </span>
                            <div className="widget-colour-control">
                              <select
                                aria-label="Background colour mode"
                                disabled={readonly || plan === 'free'}
                                value={
                                  widgetSettings.background === 'auto' ||
                                  widgetSettings.background === 'none'
                                    ? widgetSettings.background
                                    : 'custom'
                                }
                                onChange={(e) =>
                                  updateWidgetAppearance({
                                    background:
                                      e.target.value === 'auto'
                                        ? 'auto'
                                        : e.target.value === 'none'
                                          ? 'none'
                                          : widgetSettings.theme === 'dark'
                                            ? '#222735'
                                            : '#ffffff',
                                  })
                                }
                              >
                                <option value="auto">Auto · use appearance</option>
                                <option value="none">None · transparent</option>
                                <option value="custom">Custom</option>
                              </select>
                              {widgetSettings.background !== 'auto' &&
                                widgetSettings.background !== 'none' && (
                                  <input
                                    type="color"
                                    aria-label="Custom background colour"
                                    disabled={readonly || plan === 'free'}
                                    value={widgetSettings.background}
                                    onChange={(e) =>
                                      updateWidgetAppearance({ background: e.target.value })
                                    }
                                  />
                                )}
                            </div>
                          </label>
                        )}
                        {widgetType !== 'banner' && (
                          <label className={plan === 'free' ? 'pro-locked' : undefined}>
                            <span className="pro-field-label">
                              {plan === 'free' && <ProBadge />} Border colour
                            </span>
                            <div className="widget-colour-control">
                              <select
                                aria-label="Border colour mode"
                                disabled={readonly || plan === 'free'}
                                value={widgetSettings.borderColour === 'auto' ? 'auto' : 'custom'}
                                onChange={(e) =>
                                  updateWidgetAppearance({
                                    borderColour:
                                      e.target.value === 'auto'
                                        ? 'auto'
                                        : widgetSettings.theme === 'dark'
                                          ? '#343b4d'
                                          : '#e7e9ee',
                                  })
                                }
                              >
                                <option value="auto">Auto · use appearance</option>
                                <option value="custom">Custom</option>
                              </select>
                              {widgetSettings.borderColour !== 'auto' && (
                                <input
                                  type="color"
                                  aria-label="Custom border colour"
                                  disabled={readonly || plan === 'free'}
                                  value={widgetSettings.borderColour}
                                  onChange={(e) =>
                                    updateWidgetAppearance({ borderColour: e.target.value })
                                  }
                                />
                              )}
                            </div>
                          </label>
                        )}
                        {widgetType !== 'banner' && (
                          <label className={plan === 'free' ? 'pro-locked' : undefined}>
                            <span className="pro-field-label">
                              {plan === 'free' && <ProBadge />} Border thickness
                            </span>
                            <select
                              disabled={readonly || plan === 'free'}
                              value={String(widgetSettings.borderWidth)}
                              onChange={(e) =>
                                updateWidgetAppearance({ borderWidth: Number(e.target.value) })
                              }
                            >
                              {Array.from({ length: 9 }, (_, width) => (
                                <option key={width} value={width}>
                                  {width === 0 ? 'None' : `${width}px`}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label className={plan === 'free' ? 'pro-locked' : undefined}>
                          <span className="pro-field-label">
                            {plan === 'free' && <ProBadge />} Typography
                          </span>
                          <select
                            disabled={readonly || plan === 'free'}
                            value={widgetSettings.font}
                            onChange={(e) =>
                              updateWidgetAppearance({
                                font: e.target.value as Schedule['widget']['font'],
                              })
                            }
                          >
                            <option value="auto">Auto · inherit website</option>
                            <option value="system">Modern sans</option>
                            <option value="serif">Classic serif</option>
                            <option value="rounded">Friendly rounded</option>
                            <option value="humanist">Humanist sans</option>
                            <option value="mono">Monospace</option>
                          </select>
                        </label>
                        <label className={plan === 'free' ? 'pro-locked' : undefined}>
                          <span className="pro-field-label">
                            {plan === 'free' && <ProBadge />} Font size
                          </span>
                          <select
                            disabled={readonly || plan === 'free'}
                            value={String(widgetSettings.fontSize)}
                            onChange={(e) =>
                              updateWidgetAppearance({
                                fontSize:
                                  e.target.value === 'auto' ? 'auto' : Number(e.target.value),
                              })
                            }
                          >
                            <option value="auto">Auto · inherit website</option>
                            {[10, 11, 12, 13, 14, 16, 18, 20, 24].map((size) => (
                              <option key={size} value={size}>
                                {size}px
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={plan === 'free' ? 'pro-locked' : undefined}>
                          <span className="pro-field-label">
                            {plan === 'free' && <ProBadge />} Corner radius
                          </span>
                          <div className="widget-range-control">
                            <input
                              type="range"
                              disabled={readonly || plan === 'free'}
                              min={0}
                              max={32}
                              value={widgetSettings.radius}
                              onChange={(e) =>
                                updateWidgetAppearance({ radius: Number(e.target.value) })
                              }
                            />
                            <span>{widgetSettings.radius} px</span>
                          </div>
                        </label>
                      </div>
                      <div className="form-grid" hidden={activeWidgetStudioTab !== 'layout'}>
                        <label className={plan === 'free' ? 'pro-locked' : undefined}>
                          <span className="pro-field-label">
                            {plan === 'free' && <ProBadge />} Alignment
                          </span>
                          <select
                            disabled={readonly || plan === 'free'}
                            value={widgetSettings.alignment}
                            onChange={(e) =>
                              updateWidgetAppearance({
                                alignment: e.target.value as 'left' | 'center',
                              })
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Centre</option>
                          </select>
                        </label>
                        {widgetType !== 'banner' && (
                          <label className={plan === 'free' ? 'pro-locked' : undefined}>
                            <span className="pro-field-label">
                              {plan === 'free' && <ProBadge />} Layout
                            </span>
                            <select
                              disabled={readonly || plan === 'free'}
                              value={widgetSettings.compact ? 'compact' : 'full'}
                              onChange={(e) =>
                                updateWidgetAppearance({ compact: e.target.value === 'compact' })
                              }
                            >
                              <option value="full">Full</option>
                              <option value="compact">Compact</option>
                            </select>
                          </label>
                        )}
                        {widgetType === 'hours' && (
                          <label className={`check-label ${plan === 'free' ? 'pro-locked' : ''}`}>
                            {plan === 'free' && <ProBadge />}
                            <input
                              type="checkbox"
                              checked={widgetSettings.showDividers !== false}
                              disabled={readonly || plan === 'free'}
                              onChange={(event) =>
                                updateWidgetAppearance({ showDividers: event.target.checked })
                              }
                            />
                            Show section dividers
                          </label>
                        )}
                      </div>
                      {activeWidgetStudioTab === 'content' && widgetType !== 'banner' && (
                        <label className={`check-label ${plan === 'free' ? 'pro-locked' : ''}`}>
                          {plan === 'free' && <ProBadge />}
                          <input
                            type="checkbox"
                            checked={widgetSettings.showName}
                            disabled={readonly || plan === 'free'}
                            onChange={(e) => updateWidgetAppearance({ showName: e.target.checked })}
                          />
                          Show business name
                        </label>
                      )}
                      {activeWidgetStudioTab === 'content' && widgetType !== 'banner' && (
                        <label className={`check-label ${plan === 'free' ? 'pro-locked' : ''}`}>
                          {plan === 'free' && <ProBadge />}
                          <input
                            type="checkbox"
                            checked={widgetSettings.showBranding !== false}
                            disabled={readonly || plan === 'free'}
                            onChange={(event) =>
                              updateWidgetAppearance({ showBranding: event.target.checked })
                            }
                          />
                          Show OpenSync branding
                        </label>
                      )}
                      {activeWidgetStudioTab === 'content' && widgetType === 'hours' && (
                        <fieldset className="widget-visibility widget-content-options">
                          <legend>{plan === 'free' && <ProBadge />} Full hours content</legend>
                          <label className={`check-label ${plan === 'free' ? 'pro-locked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={widgetSettings.highlightToday !== false}
                              disabled={readonly || plan === 'free'}
                              onChange={(e) =>
                                updateWidgetAppearance({ highlightToday: e.target.checked })
                              }
                            />
                            Highlight today&apos;s hours
                          </label>
                          <label className={`check-label ${plan === 'free' ? 'pro-locked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={widgetSettings.showStatus !== false}
                              disabled={readonly || plan === 'free'}
                              onChange={(e) =>
                                updateWidgetAppearance({ showStatus: e.target.checked })
                              }
                            />
                            Show current status
                          </label>
                          <label className={`check-label ${plan === 'free' ? 'pro-locked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={widgetSettings.collapsible !== false}
                              disabled={readonly || plan === 'free'}
                              onChange={(e) =>
                                updateWidgetAppearance({ collapsible: e.target.checked })
                              }
                            />
                            Let visitors collapse hours
                          </label>
                        </fieldset>
                      )}
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
                  </div>
                  {widgetPreview}
                </div>
              )}
              {tab === 'website' && (
                <div className="website-installation">
                  <section className="card padded installation">
                    <div className="installation-intro">
                      <span className="provider-icon violet">
                        <Code2 size={24} />
                      </span>
                      <div>
                        <h2>Make it part of your website.</h2>
                        <p className="muted">
                          Install all three placements once. OpenSync will show or hide each one
                          from your published widget settings. The live widgets also use your
                          published appearance, including theme and density.
                        </p>
                      </div>
                    </div>
                    <ol className="installation-steps">
                      <li>
                        <strong>Copy the embed code</strong>
                        <span>Use the exact bundle below so every widget uses this business.</span>
                      </li>
                      <li>
                        <strong>Add each placement</strong>
                        <span>
                          Put the banner above your header, hours in your contact or hours section,
                          and status inside an existing footer column where it fits naturally—not in
                          a separate full-width row.
                        </span>
                      </li>
                      <li>
                        <strong>Publish and test</strong>
                        <span>
                          Publish your OpenSync changes, then check the widgets on desktop and
                          mobile.
                        </span>
                      </li>
                    </ol>
                    <pre className="code-block">{snippet}</pre>
                    <div className="installation-actions">
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
                      <Button
                        variant="outline"
                        onClick={() =>
                          demo
                            ? notify(
                                'Demo prompts are examples. Create a business to get your working location ID.',
                              )
                            : copy(aiIntegrationPrompt)
                        }
                      >
                        <Sparkles size={16} />
                        Copy prompt for AI
                      </Button>
                    </div>
                    <details>
                      <summary>Iframe alternative &amp; strict website policies</summary>
                      <pre className="code-block">{`<!-- Place directly above the site header -->
<iframe src="${origin}/embed/${selected || 'YOUR_LOCATION_ID'}?type=banner" title="Business announcement" style="width:100%;height:180px;border:0" loading="lazy"></iframe>

<!-- Place in the business hours section -->
<iframe src="${origin}/embed/${selected || 'YOUR_LOCATION_ID'}?type=hours" title="Business hours" style="width:100%;height:590px;border:0" loading="lazy"></iframe>

<!-- ${statusPlacement} -->
<iframe src="${origin}/embed/${selected || 'YOUR_LOCATION_ID'}?type=status" title="Business status" style="${statusEmbedStyle};display:block;height:110px;border:0" loading="lazy"></iframe>`}</pre>
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
                  </section>
                  <Button variant="ghost" onClick={() => switchTab('integrations')}>
                    <ChevronLeft size={16} />
                    Back to connections
                  </Button>
                </div>
              )}
              {tab === 'brand' && (
                <div className="settings-grid brand-kit-grid">
                  <section className="card padded">
                    <h3>Business identity</h3>
                    <p className="muted">
                      These reusable details flow into website widgets and social templates.
                    </p>
                    <div className="form-grid brand-kit-fields">
                      <label>
                        Business display name
                        <input
                          value={draft.name}
                          maxLength={100}
                          disabled={busy || readonly}
                          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                        />
                      </label>
                      <label className={plan === 'free' ? 'pro-locked' : undefined}>
                        <span className="pro-field-label">
                          {plan === 'free' && <ProBadge />} Primary brand colour
                        </span>
                        <input
                          type="color"
                          value={draft.widget.accent}
                          disabled={busy || readonly || plan === 'free'}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              widget: { ...draft.widget, accent: event.target.value },
                            })
                          }
                        />
                        <small>Used as the starting accent for widgets and social designs.</small>
                      </label>
                      <label className={plan === 'free' ? 'pro-locked' : undefined}>
                        <span className="pro-field-label">
                          {plan === 'free' && <ProBadge />} Widget typography
                        </span>
                        <select
                          value={draft.widget.font}
                          disabled={busy || readonly || plan === 'free'}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              widget: {
                                ...draft.widget,
                                font: event.target.value as Schedule['widget']['font'],
                              },
                            })
                          }
                        >
                          <option value="auto">Auto · inherit website</option>
                          <option value="system">Modern sans</option>
                          <option value="serif">Classic serif</option>
                          <option value="rounded">Friendly rounded</option>
                          <option value="humanist">Humanist sans</option>
                          <option value="mono">Monospace</option>
                        </select>
                      </label>
                    </div>
                    <LogoUpload
                      value={draft.logo}
                      onChange={(logo) => setDraft({ ...draft, logo })}
                      disabled={busy || readonly}
                    />
                  </section>
                  <section className="card padded brand-kit-usage">
                    <h3>Where your brand is used</h3>
                    <div className="list-row">
                      <Code2 size={18} />
                      <div>
                        <strong>Website widgets</strong>
                        <p>Display name, logo-ready identity, accent colour, and typography.</p>
                      </div>
                    </div>
                    <div className="list-row">
                      <Instagram size={18} />
                      <div>
                        <strong>Social templates</strong>
                        <p>Display name, logo, and accent colour seed new reusable designs.</p>
                      </div>
                    </div>
                    <p className="muted">
                      Layout-specific choices stay with each widget or social template so this page
                      does not duplicate those editors.
                    </p>
                  </section>
                </div>
              )}
              {tab === 'integrations' && (
                <>
                  <div className="integration-grid">
                    <section className="card padded">
                      <div className="section-heading">
                        <span className="google-g">G</span>
                        <span className="pill">{plan === 'free' && <ProBadge />} Pro</span>
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
                        disabled={plan === 'free' || busy || (!demo && !detail?.googleConfigured)}
                        onClick={connect}
                      >
                        {detail?.connection ? 'Reconnect Google' : 'Connect Google'}
                        <ArrowUpRight size={16} />
                      </Button>
                      {detail?.connection && (
                        <>
                          <Button
                            variant="outline"
                            disabled={plan === 'free' || busy}
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
                            disabled={busy}
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
                            disabled={plan === 'free' || !remote || busy}
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
                              disabled={plan === 'free'}
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
                          ? `Three widgets configured · revision ${pubVersion} published. Installation on your website is not verified.`
                          : 'Three widget types are available. Publish your first update before installing them.'}
                      </div>
                      <Button variant="outline" onClick={() => switchTab('website')}>
                        View website instructions <ArrowRight size={16} />
                      </Button>
                    </section>
                    <SocialConnections
                      locationId={demo ? 'demo' : selected}
                      demo={demo}
                      readonly={readonly}
                    />
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
                  onManageConnections={() => switchTab('integrations')}
                />
              )}
              {tab === 'activity' && (
                <>
                  <section className="card">
                    <div className="card-heading">
                      <div>
                        <h3>Publication outcomes</h3>
                        <p>Each destination is tracked independently.</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await refresh();
                            notify('Activity refreshed');
                          })
                        }
                      >
                        <RefreshCw size={14} />
                        Refresh
                      </Button>
                    </div>
                    <div className="activity-filters" aria-label="Activity filters">
                      <label>
                        Status
                        <select
                          value={activityFilter}
                          onChange={(event) => setActivityFilter(event.target.value)}
                        >
                          <option value="all">All activity</option>
                          <option value="pending">Pending</option>
                          <option value="published">Published</option>
                          <option value="failed">Failed</option>
                        </select>
                      </label>
                      <label>
                        Destination
                        <select
                          value={destinationFilter}
                          onChange={(event) => setDestinationFilter(event.target.value)}
                        >
                          <option value="all">All destinations</option>
                          <option value="website">Website widgets</option>
                          <option value="google">Google Business Profile</option>
                        </select>
                      </label>
                    </div>
                    {filteredJobs.length ? (
                      filteredJobs.map((j) => (
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
                          {detail?.jobs.length
                            ? 'No publication outcomes match these filters.'
                            : demo
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
                        <span className="eyebrow">{p.name}</span>
                        <h2>
                          ${p.price}
                          <small>CAD / month</small>
                        </h2>
                        <p>{p.copy}</p>
                        <ul>
                          {p.features.map((f) => (
                            <li key={f}>
                              <Check size={15} />
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
                  <section className="card padded settings-profile-card">
                    <h3>Business profile</h3>
                    <BusinessFields
                      key={selected}
                      draft={draft}
                      onChange={setDraft}
                      onLogoChange={(logo) => {
                        const updated = { ...draft, logo };
                        setDraft(updated);
                        void act(async () => {
                          await autosaveBusiness(updated);
                          notify('Business profile saved automatically.');
                        });
                      }}
                      disabled={busy || readonly}
                    />
                    <p className="muted">Changes save automatically when you leave this page.</p>
                  </section>
                  <div className="settings-side-column">
                    <section className="card padded">
                      <h3>Brand kit</h3>
                      <p className="muted">
                        Keep your logo, colours, and typography consistent across widgets and social
                        posts.
                      </p>
                      <Button variant="outline" onClick={() => switchTab('brand')}>
                        <Palette size={16} />
                        Open brand kit
                      </Button>
                    </section>
                    <section className="card padded">
                      <h3>Locations & team</h3>
                      <p className="muted">
                        Add locations with independent hours and time zones, and manage staff
                        access.
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
                  {demo && (
                    <section className="card padded restart-setup-card">
                      <h3>Restart setup</h3>
                      <p className="muted">
                        Restarting clears this browser&apos;s demo hours, announcements, widget
                        choices, saved publication history, and onboarding progress.
                      </p>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              'Restart setup and clear all demo changes saved in this browser?',
                            )
                          )
                            startDemoOnboarding();
                        }}
                      >
                        <RotateCcw size={15} />
                        Restart demo setup
                      </Button>
                    </section>
                  )}
                </div>
              )}
              {tab === 'account' && (
                <div className="account-settings-grid">
                  <section className="card padded account-identity-card">
                    <h3>Your account</h3>
                    <p className="muted">{demo ? 'Jamie Davis · Demo account' : email}</p>
                    <Button
                      variant="destructive"
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
                  </section>
                  <section className="card padded account-plan-card">
                    <div className="account-plan-heading">
                      <span className="account-plan-icon" aria-hidden="true">
                        <CreditCard size={18} />
                      </span>
                      <div>
                        <h3>Plans & billing</h3>
                        <p className="muted">You&apos;re on the {planLabel} plan.</p>
                      </div>
                    </div>
                    <p className="muted">
                      {demo
                        ? 'Compare plans and see what is included. Billing is disabled in the demo.'
                        : detail?.billingConfigured
                          ? 'Compare plans, change your subscription, or open the billing portal.'
                          : 'Compare plans and subscription features. Billing setup is not available yet.'}
                    </p>
                    <Button variant="outline" onClick={() => switchTab('billing')}>
                      Manage plans & billing <ArrowUpRight size={15} />
                    </Button>
                  </section>
                  <section className="card padded account-data-card">
                    <h3>Your data</h3>
                    <p className="muted">
                      Download a copy of your OpenSync data or manage this account.
                    </p>
                    <div className="account-data-actions">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (demo) {
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(
                              new Blob(
                                [JSON.stringify({ demo: true, draft, published }, null, 2)],
                                {
                                  type: 'application/json',
                                },
                              ),
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
                    </div>
                  </section>
                </div>
              )}
              {tab === 'help' && (
                <section className="card padded help-card">
                  <h2>Common questions</h2>
                  {[
                    [
                      'How do I update today’s hours?',
                      'Choose Update today on Home and pick what changed. Use Plan a future change for holidays and other dates. Your usual weekly hours stay the same.',
                    ],
                    [
                      'How do I install a widget?',
                      'Open Connections, choose Your website, and copy the embed bundle from the website instructions. It includes placements for the announcement banner, business hours, and live status, plus one shared script. Add each placement to the matching part of your site, then publish your first revision before testing. Published updates appear within about 45 seconds.',
                    ],
                    [
                      'Where do I add the widget on my website platform?',
                      'Use a Custom HTML block in WordPress, Embed Code → Embed HTML in Wix, a Code block with HTML enabled in Squarespace, or a Custom Liquid section in Shopify. On a custom website, paste the snippet where you want the widget to appear. Some website plans restrict custom scripts; if yours does, use the iframe alternative in the website instructions.',
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
          wide={modal === 'Post announcement' || modal.startsWith('announcement:')}
          onClose={() => {
            if (!busy) setModal('');
          }}
        >
          {modal === 'today-update' && todayUpdate ? (
            <TodayUpdate
              schedule={todayUpdate.schedule}
              date={todayUpdate.date}
              existing={todayUpdate.intervals}
              busy={busy}
              error={error}
              destination={
                demo
                  ? 'Updates your demo preview.'
                  : googleHours
                    ? 'Updates your website widgets and sends the hours to Google for syncing.'
                    : 'Updates your website widgets.'
              }
              needsReview={quickNeedsReview}
              onConfirm={confirmToday}
              onCustom={() => setModal('Different hours today')}
            />
          ) : modal === 'quick-message' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const message = String(
                  new FormData(event.currentTarget).get('message') || '',
                ).trim();
                if (!message) return;
                setDraft({
                  ...draft,
                  announcements: [
                    ...draft.announcements,
                    {
                      id: crypto.randomUUID(),
                      title: '',
                      message,
                      type: 'none',
                      start: new Date().toISOString(),
                      end: '',
                      enabled: true,
                      ctaText: '',
                      ctaUrl: '',
                    },
                  ],
                });
                openPublish('announcements');
              }}
            >
              <div className="modal-heading">
                <div className="modal-icon" aria-hidden="true">
                  <Megaphone size={23} />
                </div>
                <div>
                  <h2>What should customers know?</h2>
                  <p className="muted">This message appears on your website.</p>
                </div>
              </div>
              <label>
                Message
                <textarea name="message" rows={4} maxLength={500} required />
              </label>
              <div className="modal-actions">
                <Button type="button" variant="outline" onClick={() => setModal('')}>
                  Cancel
                </Button>
                <Button type="submit">Review message</Button>
              </div>
            </form>
          ) : ['Add special hours', 'Plan a future change', 'Different hours today'].includes(
              modal,
            ) || modal.startsWith('exception:') ? (
            <ExceptionForm
              draft={draft}
              kind={modal.startsWith('exception:') ? 'Edit special hours' : modal}
              existing={draft.exceptions.find((e) => `exception:${e.id}` === modal)}
              fixedDate={modal === 'Different hours today' ? todayUpdate?.date : undefined}
              onSubmit={goPublish}
              onCancel={() => setModal('')}
            />
          ) : modal === 'Post announcement' || modal.startsWith('announcement:') ? (
            <AnnouncementForm
              draft={draft}
              paid={plan !== 'free'}
              existing={draft.announcements.find((a) => `announcement:${a.id}` === modal)}
              onSubmit={(value) => {
                setDraft(value);
                setModal('');
                void act(async () => {
                  await save(value);
                  await switchTab('announcements');
                  notify('Announcement saved to Drafts.');
                });
              }}
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
              paid={plan !== 'free'}
              google={
                !demo &&
                ['hours', 'special', 'all'].includes(publishScope) &&
                detail?.connection?.status === 'connected' &&
                !!detail.connection.remoteId &&
                plan !== 'free'
              }
              onSaveDraft={() =>
                act(async () => {
                  await save();
                  notify('Draft saved. Publish when you’re ready.');
                  setModal('');
                })
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
