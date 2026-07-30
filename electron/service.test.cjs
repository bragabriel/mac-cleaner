const { dropNestedItems } = require('./service.cjs');

const item = (path, isDirectory = true) => ({ path, isDirectory, sizeBytes: 0 });

describe('dropNestedItems', () => {
  it('drops entries contained in another directory entry so sizes are not counted twice', () => {
    const items = [
      item('/Users/me/Library/Application Support/Claude'),
      item('/Users/me/Library/Application Support/Claude/claude-code'),
      item('/Users/me/Library/Application Support/Claude/claude-code/2.1.219/claude.app'),
      item('/Users/me/Library/Logs/Claude'),
    ];

    expect(dropNestedItems(items).map((entry) => entry.path)).toEqual([
      '/Users/me/Library/Application Support/Claude',
      '/Users/me/Library/Logs/Claude',
    ]);
  });

  it('keeps sibling paths that only share a name prefix', () => {
    const items = [item('/Applications/Claude.app'), item('/Applications/Claude.app.backup')];

    expect(dropNestedItems(items)).toHaveLength(2);
  });

  it('keeps entries nested under a file or symlink entry', () => {
    const items = [
      item('/Users/me/Library/Caches/Homebrew/Cask/claude-code--2.1.211', false),
      item('/Users/me/Library/Caches/Homebrew/Cask/claude-code--2.1.211/inner'),
    ];

    expect(dropNestedItems(items)).toHaveLength(2);
  });
});
