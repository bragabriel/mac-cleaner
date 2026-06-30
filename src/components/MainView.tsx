import { CheckCircle2, ChevronDown, ChevronRight, Copy, ExternalLink, FolderOpen, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppItem, ProductMode, RemovalFailure, ScanItem, ScanStatus, ScanSummary } from '../types';

interface MainViewProps {
  mode: ProductMode;
  app: AppItem | null;
  apps: AppItem[];
  searchQuery: string;
  summary: ScanSummary | null;
  scanStatus: ScanStatus;
  usingDesktopApi: boolean;
  onModeChange: (mode: ProductMode) => void;
  onSelectApp: (app: AppItem) => void;
  onSearchChange: (value: string) => void;
  onRunScan: () => void;
  onToggleItem: (itemId: string) => void;
  onToggleAll: () => void;
  onOpenPrivacySettings: () => void;
  onCopyPath: (path: string) => void;
  onRevealPath: (path: string) => void;
  onOpenPath: (path: string) => void;
  onRemoveSelected: () => void;
  confirmState: {
    open: boolean;
    selectedItems: ScanItem[];
    failures: RemovalFailure[];
  };
  onConfirmRemoval: () => void;
  onCancelRemoval: () => void;
}

const modeCopy: Record<Exclude<ProductMode, 'home'>, { eyebrow: string; cta: string }> = {
  uninstall: { eyebrow: 'Complete uninstall', cta: 'Scan app deeply' },
  residues: { eyebrow: 'Residual files', cta: 'Find residues' },
  system: { eyebrow: 'System junk', cta: 'Analyze system junk' },
};

const categoryLabels: Record<string, string> = {
  application: 'Application',
  'application-support': 'Application Support',
  preferences: 'Preferences',
  caches: 'Caches',
  containers: 'Containers',
  'group-containers': 'Group Containers',
  logs: 'Logs',
  'saved-state': 'Saved State',
  hidden: 'Hidden',
  system: 'System',
  other: 'Other',
};

