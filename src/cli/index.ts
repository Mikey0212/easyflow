import { Command } from 'commander';
import { createRequire } from 'module';
import { initCommand } from '../commands/init.js';
import { updateCommand } from '../commands/update.js';
import { doctorCommand } from '../commands/doctor.js';
import { statusCommand } from '../commands/status.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const program = new Command();

program
  .name('easyflow')
  .description('CLI installer for easy-flow + superpowers + openspec-cn workflow skills')
  .version(version);

program
  .command('init [path]')
  .description('Install workflow skills from GitHub into your project')
  .option('--yes', 'Auto-install with defaults, skip prompts')
  .option('--overwrite', 'Overwrite existing files')
  .option('--scope <scope>', 'Install scope: project or global')
  .option('--lang <lang>', 'Language: zh or en', '')
  .action(async (targetPath = '.', options) => {
    try {
      await initCommand(targetPath, options);
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        console.log('\n  Cancelled.\n');
        process.exit(0);
      }
      throw error;
    }
  });

program
  .command('update [path]')
  .description('Update easyflow and skills to latest versions')
  .option('--force', 'Force re-fetch all components')
  .option('--skip-npm', 'Skip self-update of the easyflow npm package')
  .option('--lang <lang>', 'Language: zh or en (auto-detect if not specified)')
  .action(async (targetPath = '.', options) => {
    await updateCommand(targetPath, options);
  });

program
  .command('doctor [path]')
  .description('Diagnose installation health')
  .option('--json', 'Output as JSON')
  .action(async (targetPath = '.', options) => {
    await doctorCommand(targetPath, options);
  });

program
  .command('status [path]')
  .description('Show active changes and workflow status (multi-worktree aware)')
  .option('--json', 'Output as JSON')
  .action(async (targetPath = '.', options) => {
    await statusCommand(targetPath, options);
  });

program.parse();
