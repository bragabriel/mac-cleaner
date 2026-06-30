import type { AppItem, ScanStatus, ScanSummary } from '../types';

interface MainViewProps {
  app: AppItem | null;
  scanStatus: ScanStatus;
  summary: ScanSummary;
  usingDesktopApi: boolean;
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

export function MainView({ app, scanStatus, summary, usingDesktopApi }: MainViewProps) {
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
              {scanStatus.loadingApps ? 'Loading apps...' : `${summary.app ? 'App selected' : 'Idle'}`}
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

        <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/90 p-6">
          <p className="text-sm font-semibold text-slate-900">What changed in this step</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The sidebar now reads real `.app` bundles from `/Applications` and `~/Applications`. The residue scan and
            removal flow will build on top of this selected app object in the next commits.
          </p>
        </section>
      </div>
    </main>
  );
}