function formatBytes(sizeBytes: number) {
  if (!sizeBytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / 1024 ** index;
  return `${value.toFixed(value >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function confidenceBadge(confidence: ScanItem['confidence']) {
  switch (confidence) {
    case 'high':
      return 'bg-emerald-50 text-emerald-700';
    case 'medium':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-rose-50 text-rose-700';
  }
}

function HomePanel({ onModeChange }: Pick<MainViewProps, 'onModeChange'>) {
  const cards: Array<{ mode: Exclude<ProductMode, 'home'>; title: string; copy: string }> = [
    {
      mode: 'uninstall',
      title: 'Remove an app completely',
      copy: 'Pick an installed app and scan the bundle, logs, caches, preferences and hidden leftovers tied to it.',
    },
    {
      mode: 'residues',
      title: 'Find leftover residues',
      copy: 'Search for app remnants that stayed behind after an uninstall and classify them by confidence.',
    },
    {
      mode: 'system',
      title: 'Clean generic system junk',
      copy: 'Review broad cache and log categories that are not tied to one uninstall flow.',
    },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
      {cards.map((card) => (
        <button
          key={card.mode}
          type="button"
          onClick={() => onModeChange(card.mode)}
          className="rounded-[32px] border border-black/5 bg-white/90 p-7 text-left shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-white"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Flow</p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">{card.title}</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">{card.copy}</p>
        </button>
      ))}
    </div>
  );
}

export function MainView({
  mode,
  app,
  apps,
  searchQuery,
  summary,
  scanStatus,
  usingDesktopApi,
  onModeChange,
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
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  const groupedItems = useMemo(() => {
    if (!summary) {
      return [];
    }

    const groups = new Map<string, ScanItem[]>();
    for (const item of summary.items) {
      const label = categoryLabels[item.category] ?? categoryLabels.other;
      const current = groups.get(label) ?? [];
      current.push(item);
      groups.set(label, current);
    }

    return [...groups.entries()];
  }, [summary]);

  const selectedItems = summary?.items.filter((item) => item.selected) ?? [];
  const allSelected = Boolean(summary?.items.length) && selectedItems.length === summary?.items.length;
  const selectedSize = selectedItems.reduce((total, item) => total + item.sizeBytes, 0);
  const currentModeCopy = mode === 'home' ? null : modeCopy[mode];

  const toggleExpanded = (itemId: string) => {
    setExpandedItemIds((current) => ({ ...current, [itemId]: !current[itemId] }));
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_28%),linear-gradient(180deg,_#fbfbf8_0%,_#f1f3ef_100%)] px-8 py-8">
      {mode === 'home' ? (
        <HomePanel onModeChange={onModeChange} />
      ) : (
        <div className="mx-auto max-w-6xl">
          {mode === 'uninstall' && (
            <section className="mb-8 rounded-[36px] border border-white/80 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Installed apps</p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">Pick the app you want to remove completely.</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    Start by choosing an installed app. After that, run a deep scan to inspect the app bundle,
                    support files, preferences, caches, hidden files and other leftovers tied to it.
                  </p>
                </div>

                <input
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search installed apps"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 lg:max-w-sm"
                />
              </div>

              <div className="mt-5 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {scanStatus.loadingApps ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">Loading app inventory...</div>
                ) : apps.length ? (
                  apps.map((entry) => {
                    const active = app?.id === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => onSelectApp(entry)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-sm font-semibold">{entry.name}</p>
                        <p className={`mt-1 truncate text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{entry.appPath}</p>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    {searchQuery ? 'No apps match this search.' : 'No installed apps found.'}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="rounded-[36px] border border-white/80 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">{currentModeCopy?.eyebrow}</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                  {mode === 'uninstall' ? app?.name ?? 'Choose an app to remove' : summary?.title ?? currentModeCopy?.eyebrow}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                  {summary?.subtitle ??
                    (mode === 'uninstall'
                      ? 'Pick an installed app to scan the bundle, support folders, preferences, caches, hidden files and every removable trace tied to it.'
                      : mode === 'residues'
                        ? 'Run a deep scan to find leftovers from apps that are no longer installed. Results stay visible even when confidence is low.'
                        : 'Review generic cache and log categories that do not belong to one specific uninstall flow.')}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onRunScan}
                  disabled={scanStatus.scanning || scanStatus.removing || (mode === 'uninstall' && !app)}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {scanStatus.scanning ? 'Scanning...' : currentModeCopy?.cta}
                </button>
              </div>
            </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Mode</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{currentModeCopy?.eyebrow}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Scan progress</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{scanStatus.progress}%</p>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-slate-950 transition-all" style={{ width: `${scanStatus.progress}%` }} />
                </div>
                <p className="mt-3 text-xs text-slate-500">{scanStatus.progressLabel}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Items found</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{summary?.items.length ?? 0}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Desktop mode</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {usingDesktopApi
                    ? 'Real filesystem scan is active.'
                    : 'Frontend-only mode is active. This view uses mock data so the interface can be edited separately.'}
                </p>
                </div>
              </div>

            {!!summary?.inaccessibleRoots.length && (
              <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">Some folders could not be inspected.</p>
                    <p className="mt-1 text-amber-800">
                      macOS blocked parts of the scan. Open privacy settings if you want broader coverage.
                    </p>
                    <button type="button" onClick={onOpenPrivacySettings} className="mt-3 font-medium underline underline-offset-4">
                      Open privacy settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {summary ? (
            <section className="mt-8 rounded-[36px] border border-white/80 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Results</p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                    {mode === 'uninstall' ? 'Everything tied to this app' : mode === 'residues' ? 'Possible orphan residues' : 'Generic system junk'}
                  </h2>
                </div>

                {!!summary.items.length && (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={onToggleAll} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700">
                      {allSelected ? 'Clear selection' : 'Select all'}
                    </button>
                    <button
                      type="button"
                      onClick={onRemoveSelected}
                      disabled={!selectedItems.length || scanStatus.removing}
                      className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {scanStatus.removing ? 'Removing...' : 'Delete selected'}
                    </button>
                  </div>
                )}
              </div>

              {!summary.items.length ? (
                <div className="mt-8 rounded-3xl bg-slate-50 px-6 py-8 text-sm leading-6 text-slate-500">
                  No items were found in this scan. Try again after changing the mode or selecting a different app.
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  {groupedItems.map(([groupLabel, items]) => (
                    <div key={groupLabel} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{groupLabel}</p>
                          <p className="mt-1 text-xs text-slate-500">{items.length} item(s)</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {items.map((item) => {
                          const expanded = Boolean(expandedItemIds[item.id]);
                          return (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex gap-3">
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => onToggleItem(item.id)}
                                    className="mt-1 h-4 w-4 rounded border-slate-300"
                                  />
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${confidenceBadge(item.confidence)}`}>
                                        {item.confidence} confidence
                                      </span>
                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                        {formatBytes(item.sizeBytes)}
                                      </span>
                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                        {item.appName ?? 'App nao identificado'}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button type="button" onClick={() => onCopyPath(item.path)} className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                    <Copy className="mr-1 inline h-3.5 w-3.5" />
                                    Copy path
                                  </button>
                                  <button type="button" onClick={() => onRevealPath(item.path)} className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                    <FolderOpen className="mr-1 inline h-3.5 w-3.5" />
                                    Reveal
                                  </button>
                                  <button type="button" onClick={() => onOpenPath(item.path)} className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                    <ExternalLink className="mr-1 inline h-3.5 w-3.5" />
                                    Open
                                  </button>
                                  <button type="button" onClick={() => toggleExpanded(item.id)} className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                    {expanded ? <ChevronDown className="mr-1 inline h-3.5 w-3.5" /> : <ChevronRight className="mr-1 inline h-3.5 w-3.5" />}
                                    {expanded ? 'Hide details' : 'Show details'}
                                  </button>
                                </div>
                              </div>

                              {expanded && (
                                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                  <p>
                                    <span className="font-medium text-slate-900">Path:</span> {item.path}
                                  </p>
                                  <p className="mt-2">
                                    <span className="font-medium text-slate-900">Modified:</span> {item.modifiedAt ?? 'Unknown'}
                                  </p>
                                  <p className="mt-2">
                                    <span className="font-medium text-slate-900">Directory:</span> {item.isDirectory ? 'Yes' : 'No'}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      )}

      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Confirm removal</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">Delete the selected items directly?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This action deletes the selected items immediately. Review the list before continuing.
            </p>

            <div className="mt-6 max-h-[360px] space-y-3 overflow-y-auto rounded-3xl bg-slate-50 p-4">
              {confirmState.selectedItems.map((item) => (
                <div key={item.id} className="rounded-2xl bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{item.path}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500">{formatBytes(item.sizeBytes)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onCancelRemoval} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700">
                Cancel
              </button>
              <button type="button" onClick={onConfirmRemoval} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white">
                Confirm delete
              </button>
            </div>

            {!!confirmState.failures.length && (
              <div className="mt-6 rounded-3xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                Some items failed in the previous removal attempt.
              </div>
            )}
          </div>
        </div>
      )}

      {scanStatus.scanning && (
        <div className="fixed bottom-8 right-8 z-40 flex items-center gap-3 rounded-full bg-slate-950 px-4 py-3 text-sm text-white shadow-lg shadow-slate-950/20">
          <Loader2 className="h-4 w-4 animate-spin" />
          {scanStatus.progressLabel}
        </div>
      )}

      {!scanStatus.scanning && !scanStatus.removing && confirmState.failures.length > 0 && (
        <div className="fixed bottom-8 right-8 z-40 flex items-center gap-3 rounded-full bg-rose-600 px-4 py-3 text-sm text-white shadow-lg shadow-rose-600/20">
          <ShieldAlert className="h-4 w-4" />
          Some items could not be removed.
        </div>
      )}

      {!scanStatus.scanning && !scanStatus.removing && confirmState.open === false && confirmState.failures.length === 0 && selectedItems.length === 0 && summary && (
        <div className="fixed bottom-8 right-8 z-40 flex items-center gap-3 rounded-full bg-emerald-600 px-4 py-3 text-sm text-white shadow-lg shadow-emerald-600/20">
          <CheckCircle2 className="h-4 w-4" />
          Ready for review
        </div>
      )}
    </main>
  );
}
