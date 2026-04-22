import chalk from 'chalk';
import ora from 'ora';
import isUnicodeSupported from 'is-unicode-supported';

const VERSION = process.env.npm_package_version ?? '1.0.0';
const unicode = isUnicodeSupported();

export function printBanner() {
  if (unicode) {
    const line = '═'.repeat(36);
    console.log(chalk.cyan(`╔${line}╗`));
    console.log(chalk.cyan('║') + chalk.bold(`  unac-agents installer v${VERSION}  `) + chalk.cyan('║'));
    console.log(chalk.cyan(`╚${line}╝`));
  } else {
    console.log(chalk.cyan(`+${'='.repeat(36)}+`));
    console.log(chalk.cyan('|') + chalk.bold(`  unac-agents installer v${VERSION}  `) + chalk.cyan('|'));
    console.log(chalk.cyan(`+${'='.repeat(36)}+`));
  }
  console.log();
}

export function createSpinner(text) {
  return ora({ text: chalk.yellow(text), color: 'yellow' });
}

export function printBackup(backupPath) {
  console.log(chalk.blue(`${unicode ? '📦' : '[BACKUP]'} Backup created: ${backupPath}`));
}

export function printTarget(target, scope) {
  const label = target === 'vscode' ? 'VS Code (GitHub Copilot)' : `Claude Code (${scope})`;
  console.log(chalk.magenta(`${unicode ? '🎯' : '[TARGET]'} ${label}`));
}

export function printDestination(destination) {
  console.log(chalk.gray(`   destination: ${destination}`));
}

/**
 * @param {{ target: 'vscode' | 'claude-code', agents: string[], skills: string[], destination: string }} result
 */
export function printSuccess({ target, agents, skills, destination }) {
  console.log(chalk.green(`\n${unicode ? '✅' : '[OK]'} Agents installed (${agents.length}):`));
  for (const name of agents) console.log(chalk.green(`  ${unicode ? '•' : '-'} ${name}`));

  console.log(chalk.green(`\n${unicode ? '✅' : '[OK]'} Skills installed (${skills.length}):`));
  for (const name of skills) console.log(chalk.green(`  ${unicode ? '•' : '-'} ${name}`));

  console.log();
  console.log(chalk.gray(`Installed at: ${destination}`));
  console.log();

  if (target === 'vscode') {
    console.log(chalk.bold.green(`${unicode ? '🎉' : '[DONE]'} Reload VS Code to activate the new agents and skills.`));
  } else {
    console.log(chalk.bold.green(`${unicode ? '🎉' : '[DONE]'} Restart Claude Code (or run /agents) to activate.`));
  }
}

/**
 * @param {{ target: 'vscode' | 'claude-code', agents: string[], skills: string[], destination: string }} preview
 */
export function printDryRun({ target, agents, skills, destination }) {
  console.log(chalk.yellow(`\n${unicode ? '🔍' : '[DRY-RUN]'} Dry-run mode — no files will be written.\n`));
  console.log(chalk.yellow(`Target: ${target}`));
  console.log(chalk.yellow(`Destination: ${destination}\n`));

  console.log(chalk.yellow(`Agents to install (${agents.length}):`));
  for (const name of agents) console.log(chalk.yellow(`  ${unicode ? '•' : '-'} ${name}`));

  console.log(chalk.yellow(`\nSkills to install (${skills.length}):`));
  for (const name of skills) console.log(chalk.yellow(`  ${unicode ? '•' : '-'} ${name}`));
}

export function printAborted() {
  console.log(chalk.gray('\nInstallation cancelled.'));
}

export function printError(message) {
  console.error(chalk.red(`\n${unicode ? '❌' : '[ERROR]'} ${message}`));
}

export function printInfo(message) {
  console.log(chalk.cyan(`${unicode ? 'ℹ' : '[i]'} ${message}`));
}
