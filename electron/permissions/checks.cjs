const { dialog, shell, systemPreferences } = require('electron');

const KNOWN_TARGETS = new Set([
  'privacy',
  'privacy-full-disk-access',
  'privacy-accessibility',
  'privacy-automation',
  'login-items',
]);

const TARGET_TO_URL = {
  'privacy': 'x-apple.systempreferences:com.apple.preference.security?Privacy',
  'privacy-full-disk-access': 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
  'privacy-accessibility': 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  'privacy-automation': 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
  'login-items': 'x-apple.systempreferences:com.apple.LoginItems-Settings.extension',
};

const PERMISSION_LABELS = {
  'privacy': 'System Privacy',
  'privacy-full-disk-access': 'Full Disk Access',
  'privacy-accessibility': 'Accessibility',
  'privacy-automation': 'Automation',
  'login-items': 'Login Items',
};

function normalizeTarget(target) {
  if (!KNOWN_TARGETS.has(target)) {
    return 'privacy';
  }

  return target;
}

async function promptAccessibilityPermission() {
  if (typeof systemPreferences.isTrustedAccessibilityClient !== 'function') {
    return false;
  }

  const granted = systemPreferences.isTrustedAccessibilityClient(true);
  return granted;
}

async function promptFullDiskAccess() {
  const { response } = await dialog.showMessageBox({
    type: 'info',
    title: 'Full Disk Access Required',
    message: 'Mac Cleaner needs Full Disk Access to scan and clean protected system files.',
    detail: 'Click "Open Settings" to grant this permission in System Settings. You may need to add Mac Cleaner manually to the list.',
    buttons: ['Open Settings', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0) {
    await shell.openExternal(TARGET_TO_URL['privacy-full-disk-access']);
    return true;
  }

  return false;
}

async function promptLoginItems() {
  const { response } = await dialog.showMessageBox({
    type: 'info',
    title: 'Background Items',
    message: 'Review Background Items and Login Items in System Settings.',
    detail: 'Some apps reinstall launch helpers that can recreate residue after cleanup. Click "Open Settings" to review them.',
    buttons: ['Open Settings', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0) {
    await shell.openExternal(TARGET_TO_URL['login-items']);
    return true;
  }

  return false;
}

async function openSystemSettingsTarget(target) {
  const normalizedTarget = normalizeTarget(target);

  if (normalizedTarget === 'privacy-accessibility') {
    const granted = await promptAccessibilityPermission();
    if (granted) {
      return true;
    }
  }

  if (normalizedTarget === 'privacy-full-disk-access') {
    return promptFullDiskAccess();
  }

  if (normalizedTarget === 'login-items') {
    return promptLoginItems();
  }

  const url = TARGET_TO_URL[normalizedTarget] ?? TARGET_TO_URL['privacy'];
  await shell.openExternal(url);
  return true;
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
