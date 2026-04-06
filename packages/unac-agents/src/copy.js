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
