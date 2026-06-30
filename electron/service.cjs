const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const APPLICATION_ROOTS = ['/Applications', path.join(os.homedir(), 'Applications')];

function normalizeAppName(bundlePath) {
  return path.basename(bundlePath, '.app');
}

async function readDirectorySafe(directoryPath) {
  try {
    return await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function collectAppBundles(rootPath, depth = 0, maxDepth = 2, buckets = new Set()) {
  const entries = await readDirectorySafe(rootPath);

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = path.join(rootPath, entry.name);
    if (entry.name.endsWith('.app')) {
      buckets.add(fullPath);
      continue;
    }

    if (depth < maxDepth) {
      await collectAppBundles(fullPath, depth + 1, maxDepth, buckets);
    }
  }

  return buckets;
}

async function readBundleId(appPath) {
  try {
    const { stdout } = await execFileAsync('mdls', [
      '-raw',
      '-name',
      'kMDItemCFBundleIdentifier',
      appPath,
    ]);
    const bundleId = stdout.trim();
    return bundleId && bundleId !== '(null)' ? bundleId : null;
  } catch {
    return null;
  }
}

async function readSizeBytes(appPath) {
  try {
    const { stdout } = await execFileAsync('du', ['-sk', appPath]);
    const sizeKb = Number.parseInt(stdout.trim().split(/\s+/)[0] ?? '0', 10);
    return Number.isFinite(sizeKb) ? sizeKb * 1024 : 0;
  } catch {
    return 0;
  }
}

async function listInstalledApps() {
  const bundleSet = new Set();

  for (const rootPath of APPLICATION_ROOTS) {
    await collectAppBundles(rootPath, 0, 2, bundleSet);
  }

  const apps = await Promise.all(
    [...bundleSet].map(async (appPath) => {
      const stats = await fs.stat(appPath);
      const bundleId = await readBundleId(appPath);
      const name = normalizeAppName(appPath);

      return {
        id: bundleId ?? `path:${appPath}`,
        name,
        bundleId,
        appPath,
        sizeBytes: await readSizeBytes(appPath),
        modifiedAt: stats.mtime.toISOString(),
        source: appPath.startsWith(path.join(os.homedir(), 'Applications')) ? 'user' : 'system',
      };
    }),
  );

  return apps.sort((left, right) => left.name.localeCompare(right.name));
}

module.exports = {
  listInstalledApps,
};
