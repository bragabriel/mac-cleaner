import {useEffect, useMemo, useRef, useState} from 'react';
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

type BrowserColumn = {
  key: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
};

const cleanupEntries: Array<{
  id: CleanupMode;
  title: string;
  subtitle: string;
  roots: string[];
  icon: typeof Sparkles;
}> = [
  {
    id: 'residues',
    title: 'Orphan Files',
    subtitle: 'Leftovers from apps that already left the Mac.',
    roots: [
      '~/Library/Application Support',
      '~/Library/Containers',
      '~/Library/Group Containers',
      '~/Library/Preferences',
      '~/Library/Logs',
    ],
    icon: Sparkles,
  },
  {
    id: 'system',
    title: 'System Junk',
    subtitle: 'Caches, logs, and stale application state.',
    roots: ['~/Library/Caches', '~/Library/Logs', '~/Library/Saved Application State', '~/Library/WebKit', '/private/var/tmp'],
    icon: Trash2,
  },
];

const homeEntries = [
  {
    id: 'home-uninstall',
    title: 'Uninstall Apps',
    subtitle: 'Browse installed apps, inspect them, and remove the bundle plus residues.',
    mode: 'uninstall' as const,
    icon: AppWindowMac,
  },
  {
    id: 'home-cleanup',
    title: 'Cleanup',
    subtitle: 'Use cleanup profiles to scan orphan files and generic junk.',
    mode: 'cleanup' as const,
    icon: Sparkles,
  },
  {
    id: 'home-startup',
    title: 'Startup Items',
    subtitle: 'Inspect login and launch behavior in a column flow.',
    mode: 'startup' as const,
    icon: ToggleRight,
  },
];

const startupEntries = [
  {
    id: 'login-items',
    title: 'Login Items',
    subtitle: 'Apps that launch after sign in.',
  },
  {
    id: 'launch-agents',
    title: 'Launch Agents',
    subtitle: 'User-level launchd tasks and helpers.',
  },
  {
    id: 'launch-daemons',
    title: 'Launch Daemons',
    subtitle: 'System launch services and background jobs.',
  },
];

