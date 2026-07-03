const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const BREW_CANDIDATES = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew', 'brew'];

async function safeExec(args) {
  for (const candidate of BREW_CANDIDATES) {
    try {
      const { stdout } = await execFileAsync(candidate, args, {
        maxBuffer: 1024 * 1024 * 4,
      });
      return { ok: true, stdout };
    } catch (error) {
      if (/ENOENT/.test(error?.message ?? '') && candidate !== BREW_CANDIDATES[BREW_CANDIDATES.length - 1]) {
        continue;
      }

      return {
        ok: false,
        stdout: typeof error?.stdout === 'string' ? error.stdout : '',
        stderr: typeof error?.stderr === 'string' ? error.stderr : '',
        error,
      };
    }
  }
}

function parseServiceRow(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine || /^Name\s+Status\s+User\s+File$/i.test(trimmedLine)) {
    return null;
  }

  const parts = trimmedLine.split(/\s+/);
  if (parts.length < 4) {
    return null;
  }

  const [name, status, user, ...fileParts] = parts;
  const file = fileParts.join(' ');

  return {
    id: `services:${name}`,
    category: 'services',
    label: name,
    displayName: name,
    description: `Homebrew service backed by the ${name} formula.`,
    plistPath: file && file !== 'none' ? file : null,
    executablePath: null,
    program: null,
    programArguments: [],
    runAtLoad: status === 'started' ? true : null,
    keepAlive: status === 'started' ? true : null,
    disabledInPlist: status === 'none' ? true : null,
    enabled: status === 'started' ? true : status === 'none' ? false : null,
    loaded: status === 'started',
    pid: null,
    lastExitStatus: null,
    scope: user === 'root' ? 'system' : user && user !== 'none' ? 'user' : 'unknown',
    requiresAdmin: user === 'root',
    supportsToggle: user !== 'root',
    source: 'service',
    domain: null,
    errorMessage: null,
  };
}

async function runBrewServiceAction(serviceName, action) {
  const brewAction = {
    enable: 'start',
    disable: 'stop',
    reload: 'restart',
  }[action];

  if (!brewAction) {
    throw new Error(`Unsupported brew service action: ${action}`);
  }

  const result = await safeExec(['services', brewAction, serviceName]);
  if (!result.ok) {
    throw new Error(result.stderr || result.error?.message || `brew services ${brewAction} ${serviceName} failed.`);
  }
}

async function listBrewServices() {
  const result = await safeExec(['services', 'list']);
  if (!result.ok) {
    if (/No such file or directory|not found/i.test(`${result.stderr}\n${result.error?.message ?? ''}`)) {
      return {
        installed: false,
        items: [],
        error: null,
      };
    }

    return {
      installed: true,
      items: [],
      error: result.stderr || result.error?.message || 'Unable to read brew services.',
    };
  }

  const items = result.stdout
    .split('\n')
    .map((line) => parseServiceRow(line))
    .filter(Boolean);

  return {
    installed: true,
    items,
    error: null,
  };
}

async function listInstalledPackages() {
  const result = await safeExec(['list', '--formula']);
  if (!result.ok) {
    return {ok: false, packages: [], message: result.stderr || result.error?.message || 'Failed to list installed packages.'};
  }

  const packages = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((name) => name.length > 0)
    .sort((a, b) => a.localeCompare(b));

  return {ok: true, packages, message: `${packages.length} packages installed.`};
}

async function listOutdatedPackages() {
  const result = await safeExec(['outdated', '--json']);
  if (!result.ok) {
    return {ok: false, packages: [], message: result.stderr || result.error?.message || 'Failed to check outdated packages.'};
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return {ok: false, packages: [], message: 'Failed to parse outdated list.'};
  }

  const packages = [];
  for (const [name, info] of Object.entries(parsed)) {
    packages.push({
      name,
      currentVersion: info.installed?.[0]?.version ?? 'unknown',
      latestVersion: info.current_version ?? 'unknown',
      pinned: info.pinned ?? false,
    });
  }

  packages.sort((a, b) => a.name.localeCompare(b.name));
  return {ok: true, packages, message: `${packages.length} packages outdated.`};
}

async function upgradePackage(name) {
  const result = await safeExec(['upgrade', name]);
  return {
    ok: result.ok,
    message: result.ok ? `${name} upgraded successfully.` : (result.stderr || result.error?.message || `Failed to upgrade ${name}.`),
  };
}

module.exports = {
  listBrewServices,
  listInstalledPackages,
  listOutdatedPackages,
  parseServiceRow,
  runBrewServiceAction,
  upgradePackage,
};
