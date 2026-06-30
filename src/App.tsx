import { useEffect, useMemo, useState } from 'react';
import { MOCK_APPS } from './data';
import { MainView } from './components/MainView';
import { Sidebar } from './components/Sidebar';
import type { AppItem, ScanStatus, ScanSummary } from './types';

const EMPTY_SUMMARY: ScanSummary = {
  app: null,
  residues: [],
  warnings: [],
  inaccessibleRoots: [],
  scannedRoots: [],
};

export default function App() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    loadingApps: true,
    scanning: false,
    removing: false,
  });
  const [summary, setSummary] = useState<ScanSummary>(EMPTY_SUMMARY);

  const usingDesktopApi = Boolean(window.macCleaner?.listApps);

  useEffect(() => {
    let active = true;

    const loadApps = async () => {
      setScanStatus((current) => ({ ...current, loadingApps: true }));

      try {
        const nextApps = window.macCleaner?.listApps ? await window.macCleaner.listApps() : MOCK_APPS;
        if (!active) {
          return;
        }

        setApps(nextApps);
        setSelectedAppId((current) => current ?? nextApps[0]?.id ?? null);
        setSummary((current) => ({ ...current, app: nextApps[0] ?? null }));
      } catch {
        if (!active) {
          return;
        }

        setApps(MOCK_APPS);
        setSelectedAppId((current) => current ?? MOCK_APPS[0]?.id ?? null);
        setSummary((current) => ({ ...current, app: MOCK_APPS[0] ?? null }));
      } finally {
        if (active) {
          setScanStatus((current) => ({ ...current, loadingApps: false }));
        }
      }
    };

    loadApps();

    return () => {
      active = false;
    };
  }, []);

  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return apps;
    }

    return apps.filter((app) => {
      const haystack = `${app.name} ${app.bundleId ?? ''} ${app.appPath}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [apps, searchQuery]);

  const selectedApp =
    filteredApps.find((app) => app.id === selectedAppId) ??
    apps.find((app) => app.id === selectedAppId) ??
    null;

  useEffect(() => {
    setSummary((current) => ({ ...current, app: selectedApp }));
  }, [selectedApp]);

  const handleScan = async () => {
    if (!selectedApp || !window.macCleaner?.scanApp) {
      return;
    }

    setScanStatus((current) => ({ ...current, scanning: true }));
    try {
      const nextSummary = await window.macCleaner.scanApp(selectedApp);
      setSummary(nextSummary);
    } finally {
      setScanStatus((current) => ({ ...current, scanning: false }));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <Sidebar
        apps={filteredApps}
        selectedAppId={selectedAppId}
        searchQuery={searchQuery}
        loading={scanStatus.loadingApps}
        onSearchChange={setSearchQuery}
        onRefresh={() => {
          setApps([]);
          setSelectedAppId(null);
          setSearchQuery('');
          setScanStatus((current) => ({ ...current, loadingApps: true }));
          Promise.resolve().then(() => window.location.reload());
        }}
        onSelectApp={(app) => setSelectedAppId(app.id)}
      />
      <MainView
        app={selectedApp}
        scanStatus={scanStatus}
        summary={summary}
        usingDesktopApi={usingDesktopApi}
        onScan={handleScan}
      />
    </div>
  );
}
