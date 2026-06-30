const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { listInstalledApps, scanAppResidues } = require('./service.cjs');

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

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

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (DEV_SERVER_URL) {
    window.loadURL(DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('apps:list', async () => listInstalledApps());
  ipcMain.handle('scan:app', async (_event, appItem) => scanAppResidues(appItem));
  ipcMain.handle('finder:reveal', async (_event, targetPath) => shell.showItemInFolder(targetPath));
  ipcMain.handle('permissions:open-settings', async () =>
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles'),
  );
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
