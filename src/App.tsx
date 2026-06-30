import { useEffect, useMemo, useRef, useState } from 'react';
import { MainView } from './components/MainView';
import { Sidebar } from './components/Sidebar';
import { MOCK_APPS, MOCK_ORPHAN_SUMMARY, MOCK_SYSTEM_SUMMARY, MOCK_UNINSTALL_SUMMARY } from './data';
import { AppItem, ProductMode, RemovalFailure, ScanItem, ScanStatus, ScanSummary } from './types';

const idleStatus: ScanStatus = {
  loadingApps: false,
  scanning: false,
  removing: false,
  progress: 0,
  progressLabel: 'Idle',
};

export default function App() {
  const usingDesktopApi = Boolean(window.macCleaner?.listApps);
  const [mode, setMode] = useState<ProductMode>('home');
  const [apps, setApps] = useState<AppItem[]>(MOCK_APPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(MOCK_APPS[0]?.id ?? null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    ...idleStatus,
    loadingApps: usingDesktopApi,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastFailures, setLastFailures] = useState<RemovalFailure[]>([]);
  const progressIntervalRef = useRef<number | null>(null);

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
      } finally {
        if (active) {
          setScanStatus((current) => ({ ...current, loadingApps: false }));
        }
      }
    };

    void loadApps();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) {
      return apps;
    }

    const query = searchQuery.trim().toLowerCase();
    return apps.filter((app) => app.name.toLowerCase().includes(query));
  }, [apps, searchQuery]);

  const selectedApp = apps.find((app) => app.id === selectedAppId) ?? null;

  const beginProgress = (label: string) => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }

    setScanStatus((current) => ({
      ...current,
      scanning: true,
      progress: 8,
      progressLabel: label,
    }));

    progressIntervalRef.current = window.setInterval(() => {
      setScanStatus((current) => {
        if (!current.scanning || current.progress >= 92) {
          return current;
        }

        return {
          ...current,
          progress: Math.min(current.progress + 6, 92),
        };
      });
    }, 240);
  };

  const finishProgress = (label: string) => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setScanStatus((current) => ({
      ...current,
      scanning: false,
      progress: 100,
      progressLabel: label,
    }));
  };

  const normalizedSummary = (nextSummary: ScanSummary): ScanSummary => ({
    ...nextSummary,
    items: nextSummary.items.map((item) => ({ ...item, selected: item.selected ?? true })),
  });

  const runScan = async () => {
    setLastFailures([]);
    setConfirmOpen(false);

    if (mode === 'home') {
      return;
    }

    beginProgress(
      mode === 'uninstall'
        ? 'Scanning app bundle and residues...'
        : mode === 'residues'
          ? 'Scanning for orphan residues...'
          : 'Scanning system junk categories...',
    );

    try {
      let nextSummary: ScanSummary;

      if (mode === 'uninstall') {
        if (!selectedApp) {
          finishProgress('Choose an app before scanning.');
          return;
        }

        nextSummary = window.macCleaner?.scanApp ? await window.macCleaner.scanApp(selectedApp) : MOCK_UNINSTALL_SUMMARY;
      } else if (mode === 'residues') {
        nextSummary = window.macCleaner?.scanOrphans ? await window.macCleaner.scanOrphans() : MOCK_ORPHAN_SUMMARY;
      } else {
        nextSummary = window.macCleaner?.scanSystemJunk ? await window.macCleaner.scanSystemJunk() : MOCK_SYSTEM_SUMMARY;
      }

      setSummary(normalizedSummary(nextSummary));
      finishProgress('Scan complete');
    } catch (error) {
      setSummary(null);
      finishProgress(error instanceof Error ? error.message : 'Scan failed');
    }
  };

  const updateSummaryItems = (updater: (items: ScanItem[]) => ScanItem[]) => {
    setSummary((current) => (current ? { ...current, items: updater(current.items) } : current));
  };

  const toggleItem = (itemId: string) => {
    updateSummaryItems((items) => items.map((item) => (item.id === itemId ? { ...item, selected: !item.selected } : item)));
  };

  const toggleAll = () => {
    updateSummaryItems((items) => {
      const shouldSelectAll = items.some((item) => !item.selected);
      return items.map((item) => ({ ...item, selected: shouldSelectAll }));
    });
  };

  const handleCopyPath = async (targetPath: string) => {
    await navigator.clipboard.writeText(targetPath);
  };

  const handleRevealPath = async (targetPath: string) => {
    await window.macCleaner?.revealPath?.(targetPath);
  };

  const handleOpenPath = async (targetPath: string) => {
    await window.macCleaner?.openPath?.(targetPath);
  };

  const handleRemoveSelected = () => {
    if (!summary?.items.some((item) => item.selected)) {
      return;
    }

    setConfirmOpen(true);
  };

  const confirmRemoval = async () => {
    const selectedPaths = summary?.items.filter((item) => item.selected).map((item) => item.path) ?? [];
    if (!selectedPaths.length || !summary) {
      setConfirmOpen(false);
      return;
    }

    setScanStatus((current) => ({ ...current, removing: true, progressLabel: 'Removing selected items...' }));

    try {
      const result = window.macCleaner?.removeItems
        ? await window.macCleaner.removeItems(selectedPaths)
        : { removedPaths: selectedPaths, failedPaths: [] };

      setLastFailures(result.failedPaths);
      updateSummaryItems((items) => items.filter((item) => !result.removedPaths.includes(item.path)));
    } finally {
      setScanStatus((current) => ({ ...current, removing: false, progressLabel: 'Removal finished' }));
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#eef1ea] text-slate-950">
      <Sidebar
        mode={mode}
        onModeChange={setMode}
      />

      <MainView
        mode={mode}
        app={selectedApp}
        apps={filteredApps}
        searchQuery={searchQuery}
        summary={summary}
        scanStatus={scanStatus}
        usingDesktopApi={usingDesktopApi}
        onModeChange={setMode}
        onSelectApp={(app) => {
          setSelectedAppId(app.id);
          setMode('uninstall');
        }}
        onSearchChange={setSearchQuery}
        onRunScan={() => void runScan()}
        onToggleItem={toggleItem}
        onToggleAll={toggleAll}
        onOpenPrivacySettings={() => void window.macCleaner?.openPrivacySettings?.()}
        onCopyPath={(targetPath) => void handleCopyPath(targetPath)}
        onRevealPath={(targetPath) => void handleRevealPath(targetPath)}
        onOpenPath={(targetPath) => void handleOpenPath(targetPath)}
        onRemoveSelected={handleRemoveSelected}
        confirmState={{
          open: confirmOpen,
          selectedItems: summary?.items.filter((item) => item.selected) ?? [],
          failures: lastFailures,
        }}
        onConfirmRemoval={() => void confirmRemoval()}
        onCancelRemoval={() => setConfirmOpen(false)}
      />
    </div>
  );
}
