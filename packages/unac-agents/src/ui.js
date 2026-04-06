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
