const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { listInstalledApps, removeItems, scanAppResidues, scanOrphanResidues, scanSystemJunk } = require('./service.cjs');
const { getPermissionSnapshot, openSystemSettingsTarget } = require('./permissions/checks.cjs');
const { runStartupAction } = require('./startup/actions.cjs');
const { getStartupItemDetails, getStartupSnapshot } = require('./startup/discovery.cjs');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 1100,
    minHeight: 800,
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
  ipcMain.handle('permissions:get-snapshot', async () => getPermissionSnapshot());
  ipcMain.handle('permissions:open-settings', async (_event, target) => openSystemSettingsTarget(target));
  ipcMain.handle('startup:list', async () => getStartupSnapshot());
  ipcMain.handle('startup:get-item-details', async (_event, itemId) => getStartupItemDetails(itemId));
  ipcMain.handle('startup:run-action', async (_event, itemId, action) => runStartupAction(itemId, action));

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
