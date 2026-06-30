import { useEffect, useMemo, useState } from 'react';
import { MOCK_APPS } from './data';
import { MainView } from './components/MainView';
import { Sidebar } from './components/Sidebar';
import type { AppItem, RemovalSummary, ScanStatus, ScanSummary } from './types';

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
  const [removalSummary, setRemovalSummary] = useState<RemovalSummary | null>(null);

  const usingDesktopApi = Boolean(window.macCleaner?.listApps);

  useEffect(() => {
    let active = true;

    const loadApps = async () => {
      setScanStatus((current) => ({ ...current, loadingApps: true }));

      try {
        const nextApps = window.macCleaner?.listApps ? await window.macCleaner.listApps() : [];
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

        setApps([]);
        setSelectedAppId(null);
        setSummary((current) => ({ ...current, app: null }));
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

    setRemovalSummary(null);
    setScanStatus((current) => ({ ...current, scanning: true }));
    try {
      const nextSummary = await window.macCleaner.scanApp(selectedApp);
      setSummary(nextSummary);
    } finally {
      setScanStatus((current) => ({ ...current, scanning: false }));
    }
  };

  const handleToggleResidue = (residueId: string) => {
    setSummary((current) => ({
      ...current,
      residues: current.residues.map((residue) =>
        residue.id === residueId ? { ...residue, selected: !residue.selected } : residue,
      ),
    }));
  };

  const handleToggleAllResidues = () => {
    setSummary((current) => {
      const shouldSelect = current.residues.some((residue) => !residue.selected);
      return {
        ...current,
        residues: current.residues.map((residue) => ({ ...residue, selected: shouldSelect })),
      };
    });
  };

  const handleRevealResidue = (targetPath: string) => {
    void window.macCleaner?.revealPath?.(targetPath);
  };

  const handleOpenPrivacySettings = () => {
    void window.macCleaner?.openPrivacySettings?.();
  };

  const handleRemoveSelected = async () => {
    const selectedPaths = summary.residues.filter((residue) => residue.selected).map((residue) => residue.path);
    if (selectedPaths.length === 0 || !window.macCleaner?.moveToTrash) {
      return;
    }

    if (!window.confirm(`Move ${selectedPaths.length} selected item(s) to the Trash?`)) {
      return;
    }

    setScanStatus((current) => ({ ...current, removing: true }));
    try {
      const nextRemovalSummary = await window.macCleaner.moveToTrash(selectedPaths);
      setRemovalSummary(nextRemovalSummary);
      setSummary((current) => ({
        ...current,
        residues: current.residues.filter((residue) => !nextRemovalSummary.removedPaths.includes(residue.path)),
      }));
    } finally {
      setScanStatus((current) => ({ ...current, removing: false }));
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
        onToggleResidue={handleToggleResidue}
        onToggleAllResidues={handleToggleAllResidues}
        onRevealResidue={handleRevealResidue}
        onOpenPrivacySettings={handleOpenPrivacySettings}
        onRemoveSelected={handleRemoveSelected}
        removalSummary={removalSummary}
      />
    </div>
  );
}
