import {render} from '@testing-library/react';
import React from 'react';
import {MainView} from './MainView';

const app = {
  id: 'app-1',
  name: 'CleanShot X',
  category: 'Utility',
  installedAt: '2026-06-01T00:00:00.000Z',
  version: '4.0.0',
  bundleId: 'com.example.cleanshotx',
  sizeBytes: 1024 * 1024 * 128,
  path: '/Applications/CleanShot X.app',
};

const summary = {
  title: 'Scan Results',
  description: 'Review the files found for this app.',
  scannedRoots: ['~/Library/Caches', '~/Library/Application Support'],
  items: [
    {
      id: 'result-1',
      label: 'Cache bundle',
      category: 'cache',
      sizeBytes: 1024 * 12,
      path: '~/Library/Caches/com.example.cleanshotx',
      selected: true,
      modifiedAt: '2026-06-02T00:00:00.000Z',
      roots: ['~/Library/Caches'],
      reason: 'Matched bundle identifier',
    },
  ],
};

const summaryWithoutRestrictedRoots = {
  ...summary,
  inaccessibleRoots: undefined,
};

const baseProps = {
  cleanupMode: 'apps' as const,
  apps: [app],
  searchValue: '',
  summary,
  scanStatus: {
    scanning: false,
    removing: false,
    progress: 100,
  },
  usingDesktopApi: false,
  confirmState: {
    open: false,
    selectedItems: [],
  },
  onSelectApp: vi.fn(),
  onSearchChange: vi.fn(),
  onRunScan: vi.fn(),
  onToggleItem: vi.fn(),
  onToggleAll: vi.fn(),
  onOpenPath: vi.fn(),
  onConfirmRemoval: vi.fn(),
  onCloseConfirm: vi.fn(),
  onCleanupModeChange: vi.fn(),
};

describe('MainView uninstall layout', () => {
  it('renders the right-side scan results column without crashing', () => {
    expect(() =>
      render(<MainView {...baseProps} mode="uninstall" app={app} summary={summaryWithoutRestrictedRoots as typeof summary} />),
    ).not.toThrow();
  });

  it('renders the uninstall workspace safely before an app is selected', () => {
    expect(() => render(<MainView {...baseProps} mode="uninstall" app={null} summary={null} />)).not.toThrow();
  });
});
