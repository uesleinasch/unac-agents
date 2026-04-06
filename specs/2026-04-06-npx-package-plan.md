# npx unac-agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and publish an npm package `unac-agents` that installs all agents and skills from this repo into `~/.copilot` via `npx unac-agents`.

**Architecture:** A Node.js ESM CLI package lives in `packages/unac-agents/`. A `prepare` script syncs `agents/` and `skills/` into `packages/unac-agents/assets/` before publishing. The CLI entry point orchestrates backup → copy → summary using `chalk` for colors and `ora` for the spinner.

**Tech Stack:** Node.js >= 18, ESM (`"type": "module"`), chalk ^5, ora ^8, npm public registry.

---

## File Map

| File | Responsibility |
|------|---------------|
| `packages/unac-agents/package.json` | Package metadata, bin entry, scripts, deps |
| `packages/unac-agents/.npmignore` | Exclude dev files from published package |
| `packages/unac-agents/scripts/sync-assets.js` | `prepare` script — copies repo agents/skills into assets/ |
| `packages/unac-agents/src/ui.js` | Banner, spinner, success/error messages via chalk + ora |
| `packages/unac-agents/src/backup.js` | Move ~/.copilot to timestamped backup, prune old backups |
| `packages/unac-agents/src/copy.js` | Recursively copy assets/agents and assets/skills to ~/.copilot |
| `packages/unac-agents/bin/install.js` | CLI entry point — orchestrates the full install flow |

---

## Task 1: Scaffold package structure and package.json

