const { parseServiceRow } = require('./services.cjs');

describe('brew services', () => {
  it('marks non-root services as toggleable', () => {
    expect(parseServiceRow('postgresql@16 started gabriel ~/Library/LaunchAgents/homebrew.mxcl.postgresql@16.plist')).toMatchObject({
      label: 'postgresql@16',
      loaded: true,
      enabled: true,
      requiresAdmin: false,
      supportsToggle: true,
    });
  });

  it('keeps root services read-only', () => {
    expect(parseServiceRow('mysql started root /Library/LaunchDaemons/homebrew.mxcl.mysql.plist')).toMatchObject({
      label: 'mysql',
      scope: 'system',
      requiresAdmin: true,
      supportsToggle: false,
    });
  });
});
