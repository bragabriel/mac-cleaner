const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const HOME = os.homedir();
const APPLICATION_ROOTS = ['/Applications', path.join(HOME, 'Applications')];
const USER_LIBRARY = path.join(HOME, 'Library');
const RESIDUE_ROOTS = [
  { category: 'application-support', root: path.join(USER_LIBRARY, 'Application Support') },
  { category: 'preferences', root: path.join(USER_LIBRARY, 'Preferences') },
  { category: 'caches', root: path.join(USER_LIBRARY, 'Caches') },
  { category: 'containers', root: path.join(USER_LIBRARY, 'Containers') },
  { category: 'group-containers', root: path.join(USER_LIBRARY, 'Group Containers') },
  { category: 'logs', root: path.join(USER_LIBRARY, 'Logs') },
  { category: 'saved-state', root: path.join(USER_LIBRARY, 'Saved Application State') },
];
const SYSTEM_JUNK_ROOTS = [
  { category: 'caches', root: path.join(USER_LIBRARY, 'Caches') },
  { category: 'logs', root: path.join(USER_LIBRARY, 'Logs') },
];
const SAFE_REMOVE_ROOTS = [...APPLICATION_ROOTS, ...RESIDUE_ROOTS.map((entry) => entry.root)];

function normalizeName(input) {
  return input
    .replace(/\.app$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function toDisplayName(input) {
  return input
    .replace(/\.app$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function basenameWithoutExtension(targetPath) {
  const base = path.basename(targetPath);
  return base.endsWith('.app') ? base.slice(0, -4) : base.replace(path.extname(base), '');
}

function getCategoryFromPath(targetPath) {
  if (targetPath.endsWith('.app')) {
    return 'application';
  }

  if (targetPath.includes('/Application Support/')) {
    return 'application-support';
  }

  if (targetPath.includes('/Preferences/')) {
    return 'preferences';
  }

  if (targetPath.includes('/Caches/')) {
    return 'caches';
  }

  if (targetPath.includes('/Containers/')) {
    return 'containers';
  }

  if (targetPath.includes('/Group Containers/')) {
    return 'group-containers';
  }

  if (targetPath.includes('/Logs/')) {
    return 'logs';
  }

  if (targetPath.includes('/Saved Application State/')) {
    return 'saved-state';
  }

  if (path.basename(targetPath).startsWith('.')) {
    return 'hidden';
  }

  return 'other';
}

function confidenceForPath(targetPath, appName, terms) {
  const lowerPath = targetPath.toLowerCase();
  const normalizedBase = normalizeName(path.basename(targetPath));

  if (terms.some((term) => term.length > 3 && normalizedBase === normalizeName(term))) {
    return 'high';
  }

  if (terms.some((term) => term.length > 3 && (lowerPath.includes(term) || normalizeName(lowerPath).includes(normalizeName(term))))) {
    return 'high';
  }

  if (appName && lowerPath.includes(appName.toLowerCase())) {
    return 'medium';
  }

  return path.basename(targetPath).startsWith('.') ? 'low' : 'medium';
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function statSafe(targetPath) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
}

async function findAppBundles(rootPath) {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  const { stdout } = await execFileAsync('find', [rootPath, '-maxdepth', '3', '-type', 'd', '-name', '*.app']);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function listInstalledApps() {
  const discoveredPaths = new Set();

  for (const rootPath of APPLICATION_ROOTS) {
    const matches = await findAppBundles(rootPath);
    for (const match of matches) {
      discoveredPaths.add(match);
    }
  }

  const apps = [];

  for (const appPath of [...discoveredPaths]) {
    const stats = await statSafe(appPath);
    if (!stats) {
      continue;
    }

    apps.push({
      id: appPath,
      name: basenameWithoutExtension(appPath),
      appPath,
      bundleId: null,
      sizeBytes: stats.size,
      source: 'installed',
    });
  }

  apps.sort((left, right) => left.name.localeCompare(right.name));
  return apps;
}

function buildSearchTerms(appItem) {
  const sourceTerms = [
    appItem.name,
    basenameWithoutExtension(appItem.appPath),
    appItem.bundleId ?? '',
    ...(appItem.bundleId ? appItem.bundleId.split('.') : []),
    ...appItem.name.split(/\s+/g),
  ];

  return [
    ...new Set(
      sourceTerms
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length >= 3),
    ),
  ];
}

async function runFind(rootPath, terms) {
  if (!(await pathExists(rootPath))) {
    return { matches: [], inaccessible: false };
  }

  const args = [rootPath, '-maxdepth', '4', '('];
  terms.forEach((term, index) => {
    if (index > 0) {
      args.push('-o');
    }
    args.push('-iname', `*${term}*`);
  });
  args.push(')');

  try {
    const { stdout } = await execFileAsync('find', args, { maxBuffer: 1024 * 1024 * 8 });
    return {
      matches: stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      inaccessible: false,
    };
  } catch (error) {
    const stderr = typeof error.stderr === 'string' ? error.stderr : '';
    const stdout = typeof error.stdout === 'string' ? error.stdout : '';
    return {
      matches: stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      inaccessible: stderr.includes('Permission denied'),
    };
  }
}

async function buildScanItem(targetPath, appName, terms, reasonOverride) {
  const stats = await statSafe(targetPath);
  if (!stats) {
    return null;
  }

  return {
    id: targetPath,
    label: path.basename(targetPath),
    path: targetPath,
    category: getCategoryFromPath(targetPath),
    confidence: confidenceForPath(targetPath, appName, terms),
    reason:
      reasonOverride ??
      (targetPath.endsWith('.app')
        ? 'Installed app bundle selected for complete uninstall.'
        : 'Path name matches the selected app or one of its known identifiers.'),
    appName,
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    isDirectory: stats.isDirectory(),
    selected: true,
  };
}

async function scanAppResidues(appItem) {
  const searchTerms = buildSearchTerms(appItem);
  const scannedRoots = [...APPLICATION_ROOTS, ...RESIDUE_ROOTS.map((entry) => entry.root)];
  const inaccessibleRoots = [];
  const itemMap = new Map();

  const appBundleItem = await buildScanItem(
    appItem.appPath,
    appItem.name,
    searchTerms,
    'Installed app bundle selected for complete uninstall.',
  );
  if (appBundleItem) {
    itemMap.set(appBundleItem.path, appBundleItem);
  }

  for (const entry of RESIDUE_ROOTS) {
    const result = await runFind(entry.root, searchTerms);
    if (result.inaccessible) {
      inaccessibleRoots.push(entry.root);
    }

    for (const match of result.matches) {
      const item = await buildScanItem(match, appItem.name, searchTerms);
      if (item) {
        itemMap.set(item.path, item);
      }
    }
  }

  return {
    mode: 'uninstall',
    title: appItem.name,
    subtitle: 'App bundle, logs, caches, preferences, hidden entries and related leftovers selected for complete uninstall.',
    app: appItem,
    items: [...itemMap.values()],
    scannedRoots,
    inaccessibleRoots,
  };
}

function guessOrphanAppName(targetPath) {
  const cleaned = basenameWithoutExtension(targetPath)
    .replace(/^\./, '')
    .replace(/com\.|org\.|net\.|io\./g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

  const generic = new Set([
    'app',
    'cache',
    'caches',
    'log',
    'logs',
    'container',
    'group',
    'state',
    'saved',
    'preferences',
    'plist',
    'helper',
    'support',
    'application',
  ]);

  const candidates = cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !generic.has(token.toLowerCase()));

  if (!candidates.length) {
    return null;
  }

  return toDisplayName(candidates.slice(0, 2).join(' '));
}

async function listShallowEntries(rootPath) {
  if (!(await pathExists(rootPath))) {
    return { paths: [], inaccessible: false };
  }

  try {
    const { stdout } = await execFileAsync('find', [rootPath, '-maxdepth', '2', '-mindepth', '1']);
    return {
      paths: stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      inaccessible: false,
    };
  } catch (error) {
    const stderr = typeof error.stderr === 'string' ? error.stderr : '';
    const stdout = typeof error.stdout === 'string' ? error.stdout : '';
    return {
      paths: stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      inaccessible: stderr.includes('Permission denied'),
    };
  }
}

async function scanOrphanResidues() {
  const installedApps = await listInstalledApps();
  const installedNames = new Set(installedApps.map((app) => normalizeName(app.name)));
  const items = [];
  const scannedRoots = RESIDUE_ROOTS.map((entry) => entry.root);
  const inaccessibleRoots = [];

  for (const entry of RESIDUE_ROOTS) {
    const result = await listShallowEntries(entry.root);
    if (result.inaccessible) {
      inaccessibleRoots.push(entry.root);
    }

    for (const targetPath of result.paths) {
      const guess = guessOrphanAppName(targetPath);
      if (guess && installedNames.has(normalizeName(guess))) {
        continue;
      }

      const stats = await statSafe(targetPath);
      if (!stats) {
        continue;
      }

      items.push({
        id: targetPath,
        label: path.basename(targetPath),
        path: targetPath,
        category: getCategoryFromPath(targetPath),
        confidence: guess ? 'medium' : 'low',
        reason: guess
          ? 'Candidate residue remains in a known app-support root even though the parent app is not installed.'
          : 'Entry looks app-specific but no parent app could be identified.',
        appName: guess,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        isDirectory: stats.isDirectory(),
        selected: false,
      });
    }
  }

  return {
    mode: 'residues',
    title: 'Residual Files',
    subtitle: 'Deep scan for leftovers from apps that are no longer installed.',
    app: null,
    items,
    scannedRoots,
    inaccessibleRoots,
  };
}

async function scanSystemJunk() {
  const items = [];
  const scannedRoots = SYSTEM_JUNK_ROOTS.map((entry) => entry.root);
  const inaccessibleRoots = [];

  for (const entry of SYSTEM_JUNK_ROOTS) {
    const result = await listShallowEntries(entry.root);
    if (result.inaccessible) {
      inaccessibleRoots.push(entry.root);
    }

    for (const targetPath of result.paths) {
      const stats = await statSafe(targetPath);
      if (!stats) {
        continue;
      }

      items.push({
        id: targetPath,
        label: path.basename(targetPath),
        path: targetPath,
        category: entry.category,
        confidence: 'medium',
        reason: 'Generic cache or log entry inside a system-junk category.',
        appName: null,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        isDirectory: stats.isDirectory(),
        selected: false,
      });
    }
  }

  return {
    mode: 'system',
    title: 'System Junk',
    subtitle: 'Generic caches and logs that are not tied to a single uninstall flow.',
    app: null,
    items,
    scannedRoots,
    inaccessibleRoots,
  };
}

function isSafeToRemove(targetPath) {
  return SAFE_REMOVE_ROOTS.some((rootPath) => targetPath === rootPath || targetPath.startsWith(`${rootPath}${path.sep}`));
}

async function removeItems(targetPaths) {
  const removedPaths = [];
  const failedPaths = [];

  for (const targetPath of targetPaths) {
    if (!isSafeToRemove(targetPath)) {
      failedPaths.push({ path: targetPath, message: 'Path is outside the safe removal roots.' });
      continue;
    }

    try {
      await fs.rm(targetPath, { recursive: true, force: true });
      removedPaths.push(targetPath);
    } catch (error) {
      failedPaths.push({
        path: targetPath,
        message: error instanceof Error ? error.message : 'Unknown removal error',
      });
    }
  }

  return { removedPaths, failedPaths };
}

module.exports = {
  listInstalledApps,
  removeItems,
  scanAppResidues,
  scanOrphanResidues,
  scanSystemJunk,
};
