# Mac Cleaner

Open source macOS utility that finds the digital junk your apps left behind — and lets you actually do something about it.

Built as an AI-assisted development experiment. Turns out I needed a Mac cleaner more than I needed sleep.

## What it does

You install an app, use it for two weeks, then forget it exists. Months later you find its icon in Launchpad and its config files silently hoarding disk space across seven Library folders. Mac Cleaner finds all of it.

### App Residue Scanner

Scan any installed app and see every file it scattered across your system:

- **Application Support** — config files, databases, state
- **Preferences** — `.plist` files haunting your system
- **Caches** — gigabytes of stuff you forgot existed
- **Containers & Group Containers** — sandboxed app leftovers
- **Logs** — debug output from that one time you ran the app once
- **Saved Application State** — window positions for windows that no longer exist

Each file gets a confidence score (high/medium/low) so you know what's definitely safe to nuke and what might need a second look.

### Orphaned Residue Cleanup

Even after you delete an app, its files stick around like a bad houseguest. This mode scans your Library directories for leftovers from apps that are no longer installed — so you can clean up what uninstalling forgot.

### System Junk Cleanup

Cache folders. Log directories. Saved state from apps you opened once in 2019. This mode lists everything in your system junk directories so you can pick and choose what to delete.

### Homebrew Package Management

- List installed formulae
- See which packages are outdated (with current vs. latest version)
- Upgrade individual packages without leaving the app

### Safe Removal

Nothing gets deleted without your say-so. Mac Cleaner only allows removal from whitelisted paths (`/Applications`, `~/Applications`, and Library subdirectories), and every deletion requires confirmation.

## How to run

You need Node.js and npm installed. That's it.

```bash
# Install dependencies
npm install

# Run the real desktop app (Electron + filesystem access)
npm run dev:desktop

# Run just the frontend in a browser (mock data, no system access)
npm run dev
```

**Use `dev:desktop`** for the actual experience — app scanning, residue detection, real file operations.

**Use `dev`** if you just want to tinker with the UI in a browser. It uses mock data and won't touch your system.

### Other commands

| Command | What it does |
|---|---|
| `npm run start:desktop` | Launch Electron without the dev server |
| `npm run dist:mac` | Build a `.dmg` for distribution |
| `npm run lint` | Type-check the codebase |
| `npm run test` | Run unit tests |
| `npm run test:smoke` | End-to-end test against the real filesystem |

## Tech stack

- React 19 + TypeScript + Vite 6
- Electron 37 (desktop)
- Tailwind CSS v4
- Vitest for testing

## Contributing

Got an idea? Found a bug? Just want to prove you can write better code than an AI? Pull requests are open.

Be creative, have fun, and don't break anything important.

---

**If this saved you from manually digging through ~/Library, drop a ⭐ — it tells me someone actually uses this thing.**
