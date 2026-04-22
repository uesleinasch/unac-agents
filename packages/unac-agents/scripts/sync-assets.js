#!/usr/bin/env node
import { cpSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const repoRoot = resolve(pkgRoot, '../..');

const sources = [
  { src: resolve(repoRoot, 'agents-vscode'), dest: resolve(pkgRoot, 'assets/agents-vscode') },
  { src: resolve(repoRoot, 'agents-claude'), dest: resolve(pkgRoot, 'assets/agents-claude') },
  { src: resolve(repoRoot, 'skills-shared'), dest: resolve(pkgRoot, 'assets/skills-shared') },
  { src: resolve(repoRoot, 'skills-claude'), dest: resolve(pkgRoot, 'assets/skills-claude') },
  {
    src: resolve(repoRoot, 'packages/interactive-mcp'),
    dest: resolve(pkgRoot, 'assets/mcp/interactive-mcp'),
    exclude: ['node_modules', '.gitignore'],
  },
];

for (const { src, dest, exclude = [] } of sources) {
  if (!existsSync(src)) {
    console.error(`Source not found: ${src}`);
    process.exit(1);
  }
  if (existsSync(dest)) rmSync(dest, { recursive: true });
  cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => !exclude.some((ex) => srcPath.includes(`/${ex}`)),
  });
  console.log(`Synced: ${src} → ${dest}`);
}
