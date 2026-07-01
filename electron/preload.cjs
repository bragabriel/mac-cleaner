const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macCleaner', {
  listApps: () => ipcRenderer.invoke('apps:list'),
  scanApp: (appItem) => ipcRenderer.invoke('scan:app', appItem),
  scanOrphans: () => ipcRenderer.invoke('scan:orphans'),
  scanSystemJunk: () => ipcRenderer.invoke('scan:system-junk'),
  removeItems: (targetPaths) => ipcRenderer.invoke('items:remove', targetPaths),
  revealPath: (targetPath) => ipcRenderer.invoke('finder:reveal', targetPath),
  openPath: (targetPath) => ipcRenderer.invoke('item:open', targetPath),
  openSystemSettings: (target) => ipcRenderer.invoke('permissions:open-settings', target),
  getPermissionSnapshot: () => ipcRenderer.invoke('permissions:get-snapshot'),
  listStartupItems: () => ipcRenderer.invoke('startup:list'),
  getStartupItemDetails: (itemId) => ipcRenderer.invoke('startup:get-item-details', itemId),
  runStartupAction: (itemId, action) => ipcRenderer.invoke('startup:run-action', itemId, action),
});
