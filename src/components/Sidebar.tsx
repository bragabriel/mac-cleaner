import type { AppItem } from '../types';

interface SidebarProps {
  apps: AppItem[];
  selectedAppId: string | null;
  searchQuery: string;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSelectApp: (app: AppItem) => void;
}

function formatSize(sizeBytes: number) {
  if (sizeBytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function Sidebar({
  apps,
  selectedAppId,
  searchQuery,
  loading,
  onSearchChange,
  onRefresh,
  onSelectApp,
}: SidebarProps) {
  return (
    <aside className="w-full max-w-sm border-r border-slate-200 bg-white/90 backdrop-blur">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Inventory</p>
        <div className="mt-3 flex gap-2">
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter apps"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:bg-white"
          />
          <button
            onClick={onRefresh}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-122px)] overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Reading `/Applications` and `~/Applications`...
          </div>
        ) : null}

        {!loading && apps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No app bundles found for this filter.
          </div>
        ) : null}

        <div className="space-y-2">
          {apps.map((app) => {
            const selected = app.id === selectedAppId;

            return (
              <button
                key={app.id}
                onClick={() => onSelectApp(app)}
                className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-sky-300 bg-sky-50 shadow-sm'
                    : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{app.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{app.bundleId ?? 'bundle id unavailable'}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                    {app.source}
                  </span>
                </div>
                <p className="mt-2 truncate text-xs text-slate-500">{app.appPath}</p>
                <p className="mt-2 text-xs font-medium text-slate-700">{formatSize(app.sizeBytes)}</p>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
