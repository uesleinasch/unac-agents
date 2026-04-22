import { cpSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '../assets');

export const COPILOT_DIR = resolve(homedir(), '.copilot');

function listEntries(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).map((e) => e.name);
}

/**
 * Resolves the `.claude` destination directory.
 * @param {'global' | 'local'} scope
 * @param {string} [cwd] — project root when scope is 'local'
 * @returns {string}
 */
export function resolveClaudeDir(scope, cwd = process.cwd()) {
  if (scope === 'global') return resolve(homedir(), '.claude');
  if (scope === 'local') return resolve(cwd, '.claude');
  throw new Error(`Unknown scope: ${scope}`);
}

/**
 * Lists assets that would be installed without writing anything.
 * @param {'vscode' | 'claude-code'} target
 * @returns {{ agents: string[], skills: string[] }}
 */
export function listAssets(target) {
  if (target === 'vscode') {
    return {
      agents: listEntries(resolve(ASSETS_DIR, 'agents-vscode')),
      skills: listEntries(resolve(ASSETS_DIR, 'skills-shared')),
    };
  }
  if (target === 'claude-code') {
    const shared = listEntries(resolve(ASSETS_DIR, 'skills-shared'));
    const claude = listEntries(resolve(ASSETS_DIR, 'skills-claude'));
    return {
      agents: listEntries(resolve(ASSETS_DIR, 'agents-claude')),
      skills: [...shared, ...claude],
    };
  }
  throw new Error(`Unknown target: ${target}`);
}

/**
 * Copies agents-vscode and skills-shared into ~/.copilot (destructive overlay).
 * @returns {{ agents: string[], skills: string[] }}
 */
export function copyVscodeAssets() {
  const agentsSrc = resolve(ASSETS_DIR, 'agents-vscode');
  const skillsSrc = resolve(ASSETS_DIR, 'skills-shared');
  const agentsDest = resolve(COPILOT_DIR, 'agents');
  const skillsDest = resolve(COPILOT_DIR, 'skills');

  mkdirSync(COPILOT_DIR, { recursive: true });
  cpSync(agentsSrc, agentsDest, { recursive: true });
  cpSync(skillsSrc, skillsDest, { recursive: true });

  return {
    agents: listEntries(agentsSrc),
    skills: listEntries(skillsSrc),
  };
}

/**
 * Surgical overlay copy for Claude Code. Writes agents and skills into
 * <claudeDir>/agents and <claudeDir>/skills without touching other files
 * the user may already have there (sessions, settings, third-party agents).
 *
 * Shared skills (skills-shared) are merged with Claude Code-specific skills
 * (skills-claude) under the same `skills/` destination.
 *
 * @param {string} claudeDir — target `.claude` directory (home or repo-scoped)
 * @returns {{ agents: string[], skills: string[], destination: string }}
 */
export function copyClaudeCodeAssets(claudeDir) {
  const agentsSrc = resolve(ASSETS_DIR, 'agents-claude');
  const sharedSkillsSrc = resolve(ASSETS_DIR, 'skills-shared');
  const claudeSkillsSrc = resolve(ASSETS_DIR, 'skills-claude');
  const agentsDest = resolve(claudeDir, 'agents');
  const skillsDest = resolve(claudeDir, 'skills');

  mkdirSync(agentsDest, { recursive: true });
  mkdirSync(skillsDest, { recursive: true });

  cpSync(agentsSrc, agentsDest, { recursive: true });
  cpSync(sharedSkillsSrc, skillsDest, { recursive: true });
  cpSync(claudeSkillsSrc, skillsDest, { recursive: true });

  return {
    agents: listEntries(agentsSrc),
    skills: [...listEntries(sharedSkillsSrc), ...listEntries(claudeSkillsSrc)],
    destination: claudeDir,
  };
}
