const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

function basenameWithoutExtension(targetPath) {
  return path.basename(targetPath, path.extname(targetPath));
}

function deriveExecutablePath(plistJson) {
  if (typeof plistJson.Program === 'string' && plistJson.Program.trim()) {
    return plistJson.Program;
  }

  if (Array.isArray(plistJson.ProgramArguments)) {
    const firstArgument = plistJson.ProgramArguments.find(
      (value) => typeof value === 'string' && value.startsWith('/'),
    );
    return firstArgument ?? null;
  }

  return null;
}

function deriveDisplayName({ label, executablePath, plistPath }) {
  if (executablePath) {
    return basenameWithoutExtension(executablePath);
  }

  if (label) {
    const parts = label.split('.');
    return parts[parts.length - 1] || label;
  }

  return basenameWithoutExtension(plistPath);
}

function deriveDescription(category, label, executablePath) {
  switch (category) {
    case 'launch-agents-user':
      return `User Launch Agent ${label} starts inside the current user's GUI session.`;
    case 'launch-agents-system':
      return `System Launch Agent ${label} can attach helper work to GUI sessions across users.`;
    case 'launch-daemons':
      return `LaunchDaemon ${label} starts outside the user session and usually boots with the system.`;
    default:
      return executablePath
        ? `Startup entry backed by ${path.basename(executablePath)}.`
        : `Startup entry defined by ${label}.`;
  }
}

function normalizeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeKeepAlive(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value && typeof value === 'object') {
    return true;
  }

  return null;
}

function supportsToggle(category, requiresAdmin, errorMessage = null) {
  return category === 'launch-agents-user' && !requiresAdmin && !errorMessage;
}

async function readPlistJson(plistPath) {
  const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', plistPath], {
    maxBuffer: 1024 * 1024 * 4,
  });

  return JSON.parse(stdout);
}

async function readStartupPlist({
  category,
  domain,
  plistPath,
  scope,
  requiresAdmin,
}) {
  await fs.access(plistPath);

  const plistJson = await readPlistJson(plistPath);
  const label = typeof plistJson.Label === 'string' && plistJson.Label.trim()
    ? plistJson.Label
    : basenameWithoutExtension(plistPath);
  const executablePath = deriveExecutablePath(plistJson);
  const disabledInPlist = normalizeBoolean(plistJson.Disabled);

  return {
    id: `${category}:${plistPath}`,
    category,
    label,
    displayName: deriveDisplayName({ label, executablePath, plistPath }),
    description: deriveDescription(category, label, executablePath),
    plistPath,
    executablePath,
    program: typeof plistJson.Program === 'string' ? plistJson.Program : null,
    programArguments: Array.isArray(plistJson.ProgramArguments)
      ? plistJson.ProgramArguments.filter((value) => typeof value === 'string')
      : [],
    runAtLoad: normalizeBoolean(plistJson.RunAtLoad),
    keepAlive: normalizeKeepAlive(plistJson.KeepAlive),
    disabledInPlist,
    enabled: disabledInPlist === null ? null : !disabledInPlist,
    loaded: null,
    pid: null,
    lastExitStatus: null,
    scope,
    requiresAdmin,
    supportsToggle: supportsToggle(category, requiresAdmin),
    source: 'plist',
    domain,
    errorMessage: null,
  };
}

function buildStartupErrorItem({
  category,
  domain,
  plistPath,
  scope,
  requiresAdmin,
  error,
}) {
  const label = basenameWithoutExtension(plistPath);

  return {
    id: `${category}:${plistPath}`,
    category,
    label,
    displayName: label,
    description: 'This startup item could not be parsed cleanly, so only the file-level fallback metadata is available.',
    plistPath,
    executablePath: null,
    program: null,
    programArguments: [],
    runAtLoad: null,
    keepAlive: null,
    disabledInPlist: null,
    enabled: null,
    loaded: null,
    pid: null,
    lastExitStatus: null,
    scope,
    requiresAdmin,
    supportsToggle: supportsToggle(category, requiresAdmin, error instanceof Error ? error.message : 'Unable to parse plist.'),
    source: 'plist',
    domain,
    errorMessage: error instanceof Error ? error.message : 'Unable to parse plist.',
  };
}

module.exports = {
  buildStartupErrorItem,
  readStartupPlist,
};
