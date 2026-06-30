import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { listInstalledApps, moveResiduesToTrash, scanAppResidues } = require('../electron/service.cjs');

const smokeName = `MacCleanerSmokeApp-${Date.now()}`;
const smokeRoot = path.join(os.homedir(), 'Library', 'Caches', smokeName);
const smokeFile = path.join(smokeRoot, 'cache.db');
const trashRoot = path.join(os.homedir(), '.Trash');

async function cleanupTrashCopies() {
  try {
    const entries = await fs.readdir(trashRoot);
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(smokeName))
        .map((entry) => fs.rm(path.join(trashRoot, entry), { recursive: true, force: true })),
    );
  } catch {
    // ponytail: best-effort cleanup for the smoke artifact.
  }
}

await cleanupTrashCopies();
await fs.rm(smokeRoot, { recursive: true, force: true });
await fs.mkdir(smokeRoot, { recursive: true });
await fs.writeFile(smokeFile, 'smoke');

const apps = await listInstalledApps();
assert(Array.isArray(apps), 'inventory should return an array');

const summary = await scanAppResidues({
  id: smokeName,
  name: smokeName,
  bundleId: 'com.maccleaner.smoke',
  appPath: `/Applications/${smokeName}.app`,
  sizeBytes: 0,
  modifiedAt: new Date().toISOString(),
  source: 'mock',
});

assert(summary.residues.some((item) => item.path === smokeRoot), 'scan should find the synthetic cache directory');

const removal = await moveResiduesToTrash([smokeRoot]);
assert.equal(removal.removedPaths.length, 1, 'removal should move the synthetic residue');
assert.equal(removal.failedPaths.length, 0, 'removal should not fail for the synthetic residue');

await cleanupTrashCopies();

console.log(
  JSON.stringify({
    appsFound: apps.length,
    residuesFound: summary.residues.length,
    removedPaths: removal.removedPaths.length,
  }),
);
