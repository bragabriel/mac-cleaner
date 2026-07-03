import {useEffect, useMemo, useRef, useState} from 'react';
import {MainView} from './components/MainView';
import {Sidebar} from './components/Sidebar';
import {
  MOCK_APPS,
  MOCK_ORPHAN_SUMMARY,
  MOCK_PERMISSION_SNAPSHOT,
  MOCK_SYSTEM_SUMMARY,
  MOCK_UNINSTALL_SUMMARY,
} from './data';
import type {
  AppItem,
  BrewOutdated,
  BrewPackage,
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

function filterSummaryByRoots(summary: ScanSummary, roots?: string[]): ScanSummary {
  if (!roots?.length) {
    return summary;
  }

  return {
    ...summary,
    scannedRoots: summary.scannedRoots.filter((root) => roots.includes(root)),
    items: summary.items.filter((item) => roots.some((root) => item.path === root || item.path.startsWith(`${root}/`))),
  };
}

export default function App() {
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
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [brewPackages, setBrewPackages] = useState<BrewPackage[]>([]);
  const [brewOutdated, setBrewOutdated] = useState<BrewOutdated[]>([]);
  const [brewLoading, setBrewLoading] = useState(false);
  const [brewError, setBrewError] = useState<string | null>(null);
  const [brewUpgradeLoading, setBrewUpgradeLoading] = useState<string | null>(null);
  const [brewUpgradeMessage, setBrewUpgradeMessage] = useState<string | null>(null);
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

  useEffect(() => {
    if (mode !== 'brew') {
      return;
    }

    void refreshBrewPackages();
  }, [mode]);

  const refreshBrewPackages = async () => {
    setBrewLoading(true);
    setBrewError(null);
    try {
      const [packagesRes, outdatedRes] = await Promise.all([
        window.macCleaner?.listBrewPackages?.() ?? {ok: false, packages: [] as string[], message: 'Brew not available'},
        window.macCleaner?.listBrewOutdated?.() ?? {ok: false, packages: [], message: 'Brew not available'},
      ]);
      if (!packagesRes.ok) {
        setBrewError(packagesRes.message);
        setBrewPackages([]);
        setBrewOutdated([]);
      } else {
        const outdatedNames = new Set(outdatedRes.packages.map((o) => o.name));
        setBrewPackages(packagesRes.packages.map((name) => ({name, outdated: outdatedNames.has(name)})));
        setBrewOutdated(outdatedRes.packages);
      }
    } catch (error) {
      setBrewError(error instanceof Error ? error.message : 'Failed to load brew packages.');
      setBrewPackages([]);
      setBrewOutdated([]);
    } finally {
      setBrewLoading(false);
    }
  };

  const handleBrewUpgrade = async (name: string) => {
    setBrewUpgradeLoading(name);
    setBrewUpgradeMessage(null);
    try {
      const result = await window.macCleaner?.upgradeBrewPackage?.(name) ?? {ok: false, message: 'Brew not available'};
      setBrewUpgradeMessage(result.message);
      if (result.ok) {
        await refreshBrewPackages();
      }
    } catch (error) {
      setBrewUpgradeMessage(error instanceof Error ? error.message : 'Upgrade failed.');
    } finally {
      setBrewUpgradeLoading(null);
    }
  };

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

  const runScan = async (roots?: string[]) => {
    setLastFailures([]);
    setConfirmOpen(false);

    if (mode !== 'uninstall' && mode !== 'cleanup') {
      return;
    }

    let activeSnapshot = permissionSnapshot;
    if (!activeSnapshot) {
      try {
        activeSnapshot = window.macCleaner?.getPermissionSnapshot
          ? await window.macCleaner.getPermissionSnapshot()
          : MOCK_PERMISSION_SNAPSHOT;
        setPermissionSnapshot(activeSnapshot);
      } catch {
        activeSnapshot = MOCK_PERMISSION_SNAPSHOT;
        setPermissionSnapshot(activeSnapshot);
      }
    }

    const fullDiskAccess = activeSnapshot.permissions.find(
      (permission) => permission.target === 'privacy-full-disk-access',
    );
    if (fullDiskAccess?.status === 'not-granted') {
      setPermissionModalOpen(true);
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
        nextSummary = window.macCleaner?.scanOrphans
          ? await window.macCleaner.scanOrphans(roots)
          : filterSummaryByRoots(MOCK_ORPHAN_SUMMARY, roots);
      } else {
        nextSummary = window.macCleaner?.scanSystemJunk
          ? await window.macCleaner.scanSystemJunk(roots)
          : filterSummaryByRoots(MOCK_SYSTEM_SUMMARY, roots);
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

  const handleGoToSettings = () => {
    setPermissionModalOpen(false);
    setMode('settings');
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
        permissionModalOpen={permissionModalOpen}
        onPermissionModalClose={() => setPermissionModalOpen(false)}
        onGoToSettings={handleGoToSettings}
        brewPackages={brewPackages}
        brewOutdated={brewOutdated}
        brewLoading={brewLoading}
        brewError={brewError}
        brewUpgradeLoading={brewUpgradeLoading}
        brewUpgradeMessage={brewUpgradeMessage}
        onRefreshBrewPackages={refreshBrewPackages}
        onBrewUpgrade={handleBrewUpgrade}
      />
    </div>
  );
}
