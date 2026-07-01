import {render, screen} from '@testing-library/react';
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
});
