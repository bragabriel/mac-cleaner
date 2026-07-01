const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

async function safeExecLaunchctl(args) {
  try {
    const { stdout } = await execFileAsync('launchctl', args, {
      maxBuffer: 1024 * 1024 * 4,
    });

    return { ok: true, stdout };
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error?.stdout === 'string' ? error.stdout : '',
      error,
    };
  }
}

function parseLaunchctlList(stdout) {
  const result = new Map();

  for (const line of stdout.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    const match = trimmedLine.match(/^(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) {
      continue;
    }

    const [, pidValue, statusValue, label] = match;
    if (label === 'Label') {
      continue;
    }

    result.set(label, {
      loaded: true,
      pid: pidValue === '-' ? null : Number(pidValue),
      lastExitStatus: statusValue === '-' ? null : Number(statusValue),
    });
  }

  return result;
}

function parsePrintDisabled(stdout) {
  const result = new Map();

  for (const line of stdout.split('\n')) {
    const match = line.match(/"([^"]+)"\s*=>\s*(true|false)/);
    if (!match) {
      continue;
    }

    result.set(match[1], match[2] === 'true');
  }

  return result;
}

async function readLaunchctlStateMaps() {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 501;
  const [listResult, guiDisabledResult, systemDisabledResult] = await Promise.all([
    safeExecLaunchctl(['list']),
    safeExecLaunchctl(['print-disabled', `gui/${uid}`]),
    safeExecLaunchctl(['print-disabled', 'system']),
  ]);

  return {
    loadedByLabel: listResult.ok ? parseLaunchctlList(listResult.stdout) : new Map(),
    guiDisabledByLabel: guiDisabledResult.ok ? parsePrintDisabled(guiDisabledResult.stdout) : new Map(),
    systemDisabledByLabel: systemDisabledResult.ok ? parsePrintDisabled(systemDisabledResult.stdout) : new Map(),
  };
}

function enrichWithLaunchctlState(item, launchctlState) {
  const loadedState = launchctlState.loadedByLabel.get(item.label);
  const disabledMap = item.scope === 'user' ? launchctlState.guiDisabledByLabel : launchctlState.systemDisabledByLabel;
  const disabledOverride = disabledMap.get(item.label);

  return {
    ...item,
    loaded: loadedState?.loaded ?? item.loaded,
    pid: loadedState?.pid ?? item.pid,
    lastExitStatus: loadedState?.lastExitStatus ?? item.lastExitStatus,
    enabled:
      typeof disabledOverride === 'boolean'
        ? !disabledOverride
        : item.enabled,
  };
}

module.exports = {
  enrichWithLaunchctlState,
  readLaunchctlStateMaps,
};
