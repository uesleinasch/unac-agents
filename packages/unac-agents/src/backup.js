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
