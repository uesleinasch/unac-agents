import { existsSync, readdirSync, renameSync, rmSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { COPILOT_DIR } from './copy.js';

const MAX_BACKUPS = 3;

function listBackups() {
  const home = homedir();
  return readdirSync(home)
    .filter((f) => f.startsWith('.copilot-backup-'))
    .map((f) => resolve(home, f))
    .sort();
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
 * Only used for the VS Code target — the installer owns that directory.
 *
 * Claude Code installs are surgical overlays into ~/.claude or <repo>/.claude,
 * which contain user data (sessions, settings, third-party agents) that must
 * not be moved or deleted. No backup is performed for that target.
 *
 * @returns {string | null} backup path if a backup was created
 */
export function backupVscodeIfNeeded() {
  if (!existsSync(COPILOT_DIR)) return null;

  const entries = readdirSync(COPILOT_DIR);
  if (entries.length === 0) return null;

  pruneOldBackups();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(homedir(), `.copilot-backup-${timestamp}`);
  renameSync(COPILOT_DIR, backupPath);
  return backupPath;
}

export { COPILOT_DIR };
