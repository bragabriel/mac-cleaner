const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildFullDiskAccessStatus } = require('./checks.cjs');

describe('permission checks', () => {
  it('reports Full Disk Access as granted when a protected probe can be read', () => {
    const probePath = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-cleaner-fda-'));

    try {
      expect(buildFullDiskAccessStatus([probePath])).toMatchObject({
        target: 'privacy-full-disk-access',
        status: 'granted',
      });
    } finally {
      fs.rmSync(probePath, { recursive: true, force: true });
    }
  });
});
