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
      target: 'privacy-automation',
      status: 'unknown',
      detail: 'Automation must be verified manually.',
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
      state: 'unsupported',
      detail: 'Homebrew services are not mapped yet.',
      count: 0,
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
  usingDesktopApi: false,
  permissionSnapshot,
  permissionCheckLoading: false,
  permissionCheckError: null,
  startupSnapshot,
  startupLoading: false,
  startupError: null,
  startupItemDetail: startupSnapshot.items[0],
  startupItemDetailLoading: false,
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
};

describe('MainView', () => {
  it('renders the uninstall workspace safely before an app is selected', () => {
    expect(() => render(<MainView {...baseProps} app={null} summary={null} />)).not.toThrow();
  });

  it('renders the settings permissions workspace with actions', () => {
    render(<MainView {...baseProps} mode="settings" />);

    expect(screen.getByText('Open Full Disk Access')).toBeInTheDocument();
    expect(screen.getByText('Retry check')).toBeInTheDocument();
    expect(screen.getByText('Protected folders are still hidden from the scan.')).toBeInTheDocument();
  });

  it('renders the startup inventory workspace with live item details', async () => {
    const user = userEvent.setup();

    render(<MainView {...baseProps} mode="startup" />);

    expect(screen.getAllByText('Launch Agents (User)').length).toBeGreaterThan(0);
    await user.click(screen.getAllByText('Launch Agents (User)')[0]!);
    expect(screen.getAllByText('Spotify Helper').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reveal plist').length).toBeGreaterThan(0);
  });
});
