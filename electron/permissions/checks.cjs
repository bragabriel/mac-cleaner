const fs = require('fs');
const os = require('os');
const path = require('path');
const { dialog, shell, systemPreferences } = require('electron');

const KNOWN_TARGETS = new Set([
  'privacy',
  'privacy-full-disk-access',
  'privacy-accessibility',
  'login-items',
]);

const TARGET_TO_URL = {
  'privacy': 'x-apple.systempreferences:com.apple.preference.security?Privacy',
  'privacy-full-disk-access': 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
  'privacy-accessibility': 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  'login-items': 'x-apple.systempreferences:com.apple.LoginItems-Settings.extension',
};

const PERMISSION_LABELS = {
  'privacy': 'System Privacy',
  'privacy-full-disk-access': 'Full Disk Access',
  'privacy-accessibility': 'Accessibility',
  'login-items': 'Login Items',
};

const FULL_DISK_ACCESS_PROBES = [
  ['Library', 'Mail'],
  ['Library', 'Messages'],
  ['Library', 'Safari'],
];

function normalizeTarget(target) {
  if (!KNOWN_TARGETS.has(target)) {
    return 'privacy';
  }

  return target;
}

async function promptAccessibilityPermission() {
  if (typeof systemPreferences?.isTrustedAccessibilityClient !== 'function') {
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
    detail: 'Click "Open Settings" to grant this permission in System Settings.',
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
  if (typeof systemPreferences?.isTrustedAccessibilityClient !== 'function') {
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

function buildFullDiskAccessStatus(probePaths = FULL_DISK_ACCESS_PROBES.map((segments) => path.join(os.homedir(), ...segments))) {
  let sawProbe = false;

  for (const probePath of probePaths) {
    try {
      fs.readdirSync(probePath);
      return {
        target: 'privacy-full-disk-access',
        status: 'granted',
        detail: 'Full Disk Access is currently available to the app.',
      };
    } catch (error) {
      if (error && (error.code === 'EACCES' || error.code === 'EPERM')) {
        return {
          target: 'privacy-full-disk-access',
          status: 'not-granted',
          detail: 'Full Disk Access is not granted yet. If you just granted it to Electron in dev, restart npm run dev:desktop and check again.',
        };
      }

      if (error && error.code !== 'ENOENT') {
        sawProbe = true;
      }
    }
  }

  return {
    target: 'privacy-full-disk-access',
    status: 'unknown',
    detail: sawProbe
      ? 'Full Disk Access could not be confirmed from the protected folder check.'
      : 'No protected Library folders were available for a live Full Disk Access check. Verify this permission manually.',
  };
}

function getPermissionSnapshot() {
  return {
    checkedAt: new Date().toISOString(),
    permissions: [
      buildFullDiskAccessStatus(),
      buildAccessibilityStatus(),
      {
        target: 'login-items',
        status: 'needs-manual-review',
        detail: 'Background Items approval must be reviewed in System Settings because macOS does not expose a stable granted/not granted status here.',
      },
    ],
  };
}

module.exports = {
  buildFullDiskAccessStatus,
  getPermissionSnapshot,
  openSystemSettingsTarget,
};
