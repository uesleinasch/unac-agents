import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '../assets');
const VSCODE_USER_DIR = resolve(homedir(), '.config/Code/User');
const MCP_INSTALL_DIR = resolve(homedir(), '.copilot/mcp/interactive-mcp');

/**
 * Returns all mcp.json paths that VS Code may read:
 * - the global one at ~/.config/Code/User/mcp.json
 * - one per profile at ~/.config/Code/User/profiles/<id>/mcp.json
 */
function findAllMcpConfigs() {
  const paths = [];

  const global = resolve(VSCODE_USER_DIR, 'mcp.json');
  paths.push(global);

  const profilesDir = resolve(VSCODE_USER_DIR, 'profiles');
  if (existsSync(profilesDir)) {
    for (const entry of readdirSync(profilesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const candidate = resolve(profilesDir, entry.name, 'mcp.json');
        paths.push(candidate);
      }
    }
  }

  return paths;
}

/**
 * Installs the local interactive-mcp package to ~/.copilot/mcp/interactive-mcp
 * and updates all VS Code mcp.json files (global + profiles) to use the local binary.
 */
export function installMcp() {
  const mcpSrc = resolve(ASSETS_DIR, 'mcp/interactive-mcp');
  if (!existsSync(mcpSrc)) return;

  // Copy MCP files (dist + package.json) to ~/.copilot/mcp/interactive-mcp
  mkdirSync(MCP_INSTALL_DIR, { recursive: true });
  cpSync(mcpSrc, MCP_INSTALL_DIR, { recursive: true });

  // Install production dependencies
  execSync('npm install --production --silent', {
    cwd: MCP_INSTALL_DIR,
    stdio: 'ignore',
  });

  // Patch all mcp.json files (global + profiles)
  for (const configPath of findAllMcpConfigs()) {
    patchMcpConfig(configPath);
  }
}

/**
 * Adds the interactive server entry to a mcp.json file.
 * Creates the file if it doesn't exist yet.
 */
function patchMcpConfig(configPath) {
  const entryPoint = resolve(MCP_INSTALL_DIR, 'dist/index.js');

  let config = { servers: {} };
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
      if (!config.servers) config.servers = {};
    } catch {
      config = { servers: {} };
    }
  } else {
    mkdirSync(dirname(configPath), { recursive: true });
  }

  config.servers['interactive'] = {
    command: 'node',
    args: [entryPoint, '-t', '120'],
    type: 'stdio',
  };

  writeFileSync(configPath, JSON.stringify(config, null, '\t'), 'utf8');
}

export { MCP_INSTALL_DIR };
