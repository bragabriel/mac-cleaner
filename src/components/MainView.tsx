import {type ReactNode, useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  AppWindowMac,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderOpen,
  HardDriveDownload,
  Home,
  Loader2,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import type {AppItem, CleanupMode, ProductMode, RemovalFailure, ScanItem, ScanStatus, ScanSummary} from '../types';

interface MainViewProps {
  mode: ProductMode;
  cleanupMode: CleanupMode;
  app: AppItem | null;
  apps: AppItem[];
  searchQuery: string;
  summary: ScanSummary | null;
  scanStatus: ScanStatus;
  usingDesktopApi: boolean;
  onModeChange: (mode: ProductMode) => void;
  onCleanupModeChange: (mode: CleanupMode) => void;
  onSelectApp: (app: AppItem) => void;
  onSearchChange: (value: string) => void;
  onRunScan: () => void | Promise<void>;
  onToggleItem: (itemId: string) => void;
  onToggleAll: () => void;
  onOpenPrivacySettings: () => void | Promise<void>;
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
    title: 'Residues',
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
    id: 'home-startup',
    title: 'Startup Items',
    subtitle: 'Keep launch agents and login items visible without adding more side columns.',
    mode: 'startup',
    icon: ToggleRight,
  },
  {
    id: 'home-settings',
    title: 'Settings',
    subtitle: 'Permissions, scan behavior, and safety defaults in the same final column pattern.',
    mode: 'settings',
    icon: Settings,
  },
];

const startupEntries = [
  {
    id: 'login-items',
    title: 'Login Items',
    subtitle: 'Apps configured to launch when the user session starts.',
  },
  {
    id: 'launch-agents',
    title: 'Launch Agents',
    subtitle: 'Per-user launchd services and helper jobs.',
  },
  {
    id: 'launch-daemons',
    title: 'Launch Daemons',
    subtitle: 'System-wide launchd services and background processes.',
  },
];

