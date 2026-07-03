const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { app, BrowserWindow, ipcMain, nativeImage, shell } = require('electron');
const { listInstalledApps, removeItems, scanAppResidues, scanOrphanResidues, scanSystemJunk } = require('./service.cjs');
const { listInstalledPackages, listOutdatedPackages, upgradePackage } = require('./homebrew/services.cjs');
const { getPermissionSnapshot, openSystemSettingsTarget } = require('./permissions/checks.cjs');

const execFileAsync = promisify(execFile);

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

async function convertIcnsToDataUrl(iconPath) {
  const cacheDir = path.join(app.getPath('temp'), 'mac-cleaner-icons');
  const cacheName = `${Buffer.from(iconPath).toString('base64url')}.png`;
  const outputPath = path.join(cacheDir, cacheName);

  await fs.mkdir(cacheDir, { recursive: true });

  try {
    const cachedPng = await fs.readFile(outputPath);
    return `data:image/png;base64,${cachedPng.toString('base64')}`;
  } catch {
    // Cache miss; convert below.
  }

  await execFileAsync('sips', ['-Z', '64', '-s', 'format', 'png', iconPath, '--out', outputPath], {
    maxBuffer: 1024 * 1024,
  });
  const png = await fs.readFile(outputPath);
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function readAppIconFile(appPath) {
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');

  try {
    const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', plistPath], {
      maxBuffer: 1024 * 1024,
    });
    const plist = JSON.parse(stdout);
    const iconFile = plist.CFBundleIconFile;

    if (!iconFile || typeof iconFile !== 'string') {
      return null;
    }

    const iconFileName = iconFile.endsWith('.icns') ? iconFile : `${iconFile}.icns`;
    const iconPath = path.join(appPath, 'Contents', 'Resources', iconFileName);
    await fs.access(iconPath);

    return convertIcnsToDataUrl(iconPath);
  } catch {
    return null;
  }
}

async function readAppFileIcon(appPath) {
  try {
    const icon = await app.getFileIcon(appPath, { size: 'normal' });
    return icon.isEmpty() ? null : icon.toDataURL();
  } catch {
    return null;
  }
}

async function listInstalledAppsWithIcons() {
  const installedApps = await listInstalledApps();

  return Promise.all(
    installedApps.map(async (installedApp) => {
      const plistIconDataUrl = await readAppIconFile(installedApp.appPath);
      const fileIconDataUrl = plistIconDataUrl ? null : await readAppFileIcon(installedApp.appPath);
      const iconDataUrl = plistIconDataUrl ?? fileIconDataUrl;

      if (process.env.MAC_CLEANER_DEBUG_ICONS === '1') {
        console.info(
          '[icons]',
          JSON.stringify({
            app: installedApp.name,
            source: plistIconDataUrl ? 'plist' : fileIconDataUrl ? 'file-icon' : 'none',
            bytes: iconDataUrl?.length ?? 0,
          }),
        );
      }

      if (!iconDataUrl) {
        return installedApp;
      }

      return {
        ...installedApp,
        iconDataUrl,
      };
    }),
  );
}
app.whenReady().then(() => {
  ipcMain.handle('apps:list', async () => listInstalledAppsWithIcons());
  ipcMain.handle('scan:app', async (_event, appItem) => scanAppResidues(appItem));
  ipcMain.handle('scan:orphans', async (_event, roots) => scanOrphanResidues(roots));
  ipcMain.handle('scan:system-junk', async (_event, roots) => scanSystemJunk(roots));
  ipcMain.handle('items:remove', async (_event, targetPaths) => removeItems(targetPaths));
  ipcMain.handle('finder:reveal', async (_event, targetPath) => shell.showItemInFolder(targetPath));
  ipcMain.handle('item:open', async (_event, targetPath) => shell.openPath(targetPath));
  ipcMain.handle('permissions:get-snapshot', async () => getPermissionSnapshot());
  ipcMain.handle('permissions:open-settings', async (_event, target) => openSystemSettingsTarget(target));
  ipcMain.handle('brew:list-installed', async () => listInstalledPackages());
  ipcMain.handle('brew:outdated', async () => listOutdatedPackages());
  ipcMain.handle('brew:upgrade', async (_event, name) => upgradePackage(name));

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
