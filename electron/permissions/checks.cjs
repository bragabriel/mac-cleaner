const { systemPreferences } = require('electron');

const KNOWN_TARGETS = new Set([
  'privacy',
  'privacy-full-disk-access',
  'privacy-accessibility',
  'privacy-automation',
  'login-items',
]);

function normalizeTarget(target) {
  if (!KNOWN_TARGETS.has(target)) {
    return 'privacy';
  }

  return target;
}

async function openSystemSettingsTarget(target) {
  if (typeof systemPreferences.openSystemSettings !== 'function') {
    return false;
  }

  const normalizedTarget = normalizeTarget(target);

  try {
    await systemPreferences.openSystemSettings(normalizedTarget);
    return true;
  } catch (error) {
    if (normalizedTarget === 'privacy' || normalizedTarget === 'login-items') {
      throw error;
    }

    await systemPreferences.openSystemSettings('privacy');
    return true;
  }
}

function buildAccessibilityStatus() {
  if (typeof systemPreferences.isTrustedAccessibilityClient !== 'function') {
    return {
      target: 'privacy-accessibility',
      status: 'unknown',
      detail: 'Accessibility status could not be checked from Electron on this macOS version.',
    };
  }

  const granted = systemPreferences.isTrustedAccessibilityClient(false);

  return {
    target: 'privacy-accessibility',
    status: granted ? 'granted' : 'not-granted',
    detail: granted
      ? 'Accessibility access is currently available to the app.'
      : 'Accessibility access is not granted yet. Some guided cleanup actions may require it.',
  };
}

function getPermissionSnapshot() {
  return {
    checkedAt: new Date().toISOString(),
    permissions: [
      {
        target: 'privacy-full-disk-access',
        status: 'unknown',
        detail: 'macOS does not expose a reliable Full Disk Access API for Electron. Verify this permission manually.',
      },
      buildAccessibilityStatus(),
      {
        target: 'privacy-automation',
        status: 'unknown',
        detail: 'Automation approval is managed per target app and is not exposed reliably to Electron.',
      },
      {
        target: 'login-items',
        status: 'unknown',
        detail: 'Background Items approval must be reviewed in System Settings because macOS does not expose a stable status API here.',
      },
    ],
  };
}

module.exports = {
  getPermissionSnapshot,
  openSystemSettingsTarget,
};
