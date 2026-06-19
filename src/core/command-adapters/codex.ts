/**
 * Codex adapter — global prompts directory.
 * Codex only supports ~/.codex/prompts/ for custom prompts (no project-level support).
 * Output: ~/.codex/prompts/{prefix}-{id}.md (always absolute, regardless of scope)
 */

import path from 'path';
import os from 'os';
import type { CommandAdapter, CommandContent } from './types.js';
import type { InstallScope } from '../platforms.js';

function getCodexHome(): string {
  const envHome = process.env.CODEX_HOME?.trim();
  return envHome ? path.resolve(envHome) : path.join(os.homedir(), '.codex');
}

export const codexAdapter: CommandAdapter = {
  platformIds: ['codex'],

  getCommandPath(
    commandId: string,
    prefix: string,
    _baseDir: string,
    _skillsDir: string,
    _scope: InstallScope,
  ): string {
    // Always global — Codex only reads prompts from ~/.codex/prompts/
    return path.join(getCodexHome(), 'prompts', `${prefix}-${commandId}.md`);
  },

  formatCommand(content: CommandContent): string {
    // Convert /ezfl:xxx references to /ezfl-xxx in body
    const body = content.body.replace(
      new RegExp(`/${content.prefix}:`, 'g'),
      `/${content.prefix}-`,
    );

    const frontmatter = [
      '---',
      `description: ${content.description}`,
      'argument-hint: command arguments',
      '---',
    ].join('\n');

    return `${frontmatter}\n\n${body}`;
  },
};
