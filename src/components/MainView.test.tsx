import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {MainView} from './MainView';
import type {AppItem, PermissionSnapshot, ScanSummary, StartupSnapshot} from '../types';

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
    {
      target: 'login-items',
      status: 'needs-manual-review',
      detail: 'Background Items should be reviewed manually.',
    },
  ],
};

const startupSnapshot: StartupSnapshot = {
  checkedAt: '2026-07-01T12:05:00.000Z',
  globalError: null,
  categories: [
    {
      id: 'login-items',
      title: 'Login Items',
      subtitle: 'Apps that request launch when the user session starts.',
      state: 'permission-needed',
      detail: 'Review Login Items in System Settings.',
      count: 0,
    },
    {
      id: 'launch-agents-user',
      title: 'Launch Agents (User)',
      subtitle: 'Per-user launchd jobs.',
      state: 'available',
      detail: 'One user agent is visible.',
      count: 1,
    },
    {
      id: 'launch-agents-system',
      title: 'Launch Agents (System)',
      subtitle: 'System-wide GUI agents.',
      state: 'empty',
      detail: 'No system launch agents were found.',
      count: 0,
    },
    {
      id: 'launch-daemons',
      title: 'Launch Daemons',
      subtitle: 'System launchd jobs.',
      state: 'empty',
      detail: 'No daemons were found.',
      count: 0,
    },
    {
      id: 'services',
      title: 'Brew Services',
      subtitle: 'Homebrew-managed services.',
      state: 'available',
      detail: 'One brew service is visible.',
      count: 1,
    },
  ],
  items: [
    {
      id: 'launch-agents-user:spotify',
      category: 'launch-agents-user',
      label: 'com.spotify.webhelper',
      displayName: 'Spotify Helper',
      description: 'Launches Spotify helper work in the user session.',
      plistPath: '/Users/demo/Library/LaunchAgents/com.spotify.webhelper.plist',
      executablePath: '/Applications/Spotify.app/Contents/MacOS/Spotify',
      program: '/Applications/Spotify.app/Contents/MacOS/Spotify',
      programArguments: ['/Applications/Spotify.app/Contents/MacOS/Spotify', '--background'],
      runAtLoad: true,
      keepAlive: false,
      disabledInPlist: false,
      enabled: true,
      loaded: true,
      pid: 412,
      lastExitStatus: 0,
      scope: 'user',
      requiresAdmin: false,
      supportsToggle: true,
      source: 'plist',
      domain: 'gui/501',
      errorMessage: null,
    },
    {
      id: 'services:postgresql@16',
      category: 'services',
      label: 'postgresql@16',
      displayName: 'postgresql@16',
      description: 'Homebrew service backed by the postgresql@16 formula.',
      plistPath: '/Users/demo/Library/LaunchAgents/homebrew.mxcl.postgresql@16.plist',
      executablePath: null,
      program: null,
      programArguments: [],
      runAtLoad: true,
      keepAlive: true,
      disabledInPlist: false,
      enabled: true,
      loaded: true,
      pid: null,
      lastExitStatus: null,
      scope: 'user',
      requiresAdmin: false,
      supportsToggle: false,
      source: 'service',
      domain: null,
      errorMessage: null,
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
  startupSnapshot,
  startupLoading: false,
  startupError: null,
  startupItemDetail: startupSnapshot.items[0],
  startupItemDetailLoading: false,
  startupActionLoading: false,
  startupActionMessage: null,
  onModeChange: vi.fn(),
  onCleanupModeChange: vi.fn(),
  onSelectApp: vi.fn(),
  onSearchChange: vi.fn(),
  onRunScan: vi.fn(),
  onToggleItem: vi.fn(),
  onToggleAll: vi.fn(),
  onOpenSystemSettings: vi.fn(),
  onRefreshPermissionSnapshot: vi.fn(),
  onRefreshStartupSnapshot: vi.fn(),
  onSelectStartupItem: vi.fn(),
  onRunStartupAction: vi.fn(),
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
    const onRefreshStartupSnapshot = vi.fn();

    render(
      <MainView
        {...baseProps}
        mode="settings"
        onRefreshPermissionSnapshot={onRefreshPermissionSnapshot}
        onRefreshStartupSnapshot={onRefreshStartupSnapshot}
      />,
    );

    expect(screen.getByText('Open Full Disk Access')).toBeInTheDocument();
    expect(screen.getByText('Retry check')).toBeInTheDocument();
    expect(screen.getByText('Protected folders are still hidden from the scan.')).toBeInTheDocument();

    await user.click(screen.getByText('Accessibility'));

    expect(screen.getAllByText('Granted').length).toBeGreaterThan(0);

    await user.click(screen.getByText('Retry check'));

    expect(onRefreshPermissionSnapshot).toHaveBeenCalledOnce();

    await user.click(screen.getByText('Background Items'));
    await user.click(screen.getByText('Retry check'));

    expect(onRefreshStartupSnapshot).toHaveBeenCalledOnce();
  });

  it('renders the startup inventory workspace with live item details', async () => {
    const user = userEvent.setup();

    render(<MainView {...baseProps} mode="startup" />);

    expect(screen.getAllByText('Launch Agents (User)').length).toBeGreaterThan(0);
    expect(screen.queryByText('Brew Services')).not.toBeInTheDocument();
    await user.click(screen.getAllByText('Launch Agents (User)')[0]!);
    expect(screen.getAllByText('Spotify Helper').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reveal plist').length).toBeGreaterThan(0);
  });

  it('keeps login items in the standard startup column flow', () => {
    render(<MainView {...baseProps} mode="startup" />);

    expect(screen.getByText('macOS requires manual review for apps and background items that launch at sign-in.')).toBeInTheDocument();
    expect(screen.getByText('Open Login Items')).toBeInTheDocument();
    expect(screen.queryByText('Select a startup item to inspect its launch metadata, executable path, and launchctl state.')).not.toBeInTheDocument();
  });

  it('renders brew services as a separate workspace', () => {
    render(<MainView {...baseProps} mode="brew" />);

    expect(screen.getAllByText('Brew Services').length).toBeGreaterThan(0);
    expect(screen.getAllByText('postgresql@16').length).toBeGreaterThan(0);
    expect(screen.getByText('Homebrew service backed by the postgresql@16 formula.')).toBeInTheDocument();
  });

  it('keeps the brew empty state in one place and avoids a broken selection prompt', () => {
    const emptyBrewSnapshot: StartupSnapshot = {
      ...startupSnapshot,
      categories: startupSnapshot.categories.map((category) =>
        category.id === 'services'
          ? {
              ...category,
              state: 'empty',
              detail: 'Homebrew is installed, but no brew services are currently registered.',
              count: 0,
            }
          : category,
      ),
      items: startupSnapshot.items.filter((item) => item.category !== 'services'),
    };

    render(<MainView {...baseProps} mode="brew" startupSnapshot={emptyBrewSnapshot} startupItemDetail={null} />);

    expect(screen.getByText('Homebrew services discovered from brew services list.')).toBeInTheDocument();
    expect(screen.getByText('No brew services to list.')).toBeInTheDocument();
    expect(screen.getByText('Homebrew is installed, but no brew services are currently registered.')).toBeInTheDocument();
    expect(screen.queryByText('Select a Homebrew service to inspect its state, plist path, and runtime details.')).not.toBeInTheDocument();
  });

  it('keeps settings last on the home grid', () => {
    render(<MainView {...baseProps} mode="home" summary={null} />);

    const cards = screen.getAllByText('Open section').map((node) => node.closest('button')?.textContent ?? '');

    expect(cards).toHaveLength(6);
    expect(cards[3]).toContain('Startup Items');
    expect(cards[4]).toContain('Brew Services');
    expect(cards[5]).toContain('Settings');
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
