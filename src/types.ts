export type AppSource = 'system' | 'user' | 'mock';

export interface AppItem {
  id: string;
  name: string;
  bundleId: string | null;
  appPath: string;
  sizeBytes: number;
  modifiedAt: string;
  source: AppSource;
}

export interface ResidueItem {
  id: string;
  path: string;
  sizeBytes: number;
  category: string;
  kind: 'file' | 'directory';
  selected: boolean;
}

export interface ScanStatus {
  loadingApps: boolean;
  scanning: boolean;
  removing: boolean;
}

export interface ScanSummary {
  app: AppItem | null;
  residues: ResidueItem[];
  warnings: string[];
  inaccessibleRoots: string[];
  scannedRoots: string[];
}

export interface RemovalSummary {
  removedPaths: string[];
  failedPaths: Array<{ path: string; reason: string }>;
}

export interface DesktopApi {
  isDesktop: boolean;
  listApps?: () => Promise<AppItem[]>;
  scanApp?: (app: AppItem) => Promise<ScanSummary>;
  revealPath?: (targetPath: string) => Promise<void>;
  openPrivacySettings?: () => Promise<void>;
}
