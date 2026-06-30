import { Grid2X2, HardDriveDownload, Search, Sparkles } from 'lucide-react';
import { ProductMode } from '../types';

interface SidebarProps {
  mode: ProductMode;
  onModeChange: (mode: ProductMode) => void;
}

const navItems: Array<{ mode: ProductMode; label: string; icon: typeof Grid2X2; subtitle: string }> = [
  { mode: 'home', label: 'Home', icon: Grid2X2, subtitle: 'Choose a cleaning flow' },
  { mode: 'uninstall', label: 'Uninstall App', icon: HardDriveDownload, subtitle: 'Remove an app completely' },
  { mode: 'residues', label: 'Residues', icon: Search, subtitle: 'Find leftovers from removed apps' },
  { mode: 'system', label: 'System', icon: Sparkles, subtitle: 'Clear generic system junk' },
];

export function Sidebar({
  mode,
  onModeChange,
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
    </aside>
  );
}
