# Design: npx unac-agents

**Date:** 2026-04-06
**Status:** Approved

## Summary

Create an npm package `unac-agents` that lets users install all agents and skills from this repository into `~/.copilot` with a single `npx unac-agents` command. Re-running the command updates the installed files, automatically backing up any existing content.

---

## Architecture

The package lives in `packages/unac-agents/` within the existing repository.

### File Structure

```
unac-agents/
├── agents/                    # existing
├── skills/                    # existing
└── packages/
    └── unac-agents/
        ├── package.json       # name: "unac-agents", bin: "./bin/install.js"
        ├── bin/
        │   └── install.js     # CLI entry point (#!/usr/bin/env node)
        ├── src/
        │   ├── backup.js      # backup logic with ISO timestamp
        │   ├── copy.js        # copies agents/ and skills/ to ~/.copilot
        │   └── ui.js          # Chalk messages + Ora spinner
        └── assets/            # bundled copy of agents/ and skills/
            ├── agents/
            └── skills/
```

### Asset Bundling

A `prepare` script in `package.json` syncs `../../agents` and `../../skills` into `assets/` before publishing. This ensures the published package always contains the latest files from the repository.

---

## Behavior

### Execution Flow (`npx unac-agents`)

1. Node.js version check (>= 18) — exits with clear message if not met
2. Chalk prints welcome banner with package version
3. Ora spinner starts: "Installing agents and skills..."
4. If `~/.copilot` exists with files → move entire directory to `~/.copilot-backup-<ISO-timestamp>`
5. Copy `assets/agents/` → `~/.copilot/agents/`
6. Copy `assets/skills/` → `~/.copilot/skills/`
7. Spinner stops, Chalk prints summary

### Terminal Output (success)

```
╔══════════════════════════════════╗
║  unac-agents installer v1.0.0   ║
╚══════════════════════════════════╝

⚡ Installing 6 agents and 8 skills to ~/.copilot...

📦 Backup created: ~/.copilot-backup-2026-04-06T14-32-00
✅ Agents installed: 6
✅ Skills installed: 8

🎉 Done! Reload VS Code to use the new agents and skills.
```

### Backup Strategy

- Moves the entire `~/.copilot` directory to `~/.copilot-backup-<ISO-timestamp>`
- Keeps a maximum of 3 backups — oldest is deleted when a 4th would be created

### Error Handling

| Error | Behavior |
|-------|----------|
| Node.js < 18 | Exit with message: "Requires Node.js >= 18. Current: vX.X.X" |
| No write permission on `~/.copilot` | Exit with message suggesting `sudo` or manual permission fix |
| Disk full (`ENOSPC`) | Exit with message: "Not enough disk space to complete installation" |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `chalk` | ^5 | Terminal colors and banner |
| `ora` | ^8 | Spinner during installation |

Node.js minimum: **18**

---

## Publishing

### npm Publish Workflow

1. Update version in `packages/unac-agents/package.json`
2. Run `npm run release` from `packages/unac-agents/`:
   - Runs `prepare` → syncs `assets/` from repo
   - Runs `npm publish` → publishes to public npm registry

### `.npmignore`

Only these directories/files are included in the published package:
- `bin/`
- `src/`
- `assets/`
- `package.json`

### Update Flow for End Users

```bash
npx unac-agents@latest   # explicit latest version
# or
npx unac-agents          # uses latest if npx cache is cleared
```

Re-running automatically backs up existing `~/.copilot` before installing the new version.

**Note:** No CI/CD automation for publishing — releases are intentional and manual.

---

## Out of Scope

- Interactive selection of individual agents/skills
- Windows support (target: Ubuntu Linux)
- Generic framework for other repositories
