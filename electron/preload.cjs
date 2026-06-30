const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macCleaner', {
  listApps: () => ipcRenderer.invoke('apps:list'),
  scanApp: (appItem) => ipcRenderer.invoke('scan:app', appItem),
  scanOrphans: () => ipcRenderer.invoke('scan:orphans'),
  scanSystemJunk: () => ipcRenderer.invoke('scan:system-junk'),
  removeItems: (targetPaths) => ipcRenderer.invoke('items:remove', targetPaths),
  revealPath: (targetPath) => ipcRenderer.invoke('finder:reveal', targetPath),
  openPath: (targetPath) => ipcRenderer.invoke('item:open', targetPath),
  openPrivacySettings: () => ipcRenderer.invoke('permissions:open-settings'),
});
