/**
 * Pi adapter — prompts directory (project-local).
 * Output: {skillsDir}/prompts/{prefix}-{id}.md
 */

import path from 'path';
import type { CommandAdapter, CommandContent } from './types.js';
import type { InstallScope } from '../platforms.js';

export const piAdapter: CommandAdapter = {
  platformIds: ['pi'],

  getCommandPath(
    commandId: string,
    prefix: string,
    baseDir: string,
    skillsDir: string,
    _scope: InstallScope,
  ): string {
    return path.join(baseDir, skillsDir, 'prompts', `${prefix}-${commandId}.md`);
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
      '---',
    ].join('\n');

    return `${frontmatter}\n\n${body}`;
  },
};
