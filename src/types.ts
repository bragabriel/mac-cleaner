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

export type StartupCategory =
  | 'login-items'
  | 'launch-agents-user'
  | 'launch-agents-system'
  | 'launch-daemons'
  | 'services';

export type StartupCategoryState = 'available' | 'empty' | 'error' | 'permission-needed' | 'unsupported';

export interface StartupCategorySummary {
  id: StartupCategory;
  title: string;
  subtitle: string;
  state: StartupCategoryState;
  detail: string;
  count: number;
}

export interface StartupItem {
  id: string;
  category: StartupCategory;
  label: string;
  displayName: string;
  description: string;
  plistPath: string | null;
  executablePath: string | null;
  program: string | null;
  programArguments: string[];
  runAtLoad: boolean | null;
  keepAlive: boolean | null;
  disabledInPlist: boolean | null;
  enabled: boolean | null;
  loaded: boolean | null;
  pid: number | null;
  lastExitStatus: number | null;
  scope: 'user' | 'system' | 'unknown';
  requiresAdmin: boolean;
  supportsToggle: boolean;
  source: 'plist' | 'service' | 'login-item';
  domain: string | null;
  errorMessage: string | null;
}

export interface StartupSnapshot {
  checkedAt: string;
  categories: StartupCategorySummary[];
  items: StartupItem[];
  globalError: string | null;
}

export type StartupAction = 'enable' | 'disable' | 'reload';

export interface StartupActionResult {
  action: StartupAction;
  ok: boolean;
  item: StartupItem | null;
  message: string;
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
  listStartupItems?: () => Promise<StartupSnapshot>;
  getStartupItemDetails?: (itemId: string) => Promise<StartupItem | null>;
  runStartupAction?: (itemId: string, action: StartupAction) => Promise<StartupActionResult>;
}

declare global {
  interface Window {
    macCleaner?: DesktopApi;
  }
}
