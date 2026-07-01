export type ProductMode = 'home' | 'uninstall' | 'cleanup' | 'startup' | 'settings';

export type CleanupMode = 'residues' | 'system';

export type AppSource = 'mock' | 'system';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type ScanItemCategory =
  | 'application'
  | 'application-support'
  | 'preferences'
  | 'caches'
  | 'logs'
  | 'containers'
  | 'group-containers'
  | 'saved-state'
  | 'hidden'
  | 'other';

export interface AppItem {
  id: string;
  name: string;
  appPath: string;
  bundleId: string | null;
  sizeBytes: number;
  source: AppSource;
}

export interface ScanItem {
  id: string;
  label: string;
  path: string;
  category: ScanItemCategory;
  confidence: ConfidenceLevel;
  reason: string;
  appName: string | null;
  sizeBytes: number;
  modifiedAt: string;
  isDirectory: boolean;
  selected?: boolean;
}

export interface ScanSummary {
  mode: 'uninstall' | CleanupMode;
  title: string;
  subtitle: string;
  app: AppItem | null;
  items: ScanItem[];
  scannedRoots: string[];
  inaccessibleRoots: string[];
}

export interface ScanStatus {
  loadingApps: boolean;
  scanning: boolean;
  removing: boolean;
  progress: number;
  progressLabel: string;
}

export interface RemovalFailure {
  path: string;
  message: string;
}

export interface RemovalResult {
  removedPaths: string[];
  failedPaths: RemovalFailure[];
}

export type PermissionSettingTarget =
  | 'privacy'
  | 'privacy-full-disk-access'
  | 'privacy-accessibility'
  | 'privacy-automation'
  | 'login-items';

export type PermissionPriority = 'required' | 'recommended' | 'optional';

export type PermissionStatus = 'granted' | 'not-granted' | 'needs-manual-review' | 'unknown';

export interface PermissionSnapshotItem {
  target: PermissionSettingTarget;
  status: PermissionStatus;
  detail: string;
}

export interface PermissionSnapshot {
  checkedAt: string;
  permissions: PermissionSnapshotItem[];
}

export interface DesktopApi {
  listApps?: () => Promise<AppItem[]>;
  scanApp?: (app: AppItem) => Promise<ScanSummary>;
  scanOrphans?: () => Promise<ScanSummary>;
  scanSystemJunk?: () => Promise<ScanSummary>;
  removePaths?: (targetPaths: string[]) => Promise<RemovalResult>;
  revealPath?: (targetPath: string) => Promise<void>;
  openPath?: (targetPath: string) => Promise<void>;
  openSystemSettings?: (target: PermissionSettingTarget) => Promise<void>;
  getPermissionSnapshot?: () => Promise<PermissionSnapshot>;
}

declare global {
  interface Window {
    macCleaner?: DesktopApi;
  }
}