const settingsEntries = [
  {
    id: 'privacy',
    title: 'Privacy Permissions',
    subtitle: 'Explain required macOS permissions and why scans may miss protected folders.',
  },
  {
    id: 'scan-behavior',
    title: 'Scan Behavior',
    subtitle: 'Tune how aggressive scans should be and which roots are included.',
  },
  {
    id: 'safety',
    title: 'Safety',
    subtitle: 'Define confirmation defaults and guardrails for destructive operations.',
  },
];

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
  wide = false,
  scroll = false,
  header = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  scroll?: boolean;
  header?: boolean;
}) {
  return (
    <section
      className={[
        'flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-black/6 bg-white',
        wide ? 'min-w-0' : '',
      ].join(' ')}
    >
      {header ? (
        <header className="border-b border-black/6 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9EA2AE]">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-[#747785]">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className={scroll ? 'min-h-0 flex-1 overflow-y-auto' : 'min-h-0 flex-1'}>{children}</div>
    </section>
  );
}

function ListColumn<T extends {id: string; title: string; subtitle: string}>({
  entries,
  activeId,
  onSelect,
  rightMeta,
}: {
  entries: T[];
  activeId: string | null;
  onSelect: (entry: T) => void;
  rightMeta?: (entry: T) => ReactNode;
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
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#111215]">{entry.title}</p>
              <p className="mt-1 truncate text-xs text-[#747785]">{entry.subtitle}</p>
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#F1EEFF] text-[#7263FF]">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-[#747785]">{subtitle}</p>
          </div>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
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
  usingDesktopApi,
  onModeChange,
  onCleanupModeChange,
  onSelectApp,
  onSearchChange,
  onRunScan,
  onToggleItem,
  onToggleAll,
  onOpenPrivacySettings,
  onCopyPath,
  onRevealPath,
  onOpenPath,
  onRemoveSelected,
  confirmState,
  onConfirmRemoval,
  onCancelRemoval,
}: MainViewProps) {
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [selectedStartupId, setSelectedStartupId] = useState<string | null>(startupEntries[0]?.id ?? null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(settingsEntries[0]?.id ?? null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedResultId(summary?.items[0]?.id ?? null);
  }, [summary]);

  const selectedCleanup = cleanupEntries.find((entry) => entry.id === cleanupMode) ?? cleanupEntries[0];
  const selectedStartup = startupEntries.find((entry) => entry.id === selectedStartupId) ?? startupEntries[0];
  const selectedSetting = settingsEntries.find((entry) => entry.id === selectedSettingId) ?? settingsEntries[0];
  const summaryItems = summary?.items ?? [];
  const scannedRoots = summary?.scannedRoots ?? [];
  const inaccessibleRoots = summary?.inaccessibleRoots ?? [];
  const selectedResult = summaryItems.find((item) => item.id === selectedResultId) ?? summaryItems[0] ?? null;
  const selectedCount = summary?.items.filter((item) => item.selected).length ?? 0;
  const selectedBytes =
    summary?.items.filter((item) => item.selected).reduce((total, item) => total + item.sizeBytes, 0) ?? 0;
  const progressValue = scanStatus.scanning || scanStatus.removing ? scanStatus.progress : summary ? 100 : 0;
  const canRunScan = mode === 'uninstall' ? Boolean(app) : mode === 'cleanup';

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

    if (mode === 'startup') {
      path.push('Startup', selectedStartup.title);
      return path;
    }

    path.push('Settings', selectedSetting.title);
    return path;
  }, [app, mode, selectedCleanup.title, selectedResult, selectedSetting.title, selectedStartup.title]);

  const summaryPanel =
    summary && (mode === 'uninstall' || mode === 'cleanup') ? (
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-black/6 bg-white">
        <div className="border-b border-black/6 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Scan Results</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{summary.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[#747785]">
                {summary.subtitle || `${summaryItems.length} candidates found. Review, select, and remove here.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:min-w-[250px]">
              <InfoChip label="Selected" value={`${selectedCount} of ${summaryItems.length}`} />
              <InfoChip label="Selected Size" value={formatBytes(selectedBytes)} />
            </div>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#E7E8EE]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#7263FF_0%,#9E95FF_100%)]"
              style={{width: `${progressValue}%`}}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3 text-xs text-[#747785]">
              <span className="rounded-full border border-black/6 bg-[#FAFAFC] px-3 py-1.5">
                {scannedRoots.length} roots scanned
              </span>
              {inaccessibleRoots.length ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">
                  {inaccessibleRoots.length} restricted roots
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onToggleAll}
                className="rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
              >
                {selectedCount === summaryItems.length ? 'Unselect all' : 'Select all'}
              </button>
              <button
                type="button"
                onClick={onRemoveSelected}
                disabled={!selectedCount || scanStatus.removing}
                className="rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Remove {selectedCount} selected
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 border-t border-black/6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="min-h-0 overflow-hidden border-b border-black/6 xl:border-b-0 xl:border-r xl:border-black/6">
            <div className="h-full overflow-y-auto">
              {summaryItems.length ? (
                summaryItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedResultId(item.id)}
                    className={[
                      'flex w-full items-start gap-4 border-b border-black/6 px-5 py-4 text-left transition last:border-b-0',
                      selectedResult?.id === item.id ? 'bg-[#F4F1FF]' : 'bg-white hover:bg-[#FAFAFC]',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected ?? false}
                      onChange={() => onToggleItem(item.id)}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-0.5 h-4 w-4 rounded border-[#C8CBD4] text-[#7263FF] focus:ring-[#7263FF]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#111215]">{item.label}</p>
                        <span
                          className={[
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
                            confidenceTone(item.confidence),
                          ].join(' ')}
                        >
                          {item.confidence}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-[#747785]">{item.path}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#747785]">
                        <span>{categoryLabel(item.category)}</span>
                        <span>{formatBytes(item.sizeBytes)}</span>
                        <span>{formatDate(item.modifiedAt)}</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-5 py-8 text-sm text-[#747785]">Nothing found in this scan.</div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden bg-[#FAFAFC]">
            <div className="h-full overflow-y-auto p-5">
              {selectedResult ? (
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-black/6 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">
                          Selected item
                        </p>
                        <h4 className="mt-2 text-lg font-semibold text-[#111215]">{selectedResult.label}</h4>
                      </div>
                      <span
                        className={[
                          'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                          confidenceTone(selectedResult.confidence),
                        ].join(' ')}
                      >
                        {selectedResult.confidence} confidence
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-[#747785]">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Path</p>
                        <p className="mt-1 break-all text-[#111215]">{selectedResult.path}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoChip label="Type" value={categoryLabel(selectedResult.category)} />
                        <InfoChip label="Size" value={formatBytes(selectedResult.sizeBytes)} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoChip label="Modified" value={formatDate(selectedResult.modifiedAt)} />
                        <InfoChip label="Scope" value={selectedResult.appName || 'App not identified'} />
                      </div>
                      <div className="rounded-2xl border border-black/6 bg-[#FAFAFC] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Reason</p>
                        <p className="mt-2 leading-7">{selectedResult.reason}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        void onCopyPath(selectedResult.path);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
                    >
                      <Copy className="h-4 w-4" />
                      Copy path
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onRevealPath(selectedResult.path);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Reveal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onOpenPath(selectedResult.path);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </button>
                  </div>

                  {scannedRoots.length ? (
                    <div className="rounded-[22px] border border-black/6 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Scanned roots</p>
                      <div className="mt-3 space-y-2">
                        {scannedRoots.map((root) => (
                          <div key={root} className="rounded-2xl bg-[#FAFAFC] px-3 py-3 text-sm text-[#111215]">
                            {root}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {inaccessibleRoots.length ? (
                    <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Restricted roots
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-amber-800">
                        {inaccessibleRoots.map((root) => (
                          <div key={root} className="rounded-2xl bg-white/70 px-3 py-3">
                            {root}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-black/6 bg-white px-4 py-5 text-sm leading-7 text-[#747785]">
                  Select a result to inspect its path, confidence, and actions here. Nothing else opens to the right.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    ) : null;

  const uninstallSecondColumn = app ? (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DetailCard
        icon={<AppWindowMac className="h-6 w-6" />}
        title={app.name}
        subtitle="App details, storage footprint, and related actions stay at the top of the final column."
        rightSlot={<InfoChip label="App Size" value={formatBytes(app.sizeBytes)} />}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)]">
          <div className="rounded-2xl bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Installed path</p>
            <p className="mt-2 break-all text-sm text-[#111215]">{app.appPath}</p>
            <p className="mt-2 text-sm text-[#747785]">{app.bundleId || 'Bundle ID unavailable'}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <button
              type="button"
              onClick={() => {
                void onRunScan();
              }}
              disabled={scanStatus.scanning || scanStatus.removing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {scanStatus.scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppWindowMac className="h-4 w-4" />}
              {scanStatus.scanning ? 'Scanning...' : 'Scan related files'}
            </button>
            <button
              type="button"
              onClick={() => {
                void onOpenPath(app.appPath);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Finder
            </button>
          </div>
        </div>
      </DetailCard>

      <div className="min-h-0 flex-1 overflow-hidden">
        {summaryPanel ? (
          summaryPanel
        ) : (
          <div className="rounded-[26px] border border-dashed border-black/6 bg-white px-5 py-6 text-sm leading-7 text-[#747785]">
            Run a scan and the results will appear below this detail card inside the same final column.
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="rounded-[26px] border border-dashed border-black/6 bg-white px-5 py-6 text-sm leading-7 text-[#747785]">
      Select an app from the first column to open the final workspace column.
    </div>
  );

  const uninstallThirdColumn = app ? (
    summary ? (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-black/6 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/6 px-4 py-4 lg:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9EA2AE]">Scan results</p>
                  <p className="mt-1 text-sm text-[#747785]">{summaryItems.length} leftovers found</p>
          </div>
          <button
            type="button"
            onClick={onToggleAll}
            className="text-sm font-semibold text-[#7263FF] transition hover:text-[#5748E5]"
          >
                  {selectedCount === summaryItems.length ? 'Unselect all' : 'Select all'}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
                {summaryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedResultId(item.id)}
              className={cn(
                'flex w-full items-start gap-4 border-b border-black/6 px-4 py-4 text-left transition last:border-b-0 lg:px-5',
                selectedResult?.id === item.id ? 'bg-[#F4F1FF]' : 'bg-white hover:bg-[#F8F7FB]',
              )}
            >
              <input
                type="checkbox"
                checked={item.selected}
                onChange={(event) => {
                  event.stopPropagation();
                  onToggleItem(item.id);
                }}
                className="mt-1 h-4 w-4 rounded border-[#C8CBD4] text-[#7263FF] focus:ring-[#7263FF]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111215]">{item.label}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#9EA2AE]">{item.category}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-black/6 bg-white/70 px-3 py-1 text-[11px] text-[#747785]">
                    {formatBytes(item.sizeBytes)}
                  </span>
                </div>
                <p className="mt-3 break-all text-[11px] text-[#747785]">{item.path}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/6 px-4 py-4 lg:px-5">
          <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747785]">
            {usingDesktopApi ? 'Live Mac access' : 'Preview mode'}
          </span>
          <button
            type="button"
            onClick={onConfirmRemoval}
            disabled={selectedCount === 0 || scanStatus.removing}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#111215] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {scanStatus.removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
            {scanStatus.removing ? 'Removing...' : `Remove ${selectedCount} selected item${selectedCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    ) : (
      <div className="flex h-full items-center justify-center rounded-[26px] border border-dashed border-black/8 bg-white/70 px-6 py-10 text-center text-sm leading-7 text-[#747785]">
        Run the scan to open the right-side results column.
      </div>
    )
  ) : null;

  const cleanupSecondColumn = (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DetailCard
        icon={<selectedCleanup.icon className="h-6 w-6" />}
        title={selectedCleanup.title}
        subtitle="The profile summary stays compact so scan results can grow underneath without changing the window height."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)]">
          <div className="rounded-2xl bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Roots inspected</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {selectedCleanup.roots.map((root) => (
                <div key={root} className="rounded-2xl bg-[#FAFAFC] px-3 py-3 text-sm text-[#111215]">
                  {root}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <button
              type="button"
              onClick={() => {
                void onRunScan();
              }}
              disabled={scanStatus.scanning || scanStatus.removing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {scanStatus.scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
              {scanStatus.scanning ? 'Scanning...' : 'Run cleanup scan'}
            </button>
            <button
              type="button"
              onClick={onOpenPrivacySettings}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
            >
              <ShieldAlert className="h-4 w-4" />
              Review permissions
            </button>
          </div>
        </div>
      </DetailCard>

      <div className="min-h-0 flex-1 overflow-hidden">
        {summaryPanel ? (
          summaryPanel
        ) : (
          <div className="rounded-[26px] border border-dashed border-black/6 bg-white px-5 py-6 text-sm leading-7 text-[#747785]">
            Run a cleanup scan and the review list will grow downward here inside the final column.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
      <header className="border-b border-black/6 bg-white/72 px-5 py-4 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
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

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747785]">
              {usingDesktopApi ? 'Live Mac access' : 'Preview mode'}
            </span>

            {(mode === 'uninstall' || mode === 'cleanup') && (
              <button
                type="button"
                onClick={() => {
                  void onRunScan();
                }}
                disabled={!canRunScan || scanStatus.scanning || scanStatus.removing}
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
                <div className="rounded-[28px] border border-black/6 bg-[#FAFAFC] p-6 lg:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9EA2AE]">Home</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#111215]">
                    Choose what you want to clean or manage.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#747785]">
                    Every operational area stops at two content columns. Anything deeper continues vertically inside the
                    final panel.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                        className="group rounded-[28px] border border-black/6 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-black/12 hover:shadow-[0_24px_60px_rgba(17,18,21,0.08)]"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#F1EEFF] text-[#7263FF]">
                          <Icon className="h-7 w-7" />
                        </div>
                        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{entry.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-[#747785]">{entry.subtitle}</p>
                        <p className="mt-5 text-sm font-semibold text-[#111215]">Open section</p>
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
                  ? 'md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[minmax(260px,0.85fr)_minmax(320px,1fr)_minmax(320px,0.95fr)]'
                  : 'md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]',
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
                      }))}
                      activeId={app?.id ?? null}
                      onSelect={(entry) => {
                        const selectedApp = apps.find((item) => item.id === entry.id);
                        if (selectedApp) {
                          onSelectApp(selectedApp);
                        }
                      }}
                      rightMeta={(entry) => entry.sizeText}
                    />
                  </Panel>
                  <Panel title={app ? app.name : 'App Workspace'} subtitle="Middle column for the selected app." wide header={false}>
                    <div className="h-full min-h-0 overflow-hidden p-4 lg:p-5">{uninstallSecondColumn}</div>
                  </Panel>
                  {app ? (
                    <Panel title={summary ? summary.title : 'Scan Results'} subtitle="Scanned items expand into this right-side column." wide header={false}>
                      <div className="h-full min-h-0 overflow-hidden p-4 lg:p-5">{uninstallThirdColumn}</div>
                    </Panel>
                  ) : null}
                </>
              ) : null}

              {mode === 'cleanup' ? (
                <>
                  <Panel title="Cleanup Profiles" subtitle="Choose the cleanup category you want to inspect." scroll>
                    <ListColumn
                      entries={cleanupEntries.map((entry) => ({
                        id: entry.id,
                        title: entry.title,
                        subtitle: entry.subtitle,
                      }))}
                      activeId={cleanupMode}
                      onSelect={(entry) => onCleanupModeChange(entry.id as CleanupMode)}
                    />
                  </Panel>
                  <Panel
                    title={selectedCleanup.title}
                    subtitle="Profile details stay at the top. Scan review expands underneath in the same panel."
                    wide
                    header={false}
                  >
                    <div className="h-full min-h-0 p-4 lg:p-5">{cleanupSecondColumn}</div>
                  </Panel>
                </>
              ) : null}

              {mode === 'startup' ? (
                <>
                  <Panel title="Startup Items" subtitle="Startup inventory placeholder until this area gets live system data." scroll>
                    <ListColumn
                      entries={startupEntries}
                      activeId={selectedStartupId}
                      onSelect={(entry) => setSelectedStartupId(entry.id)}
                    />
                  </Panel>
                  <Panel
                    title={selectedStartup.title}
                    subtitle="The detail view uses the same final-column rule as the rest of the app."
                    wide
                    scroll
                    header={false}
                  >
                    <div className="p-4 lg:p-5">
                      <DetailCard
                        icon={<ToggleRight className="h-6 w-6" />}
                        title={selectedStartup.title}
                        subtitle={selectedStartup.subtitle}
                      >
                        <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-[#747785]">
                          This area is still placeholder data, but the layout now obeys the same hierarchy cap:
                          first list column, second detail column, and everything else vertical inside the detail
                          workspace.
                        </div>
                      </DetailCard>
                    </div>
                  </Panel>
                </>
              ) : null}

              {mode === 'settings' ? (
                <>
                  <Panel title="Settings" subtitle="Configuration sections using the same two-column navigation rule." scroll>
                    <ListColumn
                      entries={settingsEntries}
                      activeId={selectedSettingId}
                      onSelect={(entry) => setSelectedSettingId(entry.id)}
                    />
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
                        icon={<Settings className="h-6 w-6" />}
                        title={selectedSetting.title}
                        subtitle={selectedSetting.subtitle}
                      >
                        <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-[#747785]">
                          {selectedSetting.id === 'privacy'
                            ? 'Use this area to explain required macOS permissions and open the corresponding system settings.'
                            : selectedSetting.id === 'scan-behavior'
                              ? 'Use this area for scan depth, filters, and future cleanup scope toggles.'
                              : 'Use this area for confirmation defaults, safe removals, and guardrails.'}
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
    </main>
  );
}
