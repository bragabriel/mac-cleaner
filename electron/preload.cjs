const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('macCleaner', {
  isDesktop: true,
});