const settingsEntries = [
  {
    id: 'privacy',
    title: 'Privacy Permissions',
    subtitle: 'Grant full disk access and transparency permissions.',
  },
  {
    id: 'scan-behavior',
    title: 'Scan Behavior',
    subtitle: 'Choose how aggressive the scan should be.',
  },
  {
    id: 'safety',
    title: 'Safety',
    subtitle: 'What always requires explicit confirmation.',
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

function renderListColumn<T extends {id: string; title: string; subtitle: string}>({
  entries,
  activeId,
  onSelect,
  rightMeta,
}: {
  entries: T[];
  activeId: string | null;
  onSelect: (entry: T) => void;
  rightMeta?: (entry: T) => React.ReactNode;
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

function Column({title, subtitle, children}: {title: string; subtitle?: string; children: React.ReactNode}) {
  return (
    <section className="finder-column flex h-full w-[340px] shrink-0 flex-col border-r border-black/6 bg-white last:border-r-0 xl:w-[380px]">
      <header className="border-b border-black/6 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9EA2AE]">{title}</p>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-[#747785]">{subtitle}</p> : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
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
  const columnsRef = useRef<HTMLDivElement | null>(null);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [selectedStartupId, setSelectedStartupId] = useState<string | null>(startupEntries[0]?.id ?? null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(settingsEntries[0]?.id ?? null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedResultId(summary?.items[0]?.id ?? null);
  }, [summary]);

  useEffect(() => {
    const container = columnsRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      left: container.scrollWidth,
      behavior: 'smooth',
    });
  });

  const selectedCleanup = cleanupEntries.find((entry) => entry.id === cleanupMode) ?? cleanupEntries[0];
  const selectedResult = summary?.items.find((item) => item.id === selectedResultId) ?? summary?.items[0] ?? null;
  const selectedCount = summary?.items.filter((item) => item.selected).length ?? 0;
  const selectedBytes = summary?.items.filter((item) => item.selected).reduce((total, item) => total + item.sizeBytes, 0) ?? 0;
  const progressValue = scanStatus.scanning || scanStatus.removing ? scanStatus.progress : summary ? 100 : 0;
  const canRunScan = mode === 'uninstall' ? Boolean(app) : mode === 'cleanup';

  const breadcrumbs = useMemo(() => {
    const path = ['Mac Cleaner'];

    if (mode === 'home') {
      path.push('Home');
    }

    if (mode === 'uninstall') {
      path.push('Uninstall Apps');
      if (app) {
        path.push(app.name);
      }
      if (summary) {
        path.push('Related Files');
      }
      if (selectedResult) {
        path.push(selectedResult.label);
      }
    }

    if (mode === 'cleanup') {
      path.push('Cleanup', selectedCleanup.title);
      if (summary) {
        path.push('Candidates');
      }
      if (selectedResult) {
        path.push(selectedResult.label);
      }
    }

    if (mode === 'startup') {
      path.push('Startup Items');
      const selected = startupEntries.find((entry) => entry.id === selectedStartupId);
      if (selected) {
        path.push(selected.title);
      }
    }

    if (mode === 'settings') {
      path.push('Settings');
      const selected = settingsEntries.find((entry) => entry.id === selectedSettingId);
      if (selected) {
        path.push(selected.title);
      }
    }

    return path;
  }, [app, mode, selectedCleanup.title, selectedResult, selectedSettingId, selectedStartupId, summary]);

  const columns: BrowserColumn[] = [];

  if (mode === 'home') {
    columns.push({
      key: 'home-list',
      title: 'Home',
      subtitle: 'Escolha por onde começar. O próximo clique abre uma nova coluna, sem trocar de página.',
      content: renderListColumn({
        entries: homeEntries,
        activeId: selectedHomeId,
        onSelect: (entry) => {
          setSelectedHomeId(entry.id);
          onModeChange(entry.mode);
        },
      }),
    });

    if (selectedHomeId) {
      const selectedHome = homeEntries.find((entry) => entry.id === selectedHomeId) ?? null;
      if (selectedHome) {
        const Icon = selectedHome.icon;
        columns.push({
          key: 'home-detail',
          title: selectedHome.title,
          subtitle: 'Atalho de navegação para abrir a área certa sem perder o contexto do browser.',
          content: (
            <div className="p-5">
              <div className="rounded-[24px] border border-black/6 bg-[#FAFAFC] p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1EEFF] text-[#7263FF]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{selectedHome.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#747785]">{selectedHome.subtitle}</p>
                <button
                  type="button"
                  onClick={() => onModeChange(selectedHome.mode)}
                  className="mt-5 rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733]"
                >
                  Open this section
                </button>
              </div>
            </div>
          ),
        });
      }
    }
  }

  if (mode === 'uninstall') {
    columns.push({
      key: 'apps-list',
      title: 'Applications',
      subtitle: 'Lista instalada. Escolher um app abre a próxima coluna com os detalhes.',
      content: (
        <div className="flex h-full flex-col">
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
          {renderListColumn({
            entries: apps.map((entry) => ({
              id: entry.id,
              title: entry.name,
              subtitle: entry.bundleId || entry.appPath,
              sizeText: formatBytes(entry.sizeBytes),
            })),
            activeId: app?.id ?? null,
            onSelect: (entry) => {
              const selectedApp = apps.find((item) => item.id === entry.id);
              if (selectedApp) {
                onSelectApp(selectedApp);
              }
            },
            rightMeta: (entry) => entry.sizeText,
          })}
        </div>
      ),
    });

    if (app) {
      columns.push({
        key: `app-${app.id}`,
        title: app.name,
        subtitle: 'Detalhes do aplicativo. Rodar o scan profundo abre a próxima coluna com os arquivos relacionados.',
        content: (
          <div className="p-5">
            <div className="rounded-[24px] border border-black/6 bg-[#FAFAFC] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#F1EEFF] text-[#7263FF]">
                    <AppWindowMac className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{app.name}</h3>
                    <p className="mt-2 text-sm text-[#747785]">{app.bundleId || 'Bundle ID unavailable'}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">App size</p>
                  <p className="mt-1 text-sm font-semibold text-[#111215]">{formatBytes(app.sizeBytes)}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Installed path</p>
                <p className="mt-2 text-sm text-[#111215]">{app.appPath}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void onRunScan();
                  }}
                  disabled={scanStatus.scanning || scanStatus.removing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {scanStatus.scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppWindowMac className="h-4 w-4" />}
                  {scanStatus.scanning ? 'Scanning...' : 'Scan related files'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onOpenPath(app.appPath);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Finder
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-black/6 bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Finder pattern</p>
                <p className="mt-2 text-sm leading-6 text-[#747785]">
                  Esta coluna não some quando o scan rodar. O resultado abre à direita, como próxima etapa da navegação.
                </p>
              </div>
            </div>
          </div>
        ),
      });
    }
  }

  if (mode === 'cleanup') {
    columns.push({
      key: 'cleanup-list',
      title: 'Cleanup Profiles',
      subtitle: 'Escolha o tipo de limpeza. O detalhe abre na coluna seguinte e o scan gera outra coluna à direita.',
      content: renderListColumn({
        entries: cleanupEntries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          subtitle: entry.subtitle,
        })),
        activeId: cleanupMode,
        onSelect: (entry) => {
          onCleanupModeChange(entry.id as CleanupMode);
        },
      }),
    });

    columns.push({
      key: `cleanup-${selectedCleanup.id}`,
      title: selectedCleanup.title,
      subtitle: 'Perfil ativo. Rodar o scan agora preserva esta coluna e abre candidatos à direita.',
      content: (
        <div className="p-5">
          <div className="rounded-[24px] border border-black/6 bg-[#FAFAFC] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#F1EEFF] text-[#7263FF]">
                <selectedCleanup.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{selectedCleanup.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#747785]">{selectedCleanup.subtitle}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Roots inspected</p>
              <div className="mt-3 space-y-2">
                {selectedCleanup.roots.map((root) => (
                  <div key={root} className="rounded-2xl bg-[#FAFAFC] px-3 py-3 text-sm text-[#111215]">
                    {root}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  void onRunScan();
                }}
                disabled={scanStatus.scanning || scanStatus.removing}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#111215] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {scanStatus.scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
                {scanStatus.scanning ? 'Scanning...' : 'Run cleanup scan'}
              </button>
              <button
                type="button"
                onClick={onOpenPrivacySettings}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
              >
                <ShieldAlert className="h-4 w-4" />
                Review permissions
              </button>
            </div>
          </div>
        </div>
      ),
    });
  }

  if (summary) {
    columns.push({
      key: `results-${summary.mode}`,
      title: summary.title,
      subtitle: 'Resultados do scan. Selecionar um item abre a coluna seguinte com o detalhe.',
      content: (
        <div className="flex h-full flex-col">
          <div className="border-b border-black/6 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111215]">{selectedCount} selected</p>
                <p className="mt-1 text-xs text-[#747785]">{formatBytes(selectedBytes)} ready for removal</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleAll}
                  className="rounded-2xl border border-black/6 bg-[#FAFAFC] px-3 py-2 text-xs font-semibold text-[#111215] transition hover:bg-[#F0F1F5]"
                >
                  {selectedCount === summary.items.length ? 'Unselect all' : 'Select all'}
                </button>
                <button
                  type="button"
                  onClick={onRemoveSelected}
                  disabled={!selectedCount || scanStatus.scanning || scanStatus.removing}
                  className="rounded-2xl bg-[#111215] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#252733] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[#E7E8EE]">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,#7263FF_0%,#9E95FF_100%)] transition-all duration-300"
                style={{width: `${progressValue}%`}}
              />
            </div>
          </div>

          {renderListColumn({
            entries: summary.items.map((entry) => ({
              id: entry.id,
              title: entry.label,
              subtitle: entry.path,
              confidence: entry.confidence,
              selected: Boolean(entry.selected),
            })),
            activeId: selectedResult?.id ?? null,
            onSelect: (entry) => setSelectedResultId(entry.id),
            rightMeta: (entry) => (entry.selected ? 'Queued' : entry.confidence),
          })}
        </div>
      ),
    });
  }

  if (summary && selectedResult) {
    columns.push({
      key: `result-detail-${selectedResult.id}`,
      title: selectedResult.label,
      subtitle: 'Detalhe do item selecionado. O caminho completo continua visível nas colunas anteriores.',
      content: (
        <div className="p-5">
          <div className="rounded-[24px] border border-black/6 bg-[#FAFAFC] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  'rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                  confidenceTone(selectedResult.confidence),
                ].join(' ')}
              >
                {selectedResult.confidence}
              </span>
              <span className="rounded-full border border-black/6 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#747785]">
                {categoryLabel(selectedResult.category)}
              </span>
              {selectedResult.appName ? (
                <span className="rounded-full border border-black/6 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#747785]">
                  {selectedResult.appName}
                </span>
              ) : null}
            </div>

            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{selectedResult.label}</h3>
            <p className="mt-3 text-sm leading-7 text-[#747785]">{selectedResult.reason}</p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Size</p>
                <p className="mt-2 text-sm font-semibold text-[#111215]">{formatBytes(selectedResult.sizeBytes)}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Modified</p>
                <p className="mt-2 text-sm font-semibold text-[#111215]">{formatDate(selectedResult.modifiedAt)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9EA2AE]">Filesystem path</p>
              <p className="mt-2 break-all text-sm text-[#111215]">{selectedResult.path}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-3 rounded-2xl border border-black/6 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(selectedResult.selected)}
                  onChange={() => onToggleItem(selectedResult.id)}
                  className="h-4 w-4 rounded border-[#C8CBD4] text-[#7263FF] focus:ring-[#7263FF]"
                />
                <span className="text-sm font-semibold text-[#111215]">Include in removal</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  void onCopyPath(selectedResult.path);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
              >
                <Copy className="h-4 w-4" />
                Copy path
              </button>
              <button
                type="button"
                onClick={() => {
                  void onRevealPath(selectedResult.path);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
              >
                <FolderOpen className="h-4 w-4" />
                Reveal
              </button>
              <button
                type="button"
                onClick={() => {
                  void onOpenPath(selectedResult.path);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </button>
            </div>
          </div>
        </div>
      ),
    });
  }

  if (mode === 'startup') {
    columns.push({
      key: 'startup-list',
      title: 'Startup Items',
      subtitle: 'Estrutura pronta para seguir o mesmo padrão Finder quando essa área ganhar dados reais.',
      content: renderListColumn({
        entries: startupEntries,
        activeId: selectedStartupId,
        onSelect: (entry) => setSelectedStartupId(entry.id),
      }),
    });

    const selectedStartup = startupEntries.find((entry) => entry.id === selectedStartupId) ?? startupEntries[0];
    columns.push({
      key: 'startup-detail',
      title: selectedStartup.title,
      subtitle: 'Coluna de detalhe preservando a navegação anterior.',
      content: (
        <div className="p-5">
          <div className="rounded-[24px] border border-black/6 bg-[#FAFAFC] p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#F1EEFF] text-[#7263FF]">
              <ToggleRight className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{selectedStartup.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#747785]">{selectedStartup.subtitle}</p>
            <p className="mt-5 rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-[#747785]">
              Esta área ainda é placeholder, mas já obedece à navegação acumulativa por colunas em vez de telas separadas.
            </p>
          </div>
        </div>
      ),
    });
  }

  if (mode === 'settings') {
    columns.push({
      key: 'settings-list',
      title: 'Settings',
      subtitle: 'Sessões de configuração usando a mesma navegação por coluna.',
      content: renderListColumn({
        entries: settingsEntries,
        activeId: selectedSettingId,
        onSelect: (entry) => setSelectedSettingId(entry.id),
      }),
    });

    const selectedSetting = settingsEntries.find((entry) => entry.id === selectedSettingId) ?? settingsEntries[0];
    columns.push({
      key: 'settings-detail',
      title: selectedSetting.title,
      subtitle: 'Detalhe da sessão de configuração atualmente selecionada.',
      content: (
        <div className="p-5">
          <div className="rounded-[24px] border border-black/6 bg-[#FAFAFC] p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#F1EEFF] text-[#7263FF]">
              <Settings className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#111215]">{selectedSetting.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#747785]">{selectedSetting.subtitle}</p>
            <div className="mt-5 rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-[#747785]">
              {selectedSetting.id === 'privacy'
                ? 'Use esta área para abrir permissões do macOS e explicar por que certas pastas protegidas podem não aparecer no scan.'
                : selectedSetting.id === 'scan-behavior'
                  ? 'Use esta área para agressividade do scan, filtros e roots incluídos.'
                  : 'Use esta área para defaults de confirmação, regras seguras e remoção controlada.'}
            </div>
          </div>
        </div>
      ),
    });
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
      <header className="border-b border-black/6 bg-white/72 px-5 py-4 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9EA2AE]">Finder style navigation</p>
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
                {scanStatus.scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'uninstall' ? <AppWindowMac className="h-4 w-4" /> : <HardDriveDownload className="h-4 w-4" />}
                {scanStatus.scanning ? 'Scanning...' : mode === 'uninstall' ? 'Scan app' : 'Run cleanup'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-3 lg:p-4">
        <div className="h-full overflow-hidden rounded-[30px] border border-black/8 bg-white shadow-[0_30px_80px_rgba(17,18,21,0.08)]">
          <div ref={columnsRef} className="flex h-full overflow-x-auto overflow-y-hidden">
            {columns.map((column) => (
              <Column key={column.key} title={column.title} subtitle={column.subtitle}>
                {column.content}
              </Column>
            ))}
          </div>
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
                  Remove {confirmState.selectedItems.length} selected {confirmState.selectedItems.length === 1 ? 'item' : 'items'}?
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#747785]">
                  A remoção continua com modal final. O Finder-like vale para navegar, não para pular confirmação.
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
                <p className="text-sm font-semibold text-rose-800">Previous removal failures</p>
                <div className="mt-3 space-y-2">
                  {confirmState.failures.map((failure) => (
                    <div key={`${failure.path}-${failure.message}`} className="rounded-2xl border border-rose-200 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-rose-900">{failure.path}</p>
                      <p className="mt-1 text-xs text-rose-700">{failure.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancelRemoval}
                className="rounded-2xl border border-black/6 bg-white px-5 py-3 text-sm font-semibold text-[#111215] transition hover:bg-[#F4F4F8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void onConfirmRemoval();
                }}
                className="rounded-2xl bg-[#111215] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#252733]"
              >
                Confirm removal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
