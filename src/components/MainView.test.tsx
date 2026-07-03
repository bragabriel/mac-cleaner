import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {MainView} from './MainView';
import type {AppItem, PermissionSnapshot, ScanSummary} from '../types';

const app: AppItem = {
  id: 'app-1',
  name: 'CleanShot X',
  appPath: '/Applications/CleanShot X.app',
  bundleId: 'com.example.cleanshotx',
  sizeBytes: 1024 * 1024 * 128,
  source: 'mock',
};

const summary: ScanSummary = {
  mode: 'uninstall',
  title: 'Scan Results',
  subtitle: 'Review the files found for this app.',
  app,
  scannedRoots: ['~/Library/Caches', '~/Library/Application Support'],
  inaccessibleRoots: [],
  items: [
    {
      id: 'result-1',
      label: 'Cache bundle',
      category: 'caches',
      sizeBytes: 1024 * 12,
      path: '~/Library/Caches/com.example.cleanshotx',
      selected: true,
      modifiedAt: '2026-06-02T00:00:00.000Z',
      isDirectory: true,
      reason: 'Matched bundle identifier',
      confidence: 'high',
      appName: 'CleanShot X',
    },
  ],
};

const permissionSnapshot: PermissionSnapshot = {
  checkedAt: '2026-07-01T12:00:00.000Z',
  permissions: [
    {
      target: 'privacy-full-disk-access',
      status: 'not-granted',
      detail: 'Protected folders are still hidden from the scan.',
    },
    {
      target: 'privacy-accessibility',
      status: 'granted',
      detail: 'Accessibility access is available.',
    },
  ],
};

const baseProps = {
  mode: 'uninstall' as const,
  cleanupMode: 'residues' as const,
  app,
  apps: [app],
  searchQuery: '',
  summary,
  scanStatus: {
    loadingApps: false,
    scanning: false,
    removing: false,
    progress: 100,
    progressLabel: '',
  },
  permissionSnapshot,
  permissionCheckLoading: false,
  permissionCheckError: null,
  brewPackages: [],
  brewOutdated: [],
  brewLoading: false,
  brewError: null,
  brewUpgradeLoading: null,
  brewUpgradeMessage: null,
  onRefreshBrewPackages: vi.fn(),
  onBrewUpgrade: vi.fn(),
  onBrewSearchChange: vi.fn(),
  brewSearchQuery: '',
  onModeChange: vi.fn(),
  onCleanupModeChange: vi.fn(),
  onSelectApp: vi.fn(),
  onSearchChange: vi.fn(),
  onRunScan: vi.fn(),
  onToggleItem: vi.fn(),
  onToggleAll: vi.fn(),
  onOpenSystemSettings: vi.fn(),
  onRefreshPermissionSnapshot: vi.fn(),
  onCopyPath: vi.fn(),
  onRevealPath: vi.fn(),
  onOpenPath: vi.fn(),
  onRemoveSelected: vi.fn(),
  confirmState: {
    open: false,
    selectedItems: [],
    failures: [],
  },
  onConfirmRemoval: vi.fn(),
  onCancelRemoval: vi.fn(),
  permissionModalOpen: false,
  onPermissionModalClose: vi.fn(),
  onGoToSettings: vi.fn(),
};

describe('MainView', () => {
  it('renders the uninstall workspace safely before an app is selected', () => {
    expect(() => render(<MainView {...baseProps} app={null} summary={null} />)).not.toThrow();
  });

  it('renders the settings permissions workspace with actions', async () => {
    const user = userEvent.setup();
    const onRefreshPermissionSnapshot = vi.fn();

    render(<MainView {...baseProps} mode="settings" onRefreshPermissionSnapshot={onRefreshPermissionSnapshot} />);

    expect(screen.getByText('Open Full Disk Access')).toBeInTheDocument();
    expect(screen.getByText('Retry check')).toBeInTheDocument();
    expect(screen.getByText('Protected folders are still hidden from the scan.')).toBeInTheDocument();

    await user.click(screen.getByText('Accessibility'));

    expect(screen.getAllByText('Granted').length).toBeGreaterThan(0);

    await user.click(screen.getByText('Retry check'));

    expect(onRefreshPermissionSnapshot).toHaveBeenCalledOnce();
    expect(screen.queryByText('Background Items')).not.toBeInTheDocument();
  });

  it('renders brew packages as a separate workspace', () => {
    render(<MainView {...baseProps} mode="brew" brewPackages={[
      { name: 'postgresql@16', outdated: false },
    ]} />);

    expect(screen.getAllByText('Brew Packages').length).toBeGreaterThan(0);
    expect(screen.getAllByText('postgresql@16').length).toBeGreaterThan(0);
  });

  it('shows the brew empty state when no packages are installed', () => {
    render(<MainView {...baseProps} mode="brew" brewPackages={[]} brewOutdated={[]} />);

    expect(screen.getByText('No brew packages installed.')).toBeInTheDocument();
    expect(screen.queryByText('Select a Homebrew service to inspect its state, plist path, and runtime details.')).not.toBeInTheDocument();
  });

  it('keeps settings last on the home grid', () => {
    render(<MainView {...baseProps} mode="home" summary={null} />);

    const cards = screen.getAllByText('Open section').map((node) => node.closest('button')?.textContent ?? '');

    expect(cards).toHaveLength(5);
    expect(cards[3]).toContain('Brew Packages');
    expect(cards[4]).toContain('Settings');
  });

  it('keeps cleanup feature screens scoped to the selected mode', () => {
    const {rerender} = render(<MainView {...baseProps} mode="cleanup" cleanupMode="residues" summary={null} />);

    expect(screen.getByText('Cleanup Profiles')).toBeInTheDocument();
    expect(screen.getAllByText('App Residues').length).toBeGreaterThan(0);
    expect(screen.queryByText('System Junk')).not.toBeInTheDocument();

    rerender(<MainView {...baseProps} mode="cleanup" cleanupMode="system" summary={null} />);

    expect(screen.getByText('Cleanup Profiles')).toBeInTheDocument();
    expect(screen.getAllByText('System Junk').length).toBeGreaterThan(0);
    expect(screen.queryByText('App Residues')).not.toBeInTheDocument();
  });

  it('passes selected cleanup roots to the scan action', async () => {
    const user = userEvent.setup();
    const onRunScan = vi.fn();

    render(<MainView {...baseProps} mode="cleanup" cleanupMode="residues" summary={null} onRunScan={onRunScan} />);

    await user.click(screen.getByLabelText('~/Library/Caches'));
    await user.click(screen.getByText('Run cleanup scan'));

    expect(onRunScan).toHaveBeenCalledWith([
      '~/Library/Application Support',
      '~/Library/Preferences',
      '~/Library/Containers',
      '~/Library/Group Containers',
      '~/Library/Logs',
      '~/Library/Saved Application State',
    ]);
  });
});
