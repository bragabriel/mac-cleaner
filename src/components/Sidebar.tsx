import {AppWindowMac, Home, Settings, Sparkles, ToggleRight} from 'lucide-react';
import type {ProductMode} from '../types';

const navItems: Array<{
  mode: ProductMode;
  label: string;
  subtitle: string;
  icon: typeof Home;
}> = [
  {
    mode: 'home',
    label: 'Home',
    subtitle: 'Workspace overview',
    icon: Home,
  },
  {
    mode: 'uninstall',
    label: 'Uninstall Apps',
    subtitle: 'App bundles and leftovers',
    icon: AppWindowMac,
  },
  {
    mode: 'cleanup',
    label: 'Cleanup',
    subtitle: 'Orphans and system junk',
    icon: Sparkles,
  },
  {
    mode: 'startup',
    label: 'Startup Items',
    subtitle: 'Inspect what boots with macOS',
    icon: ToggleRight,
  },
  {
    mode: 'settings',
    label: 'Settings',
    subtitle: 'Permissions and behavior',
    icon: Settings,
  },
];

interface SidebarProps {
  mode: ProductMode;
  onModeChange: (mode: ProductMode) => void;
}

export function Sidebar({mode, onModeChange}: SidebarProps) {
  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-white/8 bg-[#101114] text-white lg:flex">
      <div className="flex h-screen w-full flex-col">
        <div className="border-b border-white/8 px-4 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">Mac Cleaner</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Mac Cleaner</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Uninstall apps, clean leftovers, and review what still deserves space on this Mac.
          </p>
        </div>

        <nav className="flex-1 px-3 py-4">
          {navItems.map(({mode: itemMode, label, subtitle, icon: Icon}) => {
            const active = mode === itemMode;

            return (
              <button
                key={itemMode}
                type="button"
                onClick={() => onModeChange(itemMode)}
                className={[
                  'mb-2 flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition',
                  active
                    ? 'border-[#8e82ff] bg-[#1b1d26] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    : 'border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                    active ? 'border-white/12 bg-[#7263FF] text-white' : 'border-white/8 bg-white/[0.04] text-white/70',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-[-0.02em] text-white">{label}</p>
                  <p className="mt-1 truncate text-xs text-white/44">{subtitle}</p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/8 px-4 py-4">
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/36">Star the project</p>
            <p className="mt-3 text-sm leading-6 text-white/58">Mac Cleaner is open source. Open the repository and leave a star if it helps your cleanup workflow.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
