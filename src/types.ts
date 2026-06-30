export interface AppItem {
  id: string;
  name: string;
  bundleId: string;
  path: string;
  icon: string;
  size?: string;
  isOrphaned?: boolean;
}

export interface RelatedFile {
  id: string;
  path: string;
  size: string;
  type: 'file' | 'directory';
  selected: boolean;
  isHidden?: boolean;
  status?: 'idle' | 'success' | 'error';
  risk: 'low' | 'medium' | 'high';
  category: 'Binary' | 'Support' | 'Preference' | 'Cache' | 'Container' | 'Log' | 'Hidden';
  reason: string;
}

export interface ScanStatus {
  scanning: boolean;
  progress: number;
  currentPath: string;
  permissionsGranted: boolean;
  isDeepScan?: boolean;
}