**Files:**
- Create: `packages/unac-agents/package.json`

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p packages/unac-agents/bin packages/unac-agents/src packages/unac-agents/scripts packages/unac-agents/assets/agents packages/unac-agents/assets/skills
```

- [ ] **Step 2: Create package.json**

Create `packages/unac-agents/package.json`:

```json
{
  "name": "unac-agents",
  "version": "1.0.0",
  "description": "Install unac agents and skills into ~/.copilot for GitHub Copilot in VS Code",
  "type": "module",
  "bin": {
    "unac-agents": "./bin/install.js"
  },
  "scripts": {
    "prepare": "node scripts/sync-assets.js",
    "release": "npm run prepare && npm publish"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "ora": "^8.0.1"
  },
  "engines": {
    "node": ">=18"
  },
  "keywords": ["copilot", "agents", "skills", "vscode", "unac"],
  "license": "MIT"
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd packages/unac-agents && npm install
```

Expected: `node_modules/` created with chalk and ora.

- [ ] **Step 4: Commit**

```bash
git add packages/unac-agents/package.json packages/unac-agents/package-lock.json
git commit -m "feat: scaffold unac-agents npm package"
```

---

## Task 2: Create sync-assets script (prepare)

**Files:**
- Create: `packages/unac-agents/scripts/sync-assets.js`

- [ ] **Step 1: Create the script**

Create `packages/unac-agents/scripts/sync-assets.js`:

```js
#!/usr/bin/env node
import { cpSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const repoRoot = resolve(pkgRoot, '../..');

const sources = [
  { src: resolve(repoRoot, 'agents'), dest: resolve(pkgRoot, 'assets/agents') },
  { src: resolve(repoRoot, 'skills'), dest: resolve(pkgRoot, 'assets/skills') },
];

for (const { src, dest } of sources) {
  if (!existsSync(src)) {
    console.error(`Source not found: ${src}`);
    process.exit(1);
  }
  if (existsSync(dest)) rmSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Synced: ${src} → ${dest}`);
}
```

- [ ] **Step 2: Run the script to verify it works**

```bash
cd packages/unac-agents && node scripts/sync-assets.js
```

Expected output:
```
Synced: .../unac-agents/agents → .../packages/unac-agents/assets/agents
Synced: .../unac-agents/skills → .../packages/unac-agents/assets/skills
```

- [ ] **Step 3: Verify assets were copied**

```bash
ls packages/unac-agents/assets/agents && ls packages/unac-agents/assets/skills
```

Expected: agent `.md` files and skill directories are present.

- [ ] **Step 4: Commit**

```bash
git add packages/unac-agents/scripts/sync-assets.js packages/unac-agents/assets/
git commit -m "feat: add sync-assets prepare script and bundled assets"
```

---

## Task 3: Create ui.js (chalk + ora)

**Files:**
- Create: `packages/unac-agents/src/ui.js`

- [ ] **Step 1: Create ui.js**

Create `packages/unac-agents/src/ui.js`:

```js
import chalk from 'chalk';
import ora from 'ora';

const VERSION = process.env.npm_package_version ?? '1.0.0';

export function printBanner() {
  const line = '═'.repeat(36);
  console.log(chalk.cyan(`╔${line}╗`));
  console.log(chalk.cyan('║') + chalk.bold(`  unac-agents installer v${VERSION}  `) + chalk.cyan('║'));
  console.log(chalk.cyan(`╚${line}╝`));
  console.log();
}

export function createSpinner(text) {
  return ora({ text: chalk.yellow(text), color: 'yellow' });
}

export function printBackup(backupPath) {
  console.log(chalk.blue(`📦 Backup created: ${backupPath}`));
}

export function printSuccess({ agents, skills }) {
  console.log(chalk.green(`✅ Agents installed: ${agents}`));
  console.log(chalk.green(`✅ Skills installed: ${skills}`));
  console.log();
  console.log(chalk.bold.green('🎉 Done! Reload VS Code to use the new agents and skills.'));
}

export function printError(message) {
  console.error(chalk.red(`\n❌ ${message}`));
}
```

- [ ] **Step 2: Verify the module parses without errors**

```bash
cd packages/unac-agents && node --input-type=module <<< "import './src/ui.js'; console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add packages/unac-agents/src/ui.js
git commit -m "feat: add ui.js with chalk and ora"
```

---

## Task 4: Create backup.js

**Files:**
- Create: `packages/unac-agents/src/backup.js`

- [ ] **Step 1: Create backup.js**

Create `packages/unac-agents/src/backup.js`:

```js
import { existsSync, readdirSync, renameSync, rmSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const COPILOT_DIR = resolve(homedir(), '.copilot');
const MAX_BACKUPS = 3;

function getBackupBase() {
  return resolve(homedir(), '.copilot-backup-');
}

function listBackups() {
  const home = homedir();
  return readdirSync(home)
    .filter(f => f.startsWith('.copilot-backup-'))
    .map(f => resolve(home, f))
    .sort(); // ISO timestamps sort lexicographically
}

function pruneOldBackups() {
  const backups = listBackups();
  while (backups.length >= MAX_BACKUPS) {
    const oldest = backups.shift();
    rmSync(oldest, { recursive: true });
  }
}

/**
 * If ~/.copilot exists and has contents, move it to a timestamped backup.
 * Returns the backup path if a backup was created, or null.
 */
export function backupIfNeeded() {
  if (!existsSync(COPILOT_DIR)) return null;

  const entries = readdirSync(COPILOT_DIR);
  if (entries.length === 0) return null;

  pruneOldBackups();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${getBackupBase()}${timestamp}`;
  renameSync(COPILOT_DIR, backupPath);
  return backupPath;
}

export { COPILOT_DIR };
```

- [ ] **Step 2: Verify the module parses**

```bash
cd packages/unac-agents && node --input-type=module <<< "import './src/backup.js'; console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add packages/unac-agents/src/backup.js
git commit -m "feat: add backup.js with timestamped backup and pruning"
```

---

## Task 5: Create copy.js

**Files:**
- Create: `packages/unac-agents/src/copy.js`

- [ ] **Step 1: Create copy.js**

Create `packages/unac-agents/src/copy.js`:

```js
import { cpSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { COPILOT_DIR } from './backup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '../assets');

function countEntries(dir) {
  return readdirSync(dir, { withFileTypes: true }).length;
}

/**
 * Copies assets/agents and assets/skills into ~/.copilot.
 * Returns { agents, skills } counts.
 */
export function copyAssets() {
  const agentsSrc = resolve(ASSETS_DIR, 'agents');
  const skillsSrc = resolve(ASSETS_DIR, 'skills');
  const agentsDest = resolve(COPILOT_DIR, 'agents');
  const skillsDest = resolve(COPILOT_DIR, 'skills');

  cpSync(agentsSrc, agentsDest, { recursive: true });
  cpSync(skillsSrc, skillsDest, { recursive: true });

  return {
    agents: countEntries(agentsSrc),
    skills: countEntries(skillsSrc),
  };
}
```

- [ ] **Step 2: Verify the module parses**

```bash
cd packages/unac-agents && node --input-type=module <<< "import './src/copy.js'; console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add packages/unac-agents/src/copy.js
git commit -m "feat: add copy.js for installing assets to ~/.copilot"
```

---

## Task 6: Create bin/install.js (CLI entry point)

**Files:**
- Create: `packages/unac-agents/bin/install.js`

- [ ] **Step 1: Create install.js**

Create `packages/unac-agents/bin/install.js`:

```js
#!/usr/bin/env node
// ESM imports are hoisted — version check runs after imports are resolved,
// but before any application logic executes.
import { printBanner, createSpinner, printBackup, printSuccess, printError } from '../src/ui.js';
import { backupIfNeeded } from '../src/backup.js';
import { copyAssets } from '../src/copy.js';

const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`❌ Requires Node.js >= 18. Current: v${process.versions.node}`);
  process.exit(1);
}

printBanner();

const spinner = createSpinner('Installing agents and skills to ~/.copilot...');
spinner.start();

try {
  const backupPath = backupIfNeeded();
  spinner.stop();

  if (backupPath) printBackup(backupPath);

  const counts = copyAssets();
  printSuccess(counts);
} catch (err) {
  spinner.stop();
  if (err.code === 'EACCES') {
    printError('Permission denied writing to ~/.copilot. Try running with the correct permissions.');
  } else if (err.code === 'ENOSPC') {
    printError('Not enough disk space to complete installation.');
  } else {
    printError(err.message);
  }
  process.exit(1);
}
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x packages/unac-agents/bin/install.js
```

- [ ] **Step 3: Run a local end-to-end test**

```bash
cd packages/unac-agents && node bin/install.js
```

Expected: banner prints, spinner runs, agents/skills are installed to `~/.copilot`, success summary shows counts.

- [ ] **Step 4: Verify files landed in ~/.copilot**

```bash
ls ~/.copilot/agents && ls ~/.copilot/skills
```

Expected: agent `.md` files and skill directories present.

- [ ] **Step 5: Run again to verify backup**

```bash
node bin/install.js
```

Expected: backup message with timestamp path printed, then new install.

- [ ] **Step 6: Verify backup exists**

```bash
ls ~ | grep copilot-backup
```

Expected: at least one `.copilot-backup-<timestamp>` directory.

- [ ] **Step 7: Commit**

```bash
git add packages/unac-agents/bin/install.js
git commit -m "feat: add CLI entry point bin/install.js"
```

---

## Task 7: Create .npmignore and publish

**Files:**
- Create: `packages/unac-agents/.npmignore`

- [ ] **Step 1: Create .npmignore**

Create `packages/unac-agents/.npmignore`:

```
scripts/
node_modules/
*.log
```

- [ ] **Step 2: Dry-run publish to verify package contents**

```bash
cd packages/unac-agents && npm pack --dry-run
```

Expected: output lists only `bin/install.js`, `src/*.js`, `assets/agents/`, `assets/skills/`, `package.json`. No `scripts/`, no `node_modules/`.

- [ ] **Step 3: Login to npm (if not already)**

```bash
npm whoami
```

If not logged in:
```bash
npm login
```

- [ ] **Step 4: Run release script**

```bash
cd packages/unac-agents && npm run release
```

Expected: prepare script syncs assets, then publishes to npm registry. Final output shows package URL.

- [ ] **Step 5: Verify the package is live**

```bash
npm info unac-agents
```

Expected: package metadata with version 1.0.0.

- [ ] **Step 6: Test via npx**

```bash
npx unac-agents@1.0.0
```

Expected: full install flow runs from the published package.

- [ ] **Step 7: Commit and tag**

```bash
git add packages/unac-agents/.npmignore
git commit -m "chore: add .npmignore for unac-agents package"
git tag v1.0.0
git push origin main --tags
```
