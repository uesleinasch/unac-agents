#!/usr/bin/env node
import readline from 'readline';
import { printBanner, createSpinner, printBackup, printSuccess, printError, printDryRun, printAborted } from '../src/ui.js';
import { backupIfNeeded } from '../src/backup.js';
import { copyAssets, listAssets } from '../src/copy.js';

const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`❌ Requires Node.js >= 18. Current: v${process.versions.node}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const yes = args.includes('--yes') || args.includes('-y');
const dryRun = args.includes('--dry-run');

printBanner();

// Dry-run: list what would be installed and exit cleanly
if (dryRun) {
  const preview = listAssets();
  printDryRun(preview);
  process.exit(0);
}

// Non-interactive environment without --yes: refuse to proceed
if (!yes && !process.stdin.isTTY) {
  printError('Non-interactive environment detected. Re-run with --yes (-y) to skip confirmation.');
  process.exit(1);
}

// Interactive confirmation
if (!yes) {
  const confirmed = await askConfirmation('⚠️  This will overwrite ~/.copilot. Continue? [y/N] ');
  if (!confirmed) {
    printAborted();
    process.exit(0);
  }
}

// Phase 1: backup
const backupSpinner = createSpinner('Checking for existing installation...');
backupSpinner.start();
let backupPath;
try {
  backupPath = backupIfNeeded();
  backupSpinner.succeed('Backup check complete.');
} catch (err) {
  backupSpinner.fail('Backup failed.');
  printError(handleError(err));
  process.exit(1);
}

if (backupPath) printBackup(backupPath);

// Phase 2: copy assets
const copySpinner = createSpinner('Installing agents and skills to ~/.copilot...');
copySpinner.start();
let counts;
try {
  counts = copyAssets();
  copySpinner.succeed('Assets installed.');
} catch (err) {
  copySpinner.fail('Installation failed.');
  printError(handleError(err));
  process.exit(1);
}

printSuccess(counts);

// ─── helpers ────────────────────────────────────────────────────────────────

function handleError(err) {
  if (err.code === 'EACCES') return 'Permission denied writing to ~/.copilot. Try running with the correct permissions.';
  if (err.code === 'ENOSPC') return 'Not enough disk space to complete installation.';
  return err.message;
}

function askConfirmation(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}
