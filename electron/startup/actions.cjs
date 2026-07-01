const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { getStartupItemDetails } = require('./discovery.cjs');

const execFileAsync = promisify(execFile);

async function execLaunchctl(args, ignoredPatterns = []) {
  try {
    await execFileAsync('launchctl', args, {
      maxBuffer: 1024 * 1024 * 4,
    });
  } catch (error) {
    const message = [error?.stderr, error?.stdout, error?.message].filter(Boolean).join('\n');
    if (ignoredPatterns.some((pattern) => pattern.test(message))) {
      return;
    }

    throw new Error(message || `launchctl ${args.join(' ')} failed.`);
  }
}

function getUserDomain(item) {
  return item.domain || `gui/${typeof process.getuid === 'function' ? process.getuid() : 501}`;
}

function ensureUserToggleSupported(item, action) {
  if (!item) {
    throw new Error('Startup item was not found.');
  }

  if (!item.supportsToggle || item.scope !== 'user') {
    throw new Error(`The ${action} action is only supported for user Launch Agents at the moment.`);
  }

  if (!item.plistPath) {
    throw new Error('This startup item does not expose a plist path.');
  }
}

async function enableItem(item) {
  const domain = getUserDomain(item);
  await execLaunchctl(['enable', `${domain}/${item.label}`], [/Could not find service/i]);
  await execLaunchctl(['bootstrap', domain, item.plistPath], [/service already loaded/i, /already bootstrapped/i]);
  await execLaunchctl(['kickstart', '-k', `${domain}/${item.label}`], [/could not find service/i]);
}

async function disableItem(item) {
  const domain = getUserDomain(item);
  await execLaunchctl(['bootout', domain, item.plistPath], [/No such process/i, /could not find service/i]);
  await execLaunchctl(['disable', `${domain}/${item.label}`], [/Could not find service/i]);
}

async function reloadItem(item) {
  const domain = getUserDomain(item);
  await execLaunchctl(['kickstart', '-k', `${domain}/${item.label}`], [/could not find service/i]);

  const refreshedItem = await getStartupItemDetails(item.id);
  if (!refreshedItem?.loaded && item.plistPath) {
    await execLaunchctl(['bootstrap', domain, item.plistPath], [/service already loaded/i, /already bootstrapped/i]);
  }
}

async function runStartupAction(itemId, action) {
  const item = await getStartupItemDetails(itemId);
  ensureUserToggleSupported(item, action);

  if (action === 'enable') {
    await enableItem(item);
  } else if (action === 'disable') {
    await disableItem(item);
  } else if (action === 'reload') {
    await reloadItem(item);
  } else {
    throw new Error(`Unsupported startup action: ${action}`);
  }

  const nextItem = await getStartupItemDetails(itemId);

  return {
    action,
    ok: true,
    item: nextItem,
    message:
      action === 'reload'
        ? `Reloaded ${item.displayName}.`
        : `${action === 'enable' ? 'Enabled' : 'Disabled'} ${item.displayName}.`,
  };
}

module.exports = {
  runStartupAction,
};
