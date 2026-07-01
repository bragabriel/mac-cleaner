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
    supportsToggle: false,
    source: 'service',
    domain: null,
    errorMessage: null,
  };
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

module.exports = {
  listBrewServices,
};
