import {AppWindowMac, HardDriveDownload, Home, Package, Settings, Sparkles} from 'lucide-react';
import type {CleanupMode, ProductMode} from '../types';

const navItems: Array<{
  mode: ProductMode;
  cleanupMode?: CleanupMode;
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
    cleanupMode: 'residues',
    label: 'App Residues',
    subtitle: 'Find leftovers from uninstalled apps',
    icon: Sparkles,
  },
  {
    mode: 'cleanup',
    cleanupMode: 'system',
    label: 'System Junk',
    subtitle: 'Caches, logs, and transient data',
    icon: HardDriveDownload,
  },
  {
    mode: 'brew',
    label: 'Brew Packages',
    subtitle: 'Homebrew packages and updates',
    icon: Package,
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
  cleanupMode: CleanupMode;
  onModeChange: (mode: ProductMode) => void;
  onCleanupModeChange: (mode: CleanupMode) => void;
}

export function Sidebar({mode, cleanupMode, onModeChange, onCleanupModeChange}: SidebarProps) {
  return (
    <aside className="hidden w-[320px] shrink-0 border-r border-white/8 bg-[#101114] text-white xl:flex">
      <div className="flex h-screen w-full flex-col">
        <div className="border-b border-white/8 px-4 py-5">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">Mac Cleaner</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Uninstall apps, clean leftovers, and review what still deserves space.
          </p>
        </div>

        <nav className="flex-1 px-3 py-4">
          {navItems.map(({mode: itemMode, cleanupMode: itemCleanup, label, subtitle, icon: Icon}) => {
            const active = itemCleanup ? mode === itemMode && cleanupMode === itemCleanup : mode === itemMode;

            return (
              <button
                key={`${itemMode}-${itemCleanup ?? ''}`}
                type="button"
                onClick={() => {
                  onModeChange(itemMode);
                  if (itemCleanup) onCleanupModeChange(itemCleanup);
                }}
                className={[
                  'mb-2 flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition',
                  active
                    ? 'border-[#8e82ff] bg-[#1b1d26] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    : 'border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border',
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
            <p className="mt-3 text-sm leading-6 text-white/58">Mac Cleaner is an experimental macOS cleanup side project. Found a bug or have an idea? Open a PR — contributions are welcome.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
