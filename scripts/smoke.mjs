import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  listInstalledApps,
  scanAppResidues,
  scanOrphanResidues,
  scanSystemJunk,
  removeItems,
} = require('../electron/service.cjs');

const smokeId = `mac-cleaner-smoke-${Date.now()}`;
const appRoot = path.join(os.homedir(), 'Applications');
const appBundlePath = path.join(appRoot, `${smokeId}.app`);
const orphanPreferencePath = path.join(os.homedir(), 'Library', 'Preferences', `${smokeId}.plist`);
const residueSupportPath = path.join(os.homedir(), 'Library', 'Application Support', smokeId);
const systemLogPath = path.join(os.homedir(), 'Library', 'Logs', `${smokeId}.log`);

async function ensureFixture() {
  await fs.mkdir(appBundlePath, { recursive: true });
  await fs.mkdir(residueSupportPath, { recursive: true });
  await fs.writeFile(path.join(appBundlePath, 'Contents.txt'), 'app', 'utf8');
  await fs.writeFile(path.join(residueSupportPath, 'cache.db'), 'residue', 'utf8');
  await fs.writeFile(orphanPreferencePath, 'orphan', 'utf8');
  await fs.writeFile(systemLogPath, 'log', 'utf8');
}

async function cleanupFixture() {
  await fs.rm(appBundlePath, { recursive: true, force: true });
  await fs.rm(residueSupportPath, { recursive: true, force: true });
  await fs.rm(orphanPreferencePath, { force: true });
  await fs.rm(systemLogPath, { force: true });
}

try {
  await ensureFixture();

  const apps = await listInstalledApps();
  const smokeApp = apps.find((app) => app.appPath === appBundlePath);
  assert.ok(smokeApp, 'Expected smoke app to be listed');

  const uninstallSummary = await scanAppResidues(smokeApp);
  assert.ok(uninstallSummary.items.some((item) => item.path === appBundlePath), 'Expected uninstall scan to include the app bundle');
  assert.ok(
    uninstallSummary.items.some((item) => item.path === residueSupportPath),
    'Expected uninstall scan to include the residue support path',
  );

  await fs.rm(appBundlePath, { recursive: true, force: true });

  const orphanSummary = await scanOrphanResidues();
  assert.ok(
    orphanSummary.items.some((item) => item.path === orphanPreferencePath),
    'Expected orphan scan to include the orphan preference file',
  );

  const systemSummary = await scanSystemJunk();
  assert.ok(systemSummary.items.some((item) => item.path === systemLogPath), 'Expected system scan to include the log file');

  const removalSummary = await removeItems([residueSupportPath, orphanPreferencePath, systemLogPath]);
  assert.equal(removalSummary.failedPaths.length, 0, 'Expected safe removal to succeed');

  console.log('Smoke test passed');
} finally {
  await cleanupFixture();
}
