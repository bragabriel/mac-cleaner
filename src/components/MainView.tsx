import {type ReactNode, useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  AppWindowMac,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderOpen,
  HardDriveDownload,
  Home,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  AppItem,
  CleanupMode,
  PermissionSettingTarget,
  PermissionSnapshot,
  PermissionStatus,
  ProductMode,
  RemovalFailure,
  ScanItem,
  ScanStatus,
  ScanSummary,
} from '../types';

interface MainViewProps {
  mode: ProductMode;
  cleanupMode: CleanupMode;
  app: AppItem | null;
  apps: AppItem[];
  searchQuery: string;
  summary: ScanSummary | null;
  scanStatus: ScanStatus;
  permissionSnapshot: PermissionSnapshot | null;
  permissionCheckLoading: boolean;
  permissionCheckError: string | null;
  onModeChange: (mode: ProductMode) => void;
  onCleanupModeChange: (mode: CleanupMode) => void;
  onSelectApp: (app: AppItem) => void;
  onSearchChange: (value: string) => void;
  onRunScan: (roots?: string[]) => void | Promise<void>;
  onToggleItem: (itemId: string) => void;
  onToggleAll: () => void;
  onOpenSystemSettings: (target: PermissionSettingTarget) => void | Promise<void>;
  onRefreshPermissionSnapshot: () => void | Promise<void>;
  onCopyPath: (targetPath: string) => void | Promise<void>;
  onRevealPath: (targetPath: string) => void | Promise<void>;
  onOpenPath: (targetPath: string) => void | Promise<void>;
  onRemoveSelected: () => void;
  confirmState: {
    open: boolean;
    selectedItems: ScanItem[];
    failures: RemovalFailure[];
  };
  onConfirmRemoval: () => void | Promise<void>;
  onCancelRemoval: () => void;
  permissionModalOpen: boolean;
  onPermissionModalClose: () => void;
  onGoToSettings: () => void;
  brewPackages: Array<{name: string; outdated: boolean}>;
  brewOutdated: Array<{name: string; currentVersion: string; latestVersion: string}>;
  brewLoading: boolean;
  brewError: string | null;
  brewUpgradeLoading: string | null;
  brewUpgradeMessage: string | null;
  onRefreshBrewPackages: () => void | Promise<void>;
  onBrewUpgrade: (name: string) => void | Promise<void>;
  onBrewSearchChange: (value: string) => void;
  brewSearchQuery: string;
  brewFilter: 'all' | 'updated' | 'pending';
  onBrewFilterChange: (filter: 'all' | 'updated' | 'pending') => void;
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const cleanupEntries: Array<{
  id: CleanupMode;
  title: string;
  subtitle: string;
  icon: typeof Sparkles;
  roots: string[];
}> = [
  {
    id: 'residues',
    title: 'App Residues',
    subtitle: 'Scan common macOS locations for leftovers from removed apps.',
    icon: Sparkles,
    roots: [
      '~/Library/Application Support',
      '~/Library/Preferences',
      '~/Library/Caches',
      '~/Library/Containers',
      '~/Library/Group Containers',
      '~/Library/Logs',
      '~/Library/Saved Application State',
    ],
  },
  {
    id: 'system',
    title: 'System Junk',
    subtitle: 'Inspect generic cleanup targets like caches, logs, and transient data.',
    icon: HardDriveDownload,
    roots: ['~/Library/Caches', '~/Library/Logs', '~/Library/Saved Application State'],
  },
];

const homeEntries: Array<{
  id: string;
  title: string;
  subtitle: string;
  mode: ProductMode;
  cleanupMode?: CleanupMode;
  icon: typeof Home;
}> = [
  {
    id: 'home-uninstall',
    title: 'Uninstall Apps',
    subtitle: 'Inspect installed apps, open one detail column, then continue the flow vertically.',
    mode: 'uninstall',
    icon: AppWindowMac,
  },
  {
    id: 'home-orphans',
    title: 'App Residues',
    subtitle: 'Find leftovers from apps that are already gone.',
    mode: 'cleanup',
    cleanupMode: 'residues',
    icon: Sparkles,
  },
  {
    id: 'home-system',
    title: 'System Junk',
    subtitle: 'Review caches, logs, and other generic cleanup candidates.',
    mode: 'cleanup',
    cleanupMode: 'system',
    icon: HardDriveDownload,
  },
  {
    id: 'home-brew',
    title: 'Brew Packages',
    subtitle: 'Browse installed Homebrew packages, check for updates, and upgrade.',
    mode: 'brew',
    icon: Package,
  },
  {
    id: 'home-settings',
    title: 'Settings',
    subtitle: 'Permissions, scan behavior, and safety defaults in the same final column pattern.',
    mode: 'settings',
    icon: Settings,
  },
];

const brewEntry = {
  id: 'packages' as const,
  title: 'Brew Packages',
  subtitle: 'Installed Homebrew packages and available updates.',
};

const settingsEntries: Array<{
  id: PermissionSettingTarget;
  title: string;
  subtitle: string;
  priority: 'required' | 'recommended' | 'optional';
  description: string;
  actionLabel: string;
}> = [
  {
    id: 'privacy-full-disk-access',
    title: 'Full Disk Access',
    subtitle: 'Lets scans inspect protected Library locations and app support folders that macOS hides by default.',
    priority: 'required',
    description:
      'Deep uninstall and orphan cleanup depend on visibility into protected directories such as Application Support, Containers, and Logs. Without it, scans can look healthy while silently missing protected leftovers that remain on disk.',
    actionLabel: 'Open Full Disk Access',
  },
  {
    id: 'privacy-accessibility',
    title: 'Accessibility',
    subtitle: 'Allows the app to guide focus back to cleanup prompts and related macOS follow-up flows.',
    priority: 'recommended',
    description:
      'Accessibility is the safest way to help users complete system-managed steps without guessing where macOS moved the current prompt. Without it, the app can still scan files, but guided follow-up actions become less reliable.',
    actionLabel: 'Open Accessibility',
  },
];

function priorityTone(priority: 'required' | 'recommended' | 'optional') {
  switch (priority) {
    case 'required':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'recommended':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function priorityLabel(priority: 'required' | 'recommended' | 'optional') {
  switch (priority) {
    case 'required':
      return 'Required';
    case 'recommended':
      return 'Recommended';
    default:
      return 'Optional';
  }
}

function permissionStatusTone(status: PermissionStatus) {
  switch (status) {
    case 'granted':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'not-granted':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'needs-manual-review':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function permissionStatusLabel(status: PermissionStatus) {
  switch (status) {
    case 'granted':
      return 'Granted';
    case 'not-granted':
      return 'Not granted';
    case 'needs-manual-review':
      return 'Needs manual review';
    default:
      return 'Unknown';
  }
}

function settingBadgeTone(priority: 'required' | 'recommended' | 'optional', status: PermissionStatus) {
  if (status === 'granted') {
    return permissionStatusTone(status);
  }

  return priorityTone(priority);
}

function settingBadgeLabel(priority: 'required' | 'recommended' | 'optional', status: PermissionStatus) {
  if (status === 'granted') {
    return permissionStatusLabel(status);
  }

  return priorityLabel(priority);
}

function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function categoryLabel(category: ScanItem['category']) {
  switch (category) {
    case 'application':
      return 'Application';
    case 'application-support':
      return 'Support';
    case 'preferences':
      return 'Preferences';
    case 'caches':
      return 'Caches';
    case 'logs':
      return 'Logs';
    case 'containers':
      return 'Containers';
    case 'group-containers':
      return 'Group Containers';
    case 'saved-state':
      return 'Saved State';
    case 'hidden':
      return 'Hidden';
    default:
      return 'Other';
  }
}

function confidenceTone(confidence: ScanItem['confidence']) {
  switch (confidence) {
    case 'high':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'medium':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-rose-200 bg-rose-50 text-rose-700';
  }
}

function Panel({
  title,
  subtitle,
  children,
  footer,
  wide = false,
  scroll = false,
  header = true,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  scroll?: boolean;
  header?: boolean;
  className?: string;
}) {
  return (
    <section
      className={[
        'flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-black/6 bg-white',
        wide ? 'min-w-0' : '',
        className ?? '',
      ].join(' ')}
    >
      {header ? (
        <header className="border-b border-black/6 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9EA2AE]">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-[#747785]">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className={scroll ? 'min-h-0 flex-1 overflow-y-auto' : 'min-h-0 flex-1'}>{children}</div>
      {footer ? footer : null}
    </section>
  );
}

function ListColumn<T extends {id: string; title: string; subtitle: string}>({
  entries,
  activeId,
  onSelect,
  leftSlot,
  rightMeta,
  wrapText = false,
}: {
  entries: T[];
  activeId: string | null;
  onSelect: (entry: T) => void;
  leftSlot?: (entry: T) => ReactNode;
  rightMeta?: (entry: T) => ReactNode;
  wrapText?: boolean;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {entries.length ? (
        entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className={[
              'flex w-full items-start justify-between gap-4 border-b border-black/6 px-5 py-4 text-left transition',
              activeId === entry.id ? 'bg-[#F4F1FF]' : 'bg-white hover:bg-[#FAFAFC]',
            ].join(' ')}
          >
            <div className="flex min-w-0 items-center gap-3">
              {leftSlot ? <div className="shrink-0">{leftSlot(entry)}</div> : null}
              <div className="min-w-0">
                <p className={cn(wrapText ? 'break-words' : 'truncate', 'text-sm font-semibold text-[#111215]')}>{entry.title}</p>
                <p className={cn(wrapText ? 'break-words leading-5' : 'truncate', 'mt-1 text-xs text-[#747785]')}>{entry.subtitle}</p>
              </div>
            </div>
            {rightMeta ? <div className="shrink-0 text-xs font-semibold text-[#747785]">{rightMeta(entry)}</div> : null}
          </button>
        ))
      ) : (
        <div className="px-5 py-8 text-sm text-[#747785]">Nothing to show here yet.</div>
      )}
    </div>
  );
}

function DetailCard({
  icon,
  title,
  subtitle,
  rightSlot,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-black/6 bg-[#FAFAFC] p-5 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1EEFF] text-[#7263FF]">
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-[#111215]">{title}</h3>
            </div>
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
        <p className="text-sm leading-7 text-[#747785]">{subtitle}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AppIcon({app}: {app: AppItem}) {
  if (app.iconDataUrl) {
    return <img src={app.iconDataUrl} alt="" className="h-8 w-8 rounded-lg object-contain" draggable={false} />;
  }

  return <AppWindowMac className="h-5 w-5" />;
}

function InfoChip({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111215]">{value}</p>
    </div>
  );
}

export function MainView({
  mode,
  cleanupMode,
  app,
  apps,
  searchQuery,
  summary,
  scanStatus,
  permissionSnapshot,
  permissionCheckLoading,
  permissionCheckError,
  onModeChange,
  onCleanupModeChange,
  onSelectApp,
  onSearchChange,
  onRunScan,
  onToggleItem,
  onToggleAll,
  onOpenSystemSettings,
  onRefreshPermissionSnapshot,
  onCopyPath,
  onRevealPath,
  onOpenPath,
  onRemoveSelected,
  confirmState,
  onConfirmRemoval,
  onCancelRemoval,
  permissionModalOpen,
  onPermissionModalClose,
  onGoToSettings,
  brewPackages,
  brewOutdated,
  brewLoading,
  brewError,
  brewUpgradeLoading,
  brewUpgradeMessage,
  onRefreshBrewPackages,
  onBrewUpgrade,
  onBrewSearchChange,
  brewSearchQuery,
  brewFilter,
  onBrewFilterChange,
}: MainViewProps) {
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [selectedBrewItemId, setSelectedBrewItemId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(settingsEntries[0]?.id ?? null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [selectedCleanupRoots, setSelectedCleanupRoots] = useState<string[]>([]);
  const [rootSizes, setRootSizes] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    setSelectedResultId(summary?.items[0]?.id ?? null);
  }, [summary]);

  const selectedCleanup = cleanupEntries.find((entry) => entry.id === cleanupMode) ?? cleanupEntries[0];
  const activeCleanupRoots = selectedCleanupRoots;
  const permissionStateByTarget = useMemo(
    () => new Map((permissionSnapshot?.permissions ?? []).map((permission) => [permission.target, permission])),
    [permissionSnapshot],
  );
  const settingsWithStatus = settingsEntries.map((entry) => ({
    ...entry,
    status: permissionStateByTarget.get(entry.id)?.status ?? 'unknown',
    statusDetail:
      permissionStateByTarget.get(entry.id)?.detail ??
      'No live permission signal is available yet. Open System Settings and verify it manually.',
  }));
  const selectedSetting = settingsWithStatus.find((entry) => entry.id === selectedSettingId) ?? settingsWithStatus[0];
  const summaryItems = summary?.items ?? [];
  const selectedBrewPackage = brewPackages.find((p) => p.name === selectedBrewItemId) ?? brewPackages[0] ?? null;
  const selectedBrewOutdated = brewOutdated.find((o) => o.name === selectedBrewPackage?.name) ?? null;
  const scannedRoots = summary?.scannedRoots ?? [];
  const inaccessibleRoots = summary?.inaccessibleRoots ?? [];
  const selectedResult = summaryItems.find((item) => item.id === selectedResultId) ?? summaryItems[0] ?? null;
  const selectedCount = summary?.items.filter((item) => item.selected).length ?? 0;
  const selectedBytes =
    summary?.items.filter((item) => item.selected).reduce((total, item) => total + item.sizeBytes, 0) ?? 0;
  const progressValue = scanStatus.scanning || scanStatus.removing ? scanStatus.progress : summary ? 100 : 0;
  const canRunScan = mode === 'uninstall' ? Boolean(app) : mode === 'cleanup';

  useEffect(() => {
    setSelectedCleanupRoots(selectedCleanup.roots);
  }, [selectedCleanup.id]);

  useEffect(() => {
    if (mode !== 'cleanup') {
      return;
    }

    let active = true;
    const fetchRootSizes = async () => {
      try {
        const sizes = window.macCleaner?.getDirSizes ? await window.macCleaner.getDirSizes(selectedCleanup.roots) : [];
        if (!active) {
          return;
        }
        setRootSizes(new Map(sizes.map((entry) => [entry.path, entry.sizeBytes])));
      } catch {
        if (active) {
          setRootSizes(new Map());
        }
      }
    };

    void fetchRootSizes();
    return () => {
      active = false;
    };
  }, [mode, selectedCleanup.id, selectedCleanup.roots]);

  useEffect(() => {
    if (mode !== 'brew') {
      return;
    }

    const nextSelectedItemId = brewPackages[0]?.name ?? null;
    setSelectedBrewItemId(nextSelectedItemId);
  }, [mode, brewPackages]);

  const breadcrumbs = useMemo(() => {
    const path = ['Mac Cleaner'];

    if (mode === 'home') {
      path.push('Home');
      return path;
    }

    if (mode === 'uninstall') {
      path.push('Uninstall Apps');
      if (app) {
        path.push(app.name);
      }
      if (selectedResult) {
        path.push(selectedResult.label);
      }
      return path;
    }

    if (mode === 'cleanup') {
      path.push('Cleanup', selectedCleanup.title);
      if (selectedResult) {
        path.push(selectedResult.label);
      }
      return path;
    }

    if (mode === 'brew') {
      path.push('Brew Packages');
      if (selectedBrewPackage) {
        path.push(selectedBrewPackage.name);
      }
      return path;
    }

    path.push('Settings', selectedSetting.title);
    return path;
  }, [app, mode, selectedBrewPackage, selectedCleanup.title, selectedResult, selectedSetting.title]);

  const brewListColumn = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {brewLoading ? (
        <div className="px-5 py-8 text-sm text-[#747785]">Loading brew packages...</div>
      ) : brewError ? (
        <div className="px-5 py-8 text-sm text-rose-600">{brewError}</div>
      ) : brewPackages.length ? (
        brewPackages.map((pkg) => {
          const isActive = selectedBrewPackage?.name === pkg.name;
          return (
            <button
              key={pkg.name}
              type="button"
              onClick={() => setSelectedBrewItemId(pkg.name)}
              className={cn(
                'flex w-full items-center justify-between gap-4 border-b border-black/6 px-5 py-3.5 text-left transition',
                isActive ? 'bg-[#F4F1FF]' : 'bg-white hover:bg-[#FAFAFC]',
              )}
            >
              <div className="min-w-0 flex items-center gap-3">
                <Package className="h-4 w-4 shrink-0 text-[#7263FF]" />
                <p className="truncate text-sm font-medium text-[#111215]">{pkg.name}</p>
              </div>
              {pkg.outdated ? (
                <span className="shrink-0 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Update
                </span>
              ) : null}
            </button>
          );
        })
      ) : (
        <div className="px-5 py-8 text-sm text-[#747785]">No brew packages installed.</div>
      )}
    </div>
  );

  const brewDetailColumn = (
    <div className="space-y-4">
      {brewUpgradeMessage ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-800">
          {brewUpgradeMessage}
        </div>
      ) : null}

      {selectedBrewPackage ? (
        <DetailCard
          icon={<Package className="h-6 w-6" />}
          title={selectedBrewPackage.name}
          subtitle={selectedBrewOutdated ? `${selectedBrewOutdated.currentVersion} → ${selectedBrewOutdated.latestVersion}` : 'Up to date'}
          rightSlot={
            selectedBrewOutdated ? (
              <button
                type="button"
                disabled={brewUpgradeLoading !== null}
                onClick={() => void onBrewUpgrade(selectedBrewPackage.name)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                  brewUpgradeLoading === selectedBrewPackage.name
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                )}
              >
                {brewUpgradeLoading === selectedBrewPackage.name ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {brewUpgradeLoading === selectedBrewPackage.name ? 'Upgrading...' : 'Upgrade'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4" />
                Current
              </span>
            )
          }
        >
          <div className="grid gap-4 2xl:grid-cols-2">
            <div className="rounded-[24px] border border-black/6 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Package</p>
              <p className="mt-3 break-all text-sm leading-7 text-[#111215]">{selectedBrewPackage.name}</p>
            </div>
            {selectedBrewOutdated ? (
              <>
                <div className="rounded-[24px] border border-black/6 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Installed Version</p>
                  <p className="mt-3 text-sm leading-7 text-[#111215]">{selectedBrewOutdated.currentVersion}</p>
                </div>
                <div className="rounded-[24px] border border-black/6 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Latest Version</p>
                  <p className="mt-3 text-sm leading-7 text-emerald-700">{selectedBrewOutdated.latestVersion}</p>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-black/6 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Status</p>
                <p className="mt-3 text-sm leading-7 text-[#111215]">Up to date</p>
              </div>
            )}
          </div>
        </DetailCard>
      ) : (
        <div className="rounded-[24px] border border-black/6 bg-white px-5 py-10 text-center text-sm text-[#747785]">
          Select a package to view details.
        </div>
      )}
    </div>
  );

  const uninstallSecondColumn = app ? (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DetailCard
        icon={<AppIcon app={app} />}
        title={app.name}
        subtitle="Details, storage, and actions."
        rightSlot={<InfoChip label="App Size" value={formatBytes(app.sizeBytes)} />}
      >
        <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
          <div className="rounded-2xl bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Installed path</p>
            <p className="mt-2 break-all text-sm text-[#111215]">{app.appPath}</p>
            <p className="mt-2 text-sm text-[#747785]">{app.bundleId || 'Bundle ID unavailable'}</p>
          </div>
          <div className="grid content-start items-start gap-3 2xl:grid-cols-1">
            <button
              type="button"
              onClick={() => {
                void onRunScan();
              }}
              disabled={scanStatus.scanning || scanStatus.removing}
              className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#111215] px-3 py-2.5 text-xs font-semibold leading-none text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-35 sm:px-4 sm:text-sm"
            >
              {scanStatus.scanning ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <AppWindowMac className="h-4 w-4 shrink-0" />
              )}
              <span className="min-w-0 truncate">{scanStatus.scanning ? 'Scanning...' : 'Scan related files'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void onOpenPath(app.appPath);
              }}
              className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-black/6 bg-white px-3 py-2.5 text-xs font-semibold leading-none text-[#111215] transition hover:bg-[#F4F4F8] sm:px-4 sm:text-sm"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Open in Finder</span>
            </button>
          </div>
        </div>
      </DetailCard>

    </div>
  ) : (
    <div className="rounded-[26px] border border-dashed border-black/6 bg-white px-5 py-6 text-sm leading-7 text-[#747785]">
      Select an app from the first column to open the final workspace column.
    </div>
  );

  const scanResultsColumn = summary ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-black/6 bg-white">
      <div className="grid grid-cols-2 items-start gap-x-5 gap-y-4 border-b border-black/6 px-4 py-4 lg:px-5 2xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] 2xl:gap-x-8">
        <div className="min-w-0 2xl:order-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Scan results</p>
                <p className="mt-1 text-sm text-[#747785]">{summaryItems.length} leftovers found</p>
        </div>
        <button
          type="button"
          onClick={onToggleAll}
          className="justify-self-end text-sm font-semibold text-[#7263FF] transition hover:text-[#5748E5] 2xl:order-4"
        >
                {selectedCount === summaryItems.length ? 'Unselect all' : 'Select all'}
        </button>
        <div className="min-w-0 2xl:order-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Selected</p>
            <p className="mt-1 text-sm font-semibold text-[#111215]">{selectedCount} of {summaryItems.length}</p>
        </div>
        <div className="min-w-0 justify-self-end text-right 2xl:order-3 2xl:justify-self-start 2xl:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Selected size</p>
            <p className="mt-1 text-sm font-semibold text-[#111215]">{formatBytes(selectedBytes)}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
              {summaryItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedResultId(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedResultId(item.id);
              }
            }}
            role="button"
            tabIndex={0}
            className={`w-full border-b border-black/6 px-4 py-4 text-left transition lg:px-5 ${
              item.id === selectedResult?.id ? 'bg-[#F4F1FF]' : 'bg-white hover:bg-[#F8F7FB]'
            }`}
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
              <input
                type="checkbox"
                checked={item.selected}
                onChange={(event) => {
                  event.stopPropagation();
                  onToggleItem(item.id);
                }}
                onClick={(event) => event.stopPropagation()}
                className="mt-1 h-4 w-4 rounded border-black/20 accent-[#7263FF]"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111215]">{item.label}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#9EA2AE]">{item.category}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-center">
                <span className="inline-flex h-7 min-w-[58px] items-center justify-center whitespace-nowrap border border-black/6 bg-white px-2 text-xs text-[#747785]">
                  {formatBytes(item.sizeBytes)}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigator.clipboard.writeText(item.path);
                  }}
                  className="inline-flex h-7 items-center gap-1 border border-black/6 bg-white px-2 text-[11px] text-[#747785] transition hover:border-[#7263FF]/40 hover:text-[#111215]"
                  title={`Copy path for ${item.label}`}
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy path</span>
                </button>
              </div>
            </div>
            <p className="mt-2 break-all text-xs text-[#747785] pl-7">{item.path}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-black/6 px-4 py-4 lg:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onConfirmRemoval}
            disabled={selectedCount === 0 || scanStatus.removing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111215] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:flex-1"
          >
            {scanStatus.removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
            {scanStatus.removing
              ? 'Removing...'
              : `Remove ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}`}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const uninstallThirdColumn = app ? (
    scanResultsColumn ? (
      scanResultsColumn
    ) : (
      <div className="flex h-full items-center justify-center rounded-[26px] border border-dashed border-black/6 bg-white px-6 text-center text-sm leading-7 text-[#747785]">
        Run the scan to open the right-side results column.
      </div>
    )
  ) : null;

  const cleanupThirdColumn =
    scanResultsColumn || (
      <div className="flex h-full items-center justify-center rounded-[26px] border border-dashed border-black/6 bg-white px-6 text-center text-sm leading-7 text-[#747785]">
        Run a cleanup scan to open the right-side results column.
      </div>
    );


  const cleanupSecondColumn = (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DetailCard
        icon={<selectedCleanup.icon className="h-6 w-6" />}
        title={selectedCleanup.title}
        subtitle="Quick overview of the selected cleanup profile and its scan targets."
      >
        <div className="grid items-start gap-4">
          <div className="rounded-2xl bg-white px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Roots inspected</p>
              <button
                type="button"
                onClick={() => setSelectedCleanupRoots(activeCleanupRoots.length === selectedCleanup.roots.length ? [] : [...selectedCleanup.roots])}
                className="text-[11px] font-medium text-[#7263FF] hover:text-[#5B4BD4] transition-colors"
              >
                {activeCleanupRoots.length === selectedCleanup.roots.length ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>
            <div className="mt-3 grid max-h-[280px] gap-2 overflow-y-auto pr-1 2xl:max-h-none 2xl:grid-cols-2 2xl:overflow-visible 2xl:pr-0">
              {selectedCleanup.roots.map((root) => {
                const size = rootSizes.get(root);
                const hasSize = size !== undefined && size > 0;
                return (
                  <label
                    key={root}
                    className="flex items-start gap-3 rounded-2xl bg-[#FAFAFC] px-3 py-3 text-sm text-[#111215]"
                  >
                    <input
                      type="checkbox"
                      checked={activeCleanupRoots.includes(root)}
                      onChange={(event) => {
                        setSelectedCleanupRoots((current) =>
                          event.target.checked ? [...current, root] : current.filter((item) => item !== root),
                        );
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 accent-[#7263FF]"
                    />
                    <span className="min-w-0 flex-1 break-all">{root}</span>
                    {hasSize ? (
                      <span className="shrink-0 text-xs font-semibold text-[#747785]">{formatBytes(size)}</span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid content-start items-start gap-3">
            <button
              type="button"
              onClick={() => {
                void onRunScan(activeCleanupRoots);
              }}
              disabled={scanStatus.scanning || scanStatus.removing || activeCleanupRoots.length === 0}
              className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#111215] px-3 py-2.5 text-xs font-semibold leading-none text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-35 sm:px-4 sm:text-sm"
            >
              {scanStatus.scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
              <span className="min-w-0 truncate">{scanStatus.scanning ? 'Scanning...' : 'Run cleanup scan'}</span>
            </button>
          </div>
        </div>
      </DetailCard>

    </div>
  );

  return (
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
      <header className="border-b border-black/6 bg-white/72 px-5 py-4 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {mode !== 'home' ? (
              <button
                type="button"
                onClick={() => onModeChange('home')}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-black/8 bg-white px-3 py-2 text-xs font-semibold text-[#111215] transition hover:bg-[#F4F4F8] xl:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                Home
              </button>
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9EA2AE]">Workspace</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#747785]">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb}-${index}`} className="inline-flex items-center gap-2">
                    {index > 0 ? <span className="text-[#C7CAD4]">/</span> : null}
                    <span className={index === breadcrumbs.length - 1 ? 'font-semibold text-[#111215]' : ''}>{crumb}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/bragabriel/mac-cleaner"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747785] transition-all duration-200 hover:border-[#ca8a04] hover:text-[#ca8a04] hover:scale-105"
            >
              Give it a Star
            </a>

            {(mode === 'uninstall' || mode === 'cleanup') && (
              <button
                type="button"
                onClick={() => {
                  void onRunScan(mode === 'cleanup' ? activeCleanupRoots : undefined);
                }}
                disabled={!canRunScan || scanStatus.scanning || scanStatus.removing || (mode === 'cleanup' && activeCleanupRoots.length === 0)}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#111215] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {scanStatus.scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'uninstall' ? (
                  <AppWindowMac className="h-4 w-4" />
                ) : (
                  <HardDriveDownload className="h-4 w-4" />
                )}
                {scanStatus.scanning ? 'Scanning...' : mode === 'uninstall' ? 'Scan app' : 'Run cleanup'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-3 lg:p-4">
        <div className="h-full overflow-hidden rounded-[30px] border border-black/8 bg-white shadow-[0_30px_80px_rgba(17,18,21,0.08)]">
          {mode === 'home' ? (
            <div className="h-full overflow-y-auto px-6 py-6 lg:px-8">
              <div className="mx-auto max-w-6xl">
                <div className="rounded-[28px] border border-black/6 bg-[#FAFAFC] p-5 lg:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9EA2AE]">Home</p>
                  <h2 className="mt-3 text-[21px] font-semibold tracking-[-0.04em] text-[#111215] xl:text-[27px]">
                    Choose what you want to clean or manage.
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-[#747785]">
                    Before starting, open{' '}
                    <button
                      type="button"
                      onClick={() => onModeChange('settings')}
                      className="font-semibold text-[#5B4DFF] underline underline-offset-4 transition hover:text-[#4338CA]"
                    >
                      Settings
                    </button>{' '}
                    to grant the macOS permissions required to scan, clean, and manage this project.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:mt-6 xl:gap-5">
                  {homeEntries.map((entry) => {
                    const Icon = entry.icon;

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setSelectedHomeId(entry.id);
                          if (entry.mode === 'cleanup' && entry.cleanupMode) {
                            onCleanupModeChange(entry.cleanupMode);
                          }
                          onModeChange(entry.mode);
                        }}
                        className="group rounded-[22px] border border-black/6 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-black/12 hover:shadow-[0_24px_60px_rgba(17,18,21,0.08)] xl:rounded-[28px] xl:p-6"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F1EEFF] text-[#7263FF] xl:h-12 xl:w-12 xl:rounded-3xl">
                          <Icon className="h-[18px] w-[18px] xl:h-6 xl:w-6" />
                        </div>
                        <h3 className="mt-3 text-base font-semibold tracking-[-0.04em] text-[#111215] xl:mt-5 xl:text-xl">{entry.title}</h3>
                        <p className="mt-2 text-xs leading-5 text-[#747785] xl:mt-3 xl:text-sm xl:leading-7">{entry.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'grid h-full min-h-0 gap-3 p-3 lg:gap-4 lg:p-4',
                mode === 'uninstall'
                  ? 'md:grid-cols-[280px_minmax(260px,0.9fr)_minmax(280px,1fr)] 2xl:grid-cols-[minmax(260px,0.85fr)_minmax(320px,1.15fr)_minmax(320px,0.95fr)]'
                  : mode === 'cleanup'
                    ? 'md:grid-cols-[236px_minmax(320px,1.1fr)_minmax(280px,0.95fr)] 2xl:grid-cols-[240px_minmax(380px,1.2fr)_minmax(320px,0.9fr)]'
                    : mode === 'brew'
                        ? 'md:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[minmax(300px,0.72fr)_minmax(420px,1.28fr)]'
                        : 'md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[minmax(300px,0.55fr)_minmax(0,1fr)]',
              )}
            >
              {mode === 'uninstall' ? (
                <>
                  <Panel title="Applications" subtitle="Installed apps on this Mac." scroll>
                    <div className="border-b border-black/6 px-5 py-4">
                      <div className="flex items-center gap-3 rounded-[18px] border border-black/6 bg-[#FAFAFC] px-4 py-3">
                        <Search className="h-4 w-4 text-[#9EA2AE]" />
                        <input
                          value={searchQuery}
                          onChange={(event) => onSearchChange(event.target.value)}
                          placeholder="Search apps"
                          className="w-full bg-transparent text-sm text-[#111215] outline-none placeholder:text-[#9EA2AE]"
                        />
                      </div>
                    </div>
                    <ListColumn
                      entries={apps.map((entry) => ({
                        id: entry.id,
                        title: entry.name,
                        subtitle: entry.bundleId || entry.appPath,
                        sizeText: formatBytes(entry.sizeBytes),
                        app: entry,
                      }))}
                      activeId={app?.id ?? null}
                      onSelect={(entry) => {
                        const selectedApp = apps.find((item) => item.id === entry.id);
                        if (selectedApp) {
                          onSelectApp(selectedApp);
                        }
                      }}
                      leftSlot={(entry) => (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F1EEFF] text-[#7263FF]">
                          <AppIcon app={entry.app} />
                        </div>
                      )}
                      rightMeta={(entry) => entry.sizeText}
                    />
                  </Panel>
                  <Panel title={app ? app.name : 'App Workspace'} subtitle="Middle column for the selected app." wide header={false}>
                    <div className="h-full min-h-0 overflow-hidden p-4 lg:p-5">{uninstallSecondColumn}</div>
                  </Panel>
                  {app && summary ? (
                    <div className="min-h-0 ">
                      <Panel title={summary ? summary.title : 'Scan Results'} subtitle="Scanned items expand into this right-side column." wide header={false}>
                        <div className="h-full min-h-0 overflow-hidden p-4 lg:p-5">{uninstallThirdColumn}</div>
                      </Panel>
                    </div>
                  ) : null}
                </>
              ) : null}

              {mode === 'cleanup' ? (
                <>
                  <Panel title="Cleanup Profiles" subtitle="Selected cleanup category." scroll>
                    <ListColumn
                      entries={[
                        {
                          id: selectedCleanup.id,
                          title: selectedCleanup.title,
                          subtitle: selectedCleanup.subtitle,
                        },
                      ]}
                      activeId={cleanupMode}
                      onSelect={() => undefined}
                      wrapText
                    />
                  </Panel>
                  <Panel
                    title={selectedCleanup.title}
                    subtitle={selectedCleanup.subtitle}
                    wide
                    header={false}
                  >
                    <div className="h-full min-h-0 overflow-y-auto p-4 lg:p-5">{cleanupSecondColumn}</div>
                  </Panel>
                  {summary ? (
                    <div className="min-h-0">
                      <Panel title={summary.title} subtitle="Cleanup scan results expand into this right-side column." wide header={false}>
                        <div className="h-full min-h-0 overflow-hidden p-4 lg:p-5">{cleanupThirdColumn}</div>
                      </Panel>
                    </div>
                  ) : null}
                </>
              ) : null}

              {mode === 'brew' ? (
                <>
                  <Panel title="Installed Packages" subtitle={brewEntry.subtitle} scroll>
                    <div className="border-b border-black/6 px-5 py-4 space-y-3">
                      <div className="flex items-center gap-3 rounded-[18px] border border-black/6 bg-[#FAFAFC] px-4 py-3">
                        <Search className="h-4 w-4 text-[#9EA2AE]" />
                        <input
                          value={brewSearchQuery}
                          onChange={(event) => onBrewSearchChange(event.target.value)}
                          placeholder="Search packages"
                          className="w-full bg-transparent text-sm text-[#111215] outline-none placeholder:text-[#9EA2AE]"
                        />
                      </div>
                      <div className="flex justify-center gap-2">
                        {(['all', 'updated', 'pending'] as const).map((filter) => {
                          const labels = {all: 'Todos', updated: 'Atualizados', pending: 'Pendentes'};
                          const isActive = brewFilter === filter;
                          return (
                            <button
                              key={filter}
                              onClick={() => onBrewFilterChange(filter)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                isActive
                                  ? 'bg-[#111215] text-white'
                                  : 'bg-[#F2F3F5] text-[#6B6F7B] hover:bg-[#E8E9EC]'
                              }`}
                            >
                              {labels[filter]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {brewListColumn}
                  </Panel>
                  <div className="min-h-0">
                    <Panel
                      title={selectedBrewPackage ? selectedBrewPackage.name : 'Package Detail'}
                      subtitle={selectedBrewOutdated ? `Update available: ${selectedBrewOutdated.currentVersion} → ${selectedBrewOutdated.latestVersion}` : 'View package information and upgrade options.'}
                      wide
                      scroll
                      header={false}
                    >
                      <div className="p-4 lg:p-5">{brewDetailColumn}</div>
                    </Panel>
                  </div>
                </>
              ) : null}

              {mode === 'settings' ? (
                <>
                  <Panel
                    title="Permissions"
                    subtitle="macOS capabilities that affect scan coverage and cleanup follow-up."
                    scroll
                  >
                    <div className="flex h-full flex-col">
                      <div className="shrink-0">
                        <ListColumn
                          entries={settingsWithStatus}
                          activeId={selectedSettingId}
                          onSelect={(entry) => setSelectedSettingId(entry.id)}
                          rightMeta={(entry) => permissionStatusLabel(entry.status)}
                        />
                      </div>
                    </div>
                  </Panel>
                  <Panel
                    title={selectedSetting.title}
                    subtitle="No additional right-side columns are created beyond this workspace."
                    wide
                    scroll
                    header={false}
                  >
                    <div className="p-4 lg:p-5">
                      <DetailCard
                        icon={
                          selectedSetting.status === 'granted' ? (
                            <CheckCircle2 className="h-6 w-6" />
                          ) : (
                            <ShieldAlert className="h-6 w-6" />
                          )
                        }
                        title={selectedSetting.title}
                        subtitle={selectedSetting.subtitle}
                        rightSlot={
                          <div className="flex flex-wrap justify-end gap-2">
                            <span
                              className={cn(
                                'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                                settingBadgeTone(selectedSetting.priority, selectedSetting.status),
                              )}
                            >
                              {settingBadgeLabel(selectedSetting.priority, selectedSetting.status)}
                            </span>
                          </div>
                        }
                      >
                        <div className="space-y-4">
                          <div className="rounded-[24px] border border-black/6 bg-white px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">
                              Why it matters
                            </p>
                            <p className="mt-3 text-sm leading-7 text-[#747785]">{selectedSetting.description}</p>
                          </div>

                          <div className="rounded-[24px] border border-black/6 bg-[#FAFAFC] px-4 py-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">
                                Current check
                              </p>
                              {permissionCheckLoading ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Checking
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm leading-7 text-[#747785]">{selectedSetting.statusDetail}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#747785]">
                              <span>
                                Last checked{' '}
                                {permissionSnapshot ? formatDate(permissionSnapshot.checkedAt) : 'when the first snapshot is available'}
                              </span>
                              {permissionCheckError ? <span className="text-rose-700">{permissionCheckError}</span> : null}
                            </div>
                          </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                void onOpenSystemSettings(selectedSetting.id);
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733]"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {selectedSetting.actionLabel}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void onRefreshPermissionSnapshot();
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
                            >
                              {permissionCheckLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                              Retry check
                            </button>
                          </div>
                        </div>
                      </DetailCard>
                    </div>
                  </Panel>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {confirmState.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111215]/54 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/30 bg-white p-6 shadow-[0_40px_120px_rgba(17,18,21,0.28)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF4E8] text-[#C2410C]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9EA2AE]">Final review</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#111215]">
                  Remove {confirmState.selectedItems.length} selected{' '}
                  {confirmState.selectedItems.length === 1 ? 'item' : 'items'}?
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#747785]">
                  Removal always stops here for one final confirmation before deleting anything.
                </p>
              </div>
            </div>

            <div className="mt-6 max-h-[300px] space-y-2 overflow-y-auto rounded-[24px] border border-black/6 bg-[#FAFAFC] p-4">
              {confirmState.selectedItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-black/6 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111215]">{item.label}</p>
                      <p className="mt-1 truncate text-xs text-[#747785]">{item.path}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  </div>
                </div>
              ))}
            </div>

            {confirmState.failures.length ? (
              <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-800">Some items failed previously</p>
                <div className="mt-3 space-y-2 text-sm text-rose-700">
                  {confirmState.failures.map((failure) => (
                    <div key={`${failure.path}-${failure.message}`} className="rounded-2xl bg-white/80 px-3 py-3">
                      <p className="break-all font-medium">{failure.path}</p>
                      <p className="mt-1">{failure.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancelRemoval}
                className="rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void onConfirmRemoval();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733]"
              >
                <Trash2 className="h-4 w-4" />
                Confirm removal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {permissionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111215]/54 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[32px] border border-white/30 bg-white p-6 shadow-[0_40px_120px_rgba(17,18,21,0.28)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF4E8] text-[#C2410C]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9EA2AE]">Permission required</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111215]">
                  Full Disk Access needed
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#747785]">
                  macOS protects Library folders by default. Grant Full Disk Access in Settings so the scan can inspect Application Support, Containers, Caches, and other hidden locations.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onPermissionModalClose}
                className="rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onGoToSettings}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733]"
              >
                <Settings className="h-4 w-4" />
                Open Settings
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
