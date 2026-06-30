export type ProductMode = 'home' | 'uninstall' | 'residues' | 'system';

export type AppSource = 'installed' | 'residue' | 'system' | 'mock';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type ScanItemCategory =
  | 'application'
  | 'application-support'
  | 'preferences'
  | 'caches'
  | 'containers'
  | 'group-containers'
  | 'logs'
  | 'saved-state'
  | 'hidden'
  | 'system'
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
  modifiedAt: string | null;
  isDirectory: boolean;
  selected: boolean;
}

export interface ScanSummary {
  mode: Exclude<ProductMode, 'home'>;
  title: string;
  subtitle: string;
  app: AppItem | null;
  items: ScanItem[];
  scannedRoots: string[];
  inaccessibleRoots: string[];
}

export interface RemovalFailure {
  path: string;
  message: string;
}

export interface RemovalSummary {
  removedPaths: string[];
  failedPaths: RemovalFailure[];
}

export interface ScanStatus {
  loadingApps: boolean;
  scanning: boolean;
  removing: boolean;
  progress: number;
  progressLabel: string;
}

export interface DesktopApi {
  listApps?: () => Promise<AppItem[]>;
  scanApp?: (app: AppItem) => Promise<ScanSummary>;
  scanOrphans?: () => Promise<ScanSummary>;
  scanSystemJunk?: () => Promise<ScanSummary>;
  removeItems?: (targetPaths: string[]) => Promise<RemovalSummary>;
  revealPath?: (targetPath: string) => Promise<void>;
  openPath?: (targetPath: string) => Promise<void>;
  openPrivacySettings?: () => Promise<void>;
}

declare global {
  interface Window {
    macCleaner?: DesktopApi;
  }
}
