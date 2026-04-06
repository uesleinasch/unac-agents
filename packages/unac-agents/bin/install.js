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
