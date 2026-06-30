const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell, systemPreferences } = require('electron');
const { listInstalledApps, removeItems, scanAppResidues, scanOrphanResidues, scanSystemJunk } = require('./service.cjs');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 760,
    backgroundColor: '#f3f5f7',
    title: 'Mac Cleaner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ipcMain.handle('apps:list', async () => listInstalledApps());
  ipcMain.handle('scan:app', async (_event, appItem) => scanAppResidues(appItem));
  ipcMain.handle('scan:orphans', async () => scanOrphanResidues());
  ipcMain.handle('scan:system-junk', async () => scanSystemJunk());
  ipcMain.handle('items:remove', async (_event, targetPaths) => removeItems(targetPaths));
  ipcMain.handle('finder:reveal', async (_event, targetPath) => shell.showItemInFolder(targetPath));
  ipcMain.handle('item:open', async (_event, targetPath) => shell.openPath(targetPath));
  ipcMain.handle('permissions:open-settings', async () => {
    if (typeof systemPreferences.openSystemSettings === 'function') {
      await systemPreferences.openSystemSettings('privacy');
    }
  });

  createWindow();

  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
