const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macCleaner', {
  isDesktop: true,
  listApps: () => ipcRenderer.invoke('apps:list'),
  scanApp: (appItem) => ipcRenderer.invoke('scan:app', appItem),
  moveToTrash: (targetPaths) => ipcRenderer.invoke('trash:move', targetPaths),
  revealPath: (targetPath) => ipcRenderer.invoke('finder:reveal', targetPath),
  openPrivacySettings: () => ipcRenderer.invoke('permissions:open-settings'),
});
