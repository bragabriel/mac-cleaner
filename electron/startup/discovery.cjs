const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { buildStartupErrorItem, readStartupPlist } = require('./plist.cjs');
const { enrichWithLaunchctlState, readLaunchctlStateMaps } = require('./launchctl.cjs');

const STARTUP_CATEGORY_CONFIG = [
  {
    id: 'login-items',
    title: 'Login Items',
    subtitle: 'Apps that request launch when the user session starts.',
  },
  {
    id: 'launch-agents-user',
    title: 'Launch Agents (User)',
    subtitle: 'Per-user launchd jobs loaded from the user Library.',
  },
  {
    id: 'launch-agents-system',
    title: 'Launch Agents (System)',
    subtitle: 'System-wide agents that still run in a user GUI session.',
  },
  {
    id: 'launch-daemons',
    title: 'Launch Daemons',
    subtitle: 'System launchd jobs that start outside the user session.',
  },
  {
    id: 'services',
    title: 'Brew Services',
    subtitle: 'Homebrew-managed background services.',
  },
];

const PLIST_SOURCES = [
  {
    category: 'launch-agents-user',
    directory: path.join(os.homedir(), 'Library', 'LaunchAgents'),
    domain: `gui/${typeof process.getuid === 'function' ? process.getuid() : 501}`,
    scope: 'user',
    requiresAdmin: false,
  },
  {
    category: 'launch-agents-system',
    directory: '/Library/LaunchAgents',
    domain: 'system',
    scope: 'system',
    requiresAdmin: true,
  },
  {
    category: 'launch-daemons',
    directory: '/Library/LaunchDaemons',
    domain: 'system',
    scope: 'system',
    requiresAdmin: true,
  },
];

async function readPlistDirectory(source) {
  try {
    const entries = await fs.readdir(source.directory, { withFileTypes: true });
    const plistFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.plist'))
      .map((entry) => path.join(source.directory, entry.name))
      .sort((left, right) => left.localeCompare(right));

    const items = await Promise.all(
      plistFiles.map(async (plistPath) => {
        try {
          return await readStartupPlist({ ...source, plistPath });
        } catch (error) {
          return buildStartupErrorItem({ ...source, plistPath, error });
        }
      }),
    );

    return {
      items,
      error: null,
    };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : `Unable to read ${source.directory}.`,
    };
  }
}

function buildCategorySummary(id, items, directoryError) {
  const config = STARTUP_CATEGORY_CONFIG.find((entry) => entry.id === id);

  if (id === 'login-items') {
    return {
      ...config,
      state: 'permission-needed',
      detail: 'Review Login Items in System Settings because macOS does not expose a reliable third-party inventory here.',
      count: 0,
    };
  }

  if (id === 'services') {
    return {
      ...config,
      state: 'unsupported',
      detail: 'Homebrew services will be connected into Startup in a later milestone.',
      count: 0,
    };
  }

  if (directoryError) {
    return {
      ...config,
      state: 'error',
      detail: directoryError,
      count: 0,
    };
  }

  if (!items.length) {
    return {
      ...config,
      state: 'empty',
      detail: `No ${config.title.toLowerCase()} were found in the current scan.`,
      count: 0,
    };
  }

  const invalidCount = items.filter((item) => item.errorMessage).length;

  return {
    ...config,
    state: 'available',
    detail: invalidCount
      ? `${items.length} items found. ${invalidCount} could only be loaded with file-level fallback metadata.`
      : `${items.length} items found in the current scan.`,
    count: items.length,
  };
}

async function getStartupSnapshot() {
  const launchctlState = await readLaunchctlStateMaps();
  const sourceResults = await Promise.all(PLIST_SOURCES.map((source) => readPlistDirectory(source)));

  const items = sourceResults.flatMap((result) => result.items).map((item) => enrichWithLaunchctlState(item, launchctlState));

  const categories = STARTUP_CATEGORY_CONFIG.map((category) => {
    const sourceIndex = PLIST_SOURCES.findIndex((source) => source.category === category.id);
    const sourceError = sourceIndex >= 0 ? sourceResults[sourceIndex].error : null;
    const categoryItems = items.filter((item) => item.category === category.id);

    return buildCategorySummary(category.id, categoryItems, sourceError);
  });

  const failingCategories = categories.filter((category) => category.state === 'error');

  return {
    checkedAt: new Date().toISOString(),
    categories,
    items,
    globalError:
      failingCategories.length === categories.filter((category) => category.id !== 'login-items' && category.id !== 'services').length
        ? 'Startup scan could not read any launchd directories on this machine.'
        : null,
  };
}

async function getStartupItemDetails(itemId) {
  const snapshot = await getStartupSnapshot();
  return snapshot.items.find((item) => item.id === itemId) ?? null;
}

module.exports = {
  getStartupItemDetails,
  getStartupSnapshot,
};
