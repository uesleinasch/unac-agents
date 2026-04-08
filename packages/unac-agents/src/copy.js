import { cpSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { COPILOT_DIR } from './backup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '../assets');

function listEntries(dir) {
  return readdirSync(dir, { withFileTypes: true }).map(e => e.name);
}

/**
 * Lists assets that would be installed without writing anything.
 * Used by --dry-run.
 * @returns {{ agents: string[], skills: string[] }}
 */
export function listAssets() {
  return {
    agents: listEntries(resolve(ASSETS_DIR, 'agents')),
    skills: listEntries(resolve(ASSETS_DIR, 'skills')),
  };
}

/**
 * Copies assets/agents and assets/skills into ~/.copilot.
 * Returns { agents, skills } as arrays of installed entry names.
 * @returns {{ agents: string[], skills: string[] }}
 */
export function copyAssets() {
  const agentsSrc = resolve(ASSETS_DIR, 'agents');
  const skillsSrc = resolve(ASSETS_DIR, 'skills');
  const agentsDest = resolve(COPILOT_DIR, 'agents');
  const skillsDest = resolve(COPILOT_DIR, 'skills');

  cpSync(agentsSrc, agentsDest, { recursive: true });
  cpSync(skillsSrc, skillsDest, { recursive: true });

  return {
    agents: listEntries(agentsSrc),
    skills: listEntries(skillsSrc),
  };
}
