import type { AppItem, ScanStatus, ScanSummary } from '../types';

interface MainViewProps {
  app: AppItem | null;
  scanStatus: ScanStatus;
  summary: ScanSummary;
  usingDesktopApi: boolean;
  onScan: () => void;
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

export function MainView({ app, scanStatus, summary, usingDesktopApi, onScan }: MainViewProps) {
  return (
    <main className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] p-8">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Mac Cleaner</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              {app ? app.name : 'Select an app to inspect'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {usingDesktopApi
                ? 'Desktop mode is active. The app inventory comes from the local Mac instead of mock data.'
                : 'Browser fallback is active. The UI is running with sample inventory until the Electron bridge is available.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>Inventory status</p>
            <p className="mt-1 font-semibold text-slate-900">
              {scanStatus.loadingApps ? 'Loading apps...' : scanStatus.scanning ? 'Scanning...' : `${summary.app ? 'App selected' : 'Idle'}`}
            </p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bundle</p>
            <p className="mt-3 break-all text-sm font-medium text-slate-900">{app?.bundleId ?? 'Unavailable'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Path</p>
            <p className="mt-3 break-all text-sm font-medium text-slate-900">{app?.appPath ?? 'Select an app first'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bundle size</p>
            <p className="mt-3 text-sm font-medium text-slate-900">{app ? formatSize(app.sizeBytes) : '0 B'}</p>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Residue scan</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Searches common macOS locations for paths matching the selected app name and bundle identifier.
              </p>
            </div>
            <button
              onClick={onScan}
              disabled={!app || scanStatus.scanning}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {scanStatus.scanning ? 'Scanning...' : 'Run scan'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Matches</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{summary.residues.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Warnings</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{summary.warnings.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Roots scanned</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{summary.scannedRoots.length}</p>
            </article>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
            {summary.scannedRoots.length === 0
              ? 'No scan has run yet.'
              : `Last scan checked ${summary.scannedRoots.join(', ')}.`}
          </div>
        </section>
      </div>
    </main>
  );
}
