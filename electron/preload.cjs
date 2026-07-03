const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macCleaner', {
  listApps: () => ipcRenderer.invoke('apps:list'),
  scanApp: (appItem) => ipcRenderer.invoke('scan:app', appItem),
  scanOrphans: (roots) => ipcRenderer.invoke('scan:orphans', roots),
  scanSystemJunk: (roots) => ipcRenderer.invoke('scan:system-junk', roots),
  removeItems: (targetPaths) => ipcRenderer.invoke('items:remove', targetPaths),
  revealPath: (targetPath) => ipcRenderer.invoke('finder:reveal', targetPath),
  openPath: (targetPath) => ipcRenderer.invoke('item:open', targetPath),
  openSystemSettings: (target) => ipcRenderer.invoke('permissions:open-settings', target),
  getPermissionSnapshot: () => ipcRenderer.invoke('permissions:get-snapshot'),
  listBrewPackages: () => ipcRenderer.invoke('brew:list-installed'),
  listBrewOutdated: () => ipcRenderer.invoke('brew:outdated'),
  upgradeBrewPackage: (name) => ipcRenderer.invoke('brew:upgrade', name),
});
