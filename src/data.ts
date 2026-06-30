import type { AppItem } from './types';

export const MOCK_APPS: AppItem[] = [
  {
    id: 'mock:visual-studio-code',
    name: 'Visual Studio Code',
    bundleId: 'com.microsoft.VSCode',
    appPath: '/Applications/Visual Studio Code.app',
    sizeBytes: 374_865_920,
    modifiedAt: new Date().toISOString(),
    source: 'mock',
  },
  {
    id: 'mock:spotify',
    name: 'Spotify',
    bundleId: 'com.spotify.client',
    appPath: '/Applications/Spotify.app',
    sizeBytes: 196_083_712,
    modifiedAt: new Date().toISOString(),
    source: 'mock',
  },
];
