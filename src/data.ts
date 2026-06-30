import { AppItem, RelatedFile } from './types';

export const MOCK_APPS: AppItem[] = [
  {
    id: '1',
    name: 'Slack',
    bundleId: 'com.tinyspeck.slackmacgap',
    path: '/Applications/Slack.app',
    icon: 'Slack',
    size: '245 MB'
  },
  {
    id: '2',
    name: 'Visual Studio Code',
    bundleId: 'com.microsoft.VSCode',
    path: '/Applications/Visual Studio Code.app',
    icon: 'Code',
    size: '512 MB'
  },
  {
    id: '3',
    name: 'Spotify',
    bundleId: 'com.spotify.client',
    path: '/Applications/Spotify.app',
    icon: 'Music',
    size: '180 MB'
  },
  {
    id: '6',
    name: 'Adobe Photoshop (Legacy)',
    bundleId: 'com.adobe.Photoshop',
    path: '(App Missing)',
    icon: 'Ghost',
    size: '0 KB',
    isOrphaned: true
  }
];

export const COMMON_PATHS = [
  '~/Library/Application Support',
  '~/Library/Preferences',
  '~/Library/Caches',
  '~/Library/Containers',
  '~/Library/Logs',
  '~/Library/Saved Application State',
  '~/Library/Group Containers'
];

export const generateRelatedFiles = (app: AppItem): RelatedFile[] => {
  const files: RelatedFile[] = [];
  const bundleId = app.bundleId;

  // Add the main app itself (if not orphaned)
  if (!app.isOrphaned) {
    files.push({
      id: `main-${app.id}`,
      path: app.path,
      size: app.size || '0 KB',
      type: 'directory',
      selected: true,
      risk: 'high',
      category: 'Binary',
      reason: 'Main executable bundle'
    });
  }

  // Application Support
  files.push({
    id: `support-${app.id}`,
    path: `~/Library/Application Support/${app.name}`,
    size: '12.4 MB',
    type: 'directory',
    selected: true,
    risk: 'low',
    category: 'Support',
    reason: 'Standard application data'
  });

  // Preferences
  files.push({
    id: `pref-${app.id}`,
    path: `~/Library/Preferences/${bundleId}.plist`,
    size: '48 KB',
    type: 'file',
    selected: true,
    risk: 'low',
    category: 'Preference',
    reason: 'User settings and configuration'
  });

  // Caches
  files.push({
    id: `cache-${app.id}`,
    path: `~/Library/Caches/${bundleId}`,
    size: '156.2 MB',
    type: 'directory',
    selected: true,
    risk: 'low',
    category: 'Cache',
    reason: 'Temporary performance files'
  });

  // Logs
  files.push({
    id: `logs-${app.id}`,
    path: `~/Library/Logs/${app.name}`,
    size: '2.1 MB',
    type: 'directory',
    selected: true,
    risk: 'low',
    category: 'Log',
    reason: 'Diagnostic log files'
  });

  // Group Containers (Premium Feature)
  files.push({
    id: `group-${app.id}`,
    path: `~/Library/Group Containers/group.${bundleId}`,
    size: '8.4 MB',
    type: 'directory',
    selected: true,
    risk: 'medium',
    category: 'Container',
    reason: 'Shared data across developer apps'
  });

  // Hidden Files (Required)
  files.push({
    id: `hidden-${app.id}`,
    path: `~/Library/Application Support/${app.name}/.config_hidden`,
    size: '12 KB',
    type: 'file',
    selected: true,
    isHidden: true,
    risk: 'medium',
    category: 'Hidden',
    reason: 'Hidden configuration file'
  });

  return files;
};
