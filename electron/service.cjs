const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const APPLICATION_ROOTS = ['/Applications', path.join(os.homedir(), 'Applications')];
const RESIDUE_ROOTS = [
  path.join(os.homedir(), 'Library', 'Application Support'),
  path.join(os.homedir(), 'Library', 'Preferences'),
  path.join(os.homedir(), 'Library', 'Caches'),
  path.join(os.homedir(), 'Library', 'Containers'),
  path.join(os.homedir(), 'Library', 'Group Containers'),
  path.join(os.homedir(), 'Library', 'Logs'),
  path.join(os.homedir(), 'Library', 'Saved Application State'),
];

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

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function buildSearchTerms(appItem) {
  const terms = new Set();
  const baseName = normalizeAppName(appItem.appPath || `${appItem.name}.app`);
  const normalizedName = (appItem.name || baseName).trim();

  if (normalizedName) {
    terms.add(normalizedName);
    terms.add(normalizedName.replace(/\s+/g, ''));
    terms.add(normalizedName.replace(/\s+/g, '-'));
  }

  if (baseName) {
    terms.add(baseName);
  }

  if (appItem.bundleId) {
    terms.add(appItem.bundleId);
    const bundleTail = appItem.bundleId.split('.').pop();
    if (bundleTail) {
      terms.add(bundleTail);
    }
  }

  return [...terms].filter((term) => term.length >= 3);
}

function categoryForPath(targetPath) {
  const table = [
    ['Application Support', 'Application Support'],
    ['Preferences', 'Preferences'],
    ['Caches', 'Caches'],
    ['Containers', 'Containers'],
    ['Group Containers', 'Group Containers'],
    ['Logs', 'Logs'],
    ['Saved Application State', 'Saved Application State'],
  ];

  const match = table.find(([segment]) => targetPath.includes(segment));
  return match?.[1] ?? 'Other';
}

async function findMatches(rootPath, searchTerms) {
  if (!(await pathExists(rootPath))) {
    return { matches: [], warnings: [] };
  }

  const args = [
    rootPath,
    '(',
    ...searchTerms.flatMap((term, index) => (index === 0 ? ['-iname', `*${term}*`] : ['-o', '-iname', `*${term}*`])),
    ')',
  ];

  try {
    const { stdout, stderr } = await execFileAsync('find', args, { maxBuffer: 1024 * 1024 * 8 });
    const warnings = stderr
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return { matches: stdout.split('\n').map((line) => line.trim()).filter(Boolean), warnings };
  } catch (error) {
    const stdout = typeof error.stdout === 'string' ? error.stdout : '';
    const stderr = typeof error.stderr === 'string' ? error.stderr : '';
    const warnings = stderr
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return { matches: stdout.split('\n').map((line) => line.trim()).filter(Boolean), warnings };
  }
}

async function buildResidueItem(targetPath) {
  const stats = await fs.stat(targetPath);
  return {
    id: targetPath,
    path: targetPath,
    sizeBytes: await readSizeBytes(targetPath),
    category: categoryForPath(targetPath),
    kind: stats.isDirectory() ? 'directory' : 'file',
    selected: true,
  };
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

async function scanAppResidues(appItem) {
  const searchTerms = buildSearchTerms(appItem);
  const matchSet = new Set();
  const warnings = [];
  const inaccessibleRoots = [];
  const scannedRoots = [];

  for (const rootPath of RESIDUE_ROOTS) {
    scannedRoots.push(rootPath);
    const result = await findMatches(rootPath, searchTerms);

    for (const warning of result.warnings) {
      warnings.push(warning);
      if (warning.includes('Permission denied')) {
        inaccessibleRoots.push(rootPath);
      }
    }

    for (const match of result.matches) {
      matchSet.add(match);
    }
  }

  const residues = [];
  for (const match of [...matchSet]) {
    try {
      residues.push(await buildResidueItem(match));
    } catch {
      // Skip entries that disappeared during the scan.
    }
  }

  residues.sort((left, right) => right.sizeBytes - left.sizeBytes || left.path.localeCompare(right.path));

  return {
    app: appItem,
    residues,
    warnings,
    inaccessibleRoots: [...new Set(inaccessibleRoots)],
    scannedRoots,
  };
}

module.exports = {
  listInstalledApps,
  scanAppResidues,
};
