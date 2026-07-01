import {useEffect, useMemo, useRef, useState} from 'react';
import {MainView} from './components/MainView';
import {Sidebar} from './components/Sidebar';
import {MOCK_APPS, MOCK_ORPHAN_SUMMARY, MOCK_PERMISSION_SNAPSHOT, MOCK_SYSTEM_SUMMARY, MOCK_UNINSTALL_SUMMARY} from './data';
import type {
  AppItem,
  CleanupMode,
  PermissionSettingTarget,
  PermissionSnapshot,
  ProductMode,
  RemovalFailure,
  ScanItem,
  ScanStatus,
  ScanSummary,
} from './types';

const idleStatus: ScanStatus = {
  loadingApps: false,
  scanning: false,
  removing: false,
  progress: 0,
  progressLabel: '',
};

function normalizeSummary(nextSummary: ScanSummary): ScanSummary {
  return {
    ...nextSummary,
    items: nextSummary.items.map((item) => ({...item, selected: item.selected ?? true})),
  };
}

export default function App() {
  const usingDesktopApi = Boolean(window.macCleaner?.listApps);
  const [mode, setMode] = useState<ProductMode>('home');
  const [cleanupMode, setCleanupMode] = useState<CleanupMode>('residues');
  const [apps, setApps] = useState<AppItem[]>(MOCK_APPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(MOCK_APPS[0]?.id ?? null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>(idleStatus);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastFailures, setLastFailures] = useState<RemovalFailure[]>([]);
  const [permissionSnapshot, setPermissionSnapshot] = useState<PermissionSnapshot | null>(null);
  const [permissionCheckLoading, setPermissionCheckLoading] = useState(false);
  const [permissionCheckError, setPermissionCheckError] = useState<string | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const loadApps = async () => {
      setScanStatus((current) => ({...current, loadingApps: true}));

      try {
        const nextApps = window.macCleaner?.listApps ? await window.macCleaner.listApps() : MOCK_APPS;
        if (!active) {
          return;
        }

        setApps(nextApps);
        setSelectedAppId((current) => current ?? nextApps[0]?.id ?? null);
      } finally {
        if (active) {
          setScanStatus((current) => ({...current, loadingApps: false}));
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

  useEffect(() => {
    setSummary(null);
    setConfirmOpen(false);
    setLastFailures([]);
    setScanStatus((current) => ({...current, progress: 0, progressLabel: ''}));
  }, [mode]);

  const refreshPermissionSnapshot = async () => {
    setPermissionCheckLoading(true);
    setPermissionCheckError(null);

    try {
      const nextSnapshot = window.macCleaner?.getPermissionSnapshot
        ? await window.macCleaner.getPermissionSnapshot()
        : MOCK_PERMISSION_SNAPSHOT;
      setPermissionSnapshot(nextSnapshot);
    } catch (error) {
      setPermissionSnapshot(MOCK_PERMISSION_SNAPSHOT);
      setPermissionCheckError(error instanceof Error ? error.message : 'Permission check failed.');
    } finally {
      setPermissionCheckLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'settings') {
      return;
    }

    void refreshPermissionSnapshot();
  }, [mode]);

  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return apps;
    }

    return apps.filter((app) => {
      const haystack = [app.name, app.bundleId ?? '', app.appPath].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [apps, searchQuery]);

  const selectedApp = apps.find((app) => app.id === selectedAppId) ?? null;

  const updateSummaryItems = (updater: (items: ScanItem[]) => ScanItem[]) => {
    setSummary((current) => (current ? {...current, items: updater(current.items)} : current));
  };

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

  const runScan = async () => {
    setLastFailures([]);
    setConfirmOpen(false);

    if (mode !== 'uninstall' && mode !== 'cleanup') {
      return;
    }

    beginProgress(
      mode === 'uninstall'
        ? 'Scanning app bundle and residues...'
        : cleanupMode === 'residues'
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
      } else if (cleanupMode === 'residues') {
        nextSummary = window.macCleaner?.scanOrphans ? await window.macCleaner.scanOrphans() : MOCK_ORPHAN_SUMMARY;
      } else {
        nextSummary = window.macCleaner?.scanSystemJunk ? await window.macCleaner.scanSystemJunk() : MOCK_SYSTEM_SUMMARY;
      }

      setSummary(normalizeSummary(nextSummary));
      finishProgress(`Scan complete: ${nextSummary.items.length} items ready for review.`);
    } catch (error) {
      setSummary(null);
      finishProgress(error instanceof Error ? error.message : 'Scan failed.');
    }
  };

  const toggleItem = (itemId: string) => {
    updateSummaryItems((items) => items.map((item) => (item.id === itemId ? {...item, selected: !item.selected} : item)));
  };

  const toggleAll = () => {
    updateSummaryItems((items) => {
      const shouldSelectAll = items.some((item) => !item.selected);
      return items.map((item) => ({...item, selected: shouldSelectAll}));
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

    setScanStatus((current) => ({...current, removing: true, progressLabel: 'Removing selected items...'}));

    try {
      const result = window.macCleaner?.removePaths
        ? await window.macCleaner.removePaths(selectedPaths)
        : {removedPaths: selectedPaths, failedPaths: []};

      setLastFailures(result.failedPaths);
      updateSummaryItems((items) => items.filter((item) => !result.removedPaths.includes(item.path)));
      setConfirmOpen(false);

      setScanStatus((current) => ({
        ...current,
        removing: false,
        progress: 100,
        progressLabel: result.failedPaths.length
          ? `Removed ${result.removedPaths.length} items. ${result.failedPaths.length} failed.`
          : `Removed ${result.removedPaths.length} items.`,
      }));
    } catch (error) {
      setScanStatus((current) => ({
        ...current,
        removing: false,
        progressLabel: error instanceof Error ? error.message : 'Removal failed.',
      }));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent text-[color:var(--color-text-primary)]">
      <Sidebar mode={mode} onModeChange={setMode} />

      <MainView
        mode={mode}
        cleanupMode={cleanupMode}
        app={selectedApp}
        apps={filteredApps}
        searchQuery={searchQuery}
        summary={summary}
        scanStatus={scanStatus}
        usingDesktopApi={usingDesktopApi}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          if (nextMode === 'uninstall' && !selectedAppId) {
            setSelectedAppId(apps[0]?.id ?? null);
          }
        }}
        onCleanupModeChange={setCleanupMode}
        onSelectApp={(app) => {
          setSelectedAppId(app.id);
          setMode('uninstall');
        }}
        onSearchChange={setSearchQuery}
        onRunScan={runScan}
        onToggleItem={toggleItem}
        onToggleAll={toggleAll}
        permissionSnapshot={permissionSnapshot}
        permissionCheckLoading={permissionCheckLoading}
        permissionCheckError={permissionCheckError}
        onOpenSystemSettings={(target: PermissionSettingTarget) => window.macCleaner?.openSystemSettings?.(target)}
        onRefreshPermissionSnapshot={refreshPermissionSnapshot}
        onCopyPath={handleCopyPath}
        onRevealPath={handleRevealPath}
        onOpenPath={handleOpenPath}
        onRemoveSelected={handleRemoveSelected}
        confirmState={{
          open: confirmOpen,
          selectedItems: summary?.items.filter((item) => item.selected) ?? [],
          failures: lastFailures,
        }}
        onConfirmRemoval={confirmRemoval}
        onCancelRemoval={() => setConfirmOpen(false)}
      />
    </div>
  );
}
