import { Grid2X2, HardDriveDownload, Search, Sparkles } from 'lucide-react';
import { AppItem, ProductMode } from '../types';

interface SidebarProps {
  mode: ProductMode;
  apps: AppItem[];
  searchQuery: string;
  loading: boolean;
  selectedAppId: string | null;
  onModeChange: (mode: ProductMode) => void;
  onSelectApp: (app: AppItem) => void;
  onSearchChange: (value: string) => void;
}

const navItems: Array<{ mode: ProductMode; label: string; icon: typeof Grid2X2; subtitle: string }> = [
  { mode: 'home', label: 'Home', icon: Grid2X2, subtitle: 'Choose a cleaning flow' },
  { mode: 'uninstall', label: 'Uninstall App', icon: HardDriveDownload, subtitle: 'Remove an app completely' },
  { mode: 'residues', label: 'Residues', icon: Search, subtitle: 'Find leftovers from removed apps' },
  { mode: 'system', label: 'System', icon: Sparkles, subtitle: 'Clear generic system junk' },
];

export function Sidebar({
  mode,
  apps,
  searchQuery,
  loading,
  selectedAppId,
  onModeChange,
  onSelectApp,
  onSearchChange,
}: SidebarProps) {
  return (
    <aside className="flex w-[320px] flex-col border-r border-black/5 bg-[#f7f7f4] px-5 py-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">Mac Cleaner</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">Deep uninstall, residues and system cleanup.</h1>
      </div>

      <nav className="mt-8 space-y-2">
        {navItems.map(({ mode: itemMode, label, icon: Icon, subtitle }) => {
          const active = mode === itemMode;
          return (
            <button
              key={itemMode}
              type="button"
              onClick={() => onModeChange(itemMode)}
              className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition ${
                active ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'bg-white/70 text-slate-900 hover:bg-white'
              }`}
            >
              <Icon className={`mt-0.5 h-5 w-5 ${active ? 'text-white' : 'text-slate-500'}`} />
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className={`mt-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{subtitle}</p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="mt-8 rounded-3xl border border-black/5 bg-white/90 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Installed apps</p>
        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name"
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
        />

        <div className="mt-3 max-h-[calc(100vh-380px)] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">Loading app inventory...</div>
          ) : apps.length ? (
            apps.map((app) => {
              const active = app.id === selectedAppId;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    onModeChange('uninstall');
                    onSelectApp(app);
                  }}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold">{app.name}</p>
                  <p className={`mt-1 truncate text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{app.appPath}</p>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
              {searchQuery ? 'No apps match this search.' : 'No apps available in this mode.'}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
