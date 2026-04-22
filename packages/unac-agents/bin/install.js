#!/usr/bin/env node
import readline from 'readline';
import {
  printBanner,
  createSpinner,
  printBackup,
  printSuccess,
  printError,
  printDryRun,
  printAborted,
  printTarget,
  printDestination,
  printInfo,
} from '../src/ui.js';
import { backupVscodeIfNeeded, COPILOT_DIR } from '../src/backup.js';
import {
  copyVscodeAssets,
  copyClaudeCodeAssets,
  listAssets,
  resolveClaudeDir,
} from '../src/copy.js';
import { installMcp } from '../src/mcp.js';

const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`❌ Requires Node.js >= 18. Current: v${process.versions.node}`);
  process.exit(1);
}

// ─── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const yes = args.includes('--yes') || args.includes('-y');
const dryRun = args.includes('--dry-run');
const cliTarget = parseFlag(args, '--target'); // vscode | claude-code
const cliScope = parseFlag(args, '--scope'); // global | local

printBanner();

// ─── Resolve target & scope ────────────────────────────────────────────────
let target = cliTarget;
if (!target) {
  if (!process.stdin.isTTY) {
    printError('Non-interactive environment: pass --target=vscode or --target=claude-code.');
    process.exit(1);
  }
  target = await askChoice('Onde deseja instalar?', [
    { key: '1', value: 'vscode', label: 'VS Code (GitHub Copilot)' },
    { key: '2', value: 'claude-code', label: 'Claude Code' },
  ]);
}

if (!['vscode', 'claude-code'].includes(target)) {
  printError(`Invalid --target: ${target}. Use 'vscode' or 'claude-code'.`);
  process.exit(1);
}

let scope = null;
if (target === 'claude-code') {
  scope = cliScope;
  if (!scope) {
    if (!process.stdin.isTTY) {
      printError('Non-interactive environment: pass --scope=global or --scope=local.');
      process.exit(1);
    }
    scope = await askChoice('Escopo da instalação?', [
      { key: '1', value: 'global', label: `Global (~/.claude/)` },
      { key: '2', value: 'local', label: `Local (repositório atual: ${process.cwd()}/.claude/)` },
    ]);
  }
  if (!['global', 'local'].includes(scope)) {
    printError(`Invalid --scope: ${scope}. Use 'global' or 'local'.`);
    process.exit(1);
  }
}

// ─── Resolve destination ────────────────────────────────────────────────────
const destination = target === 'vscode' ? COPILOT_DIR : resolveClaudeDir(scope);
printTarget(target, scope);
printDestination(destination);

// ─── Dry-run early-exit ─────────────────────────────────────────────────────
if (dryRun) {
  const preview = listAssets(target);
  printDryRun({ target, ...preview, destination });
  process.exit(0);
}

// ─── Confirmation ───────────────────────────────────────────────────────────
if (!yes && !process.stdin.isTTY) {
  printError('Non-interactive environment detected. Re-run with --yes (-y) to skip confirmation.');
  process.exit(1);
}

if (!yes) {
  const warning =
    target === 'vscode'
      ? `⚠️  This will overwrite ${COPILOT_DIR}. Continue? [y/N] `
      : `⚠️  This will write unac agents/skills into ${destination} (existing files with the same name will be overwritten; other files are preserved). Continue? [y/N] `;
  const confirmed = await askConfirmation(warning);
  if (!confirmed) {
    printAborted();
    process.exit(0);
  }
}

// ─── Backup (VS Code only) ──────────────────────────────────────────────────
if (target === 'vscode') {
  const backupSpinner = createSpinner('Checking for existing installation...');
  backupSpinner.start();
  try {
    const backupPath = backupVscodeIfNeeded();
    backupSpinner.succeed('Backup check complete.');
    if (backupPath) printBackup(backupPath);
  } catch (err) {
    backupSpinner.fail('Backup failed.');
    printError(handleError(err));
    process.exit(1);
  }
}

// ─── Copy assets ────────────────────────────────────────────────────────────
const copySpinner = createSpinner(
  target === 'vscode'
    ? 'Installing agents and skills to ~/.copilot...'
    : `Installing agents and skills to ${destination}...`,
);
copySpinner.start();
let result;
try {
  if (target === 'vscode') {
    const counts = copyVscodeAssets();
    result = { target, ...counts, destination };
  } else {
    const counts = copyClaudeCodeAssets(destination);
    result = { target, agents: counts.agents, skills: counts.skills, destination };
  }
  copySpinner.succeed('Assets installed.');
} catch (err) {
  copySpinner.fail('Installation failed.');
  printError(handleError(err));
  process.exit(1);
}

printSuccess(result);

// ─── MCP (VS Code only) ─────────────────────────────────────────────────────
if (target === 'vscode') {
  const mcpSpinner = createSpinner('Installing local interactive-mcp server...');
  mcpSpinner.start();
  try {
    installMcp();
    mcpSpinner.succeed('interactive-mcp installed and VS Code mcp.json updated.');
  } catch (err) {
    mcpSpinner.fail('interactive-mcp installation failed (non-fatal).');
    printError(handleError(err));
  }
} else {
  printInfo('Skipping interactive-mcp install — Claude Code target does not use it.');
}

// ─── helpers ────────────────────────────────────────────────────────────────

function handleError(err) {
  if (err.code === 'EACCES') return 'Permission denied writing to destination. Try with the correct permissions.';
  if (err.code === 'ENOSPC') return 'Not enough disk space to complete installation.';
  return err.message;
}

function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function askChoice(question, options) {
  return new Promise((resolve) => {
    console.log(`\n${question}`);
    for (const opt of options) console.log(`  [${opt.key}] ${opt.label}`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Escolha: ', (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      const match = options.find((o) => o.key === trimmed || o.value === trimmed);
      if (!match) {
        printError(`Opção inválida: "${answer}". Rode de novo.`);
        process.exit(1);
      }
      resolve(match.value);
    });
  });
}

function parseFlag(argv, name) {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = argv.indexOf(name);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
  return null;
}
