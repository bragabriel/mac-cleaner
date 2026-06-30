const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macCleaner', {
  isDesktop: true,
  listApps: () => ipcRenderer.invoke('apps:list'),
});
