# Contributing

Thanks for taking a look. This is a small personal project, so the process is intentionally light.

## Getting set up

You need Node.js 20+ and macOS (the app talks to macOS-specific paths).

```bash
git clone https://github.com/bragabriel/mac-cleaner.git
cd mac-cleaner
npm install
npm run dev:desktop
```

`npm run dev` runs only the frontend in a browser with mock data — handy for UI work, and it can't touch your filesystem.

## Before opening a PR

```bash
npm run lint   # tsc --noEmit
npm run test   # vitest
```

Both need to pass. CI runs the same two commands on every push and pull request.

## Ground rules for file operations

This app deletes things off people's machines, so the safety rules are not negotiable:

- Removal is only allowed from whitelisted paths (`/Applications`, `~/Applications`, and Library subdirectories). Don't widen that list without a very good reason.
- Deletions go to the Trash, never a permanent unlink.
- Nothing is removed without explicit user confirmation in the UI.

If a change touches `electron/service.cjs`, add or update a test in `electron/service.test.cjs`.

## Commit messages

Conventional-ish prefixes, matching the existing history:

```
feat(scan): add bottom progress bar during scans
fix(dmg): use custom background png
chore(navbar): increase width
docs: update README
```

## Reporting bugs

Open an issue with your macOS version, how you installed the app (DMG or from source), and what you expected versus what happened. If a scan produced a wrong result, the path it got wrong is the single most useful thing you can include.
