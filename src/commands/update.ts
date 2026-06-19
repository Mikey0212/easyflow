import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { PLATFORMS, type Platform, type InstallScope } from '../core/platforms.js';
import { SOURCES, getBundledAssetsPath } from '../core/sources.js';
import { resolveVersion, fetchRepo, cleanupTemp } from '../core/github.js';
import { installSource, installCommands, writeLockFile, type LockFile, type LockSourceEntry } from '../core/install.js';
import { bold, dim, cyan, green, yellow, red, blue } from '../core/color.js';
import { getPlatformSkillsDir } from '../core/platforms.js';

const require = createRequire(import.meta.url);
const { version: currentVersion } = require('../../package.json');
const PACKAGE_NAME = '@code-happy/easyflow';

export type UpdateOptions = {
  force?: boolean;
  skipNpm?: boolean;
  lang?: string;
};

// --- Self-update helpers ---

function getNpmExecutable(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function isSameOrInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function detectPackageScope(
  projectPath: string,
  packageRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..'),
): Promise<InstallScope> {
  const localPackageRoot = path.join(projectPath, 'node_modules', '@code-happy', 'easyflow');
  if (isSameOrInside(packageRoot, localPackageRoot)) return 'project';

  try {
    const pkgContent = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgContent);
    if (
      pkg.dependencies?.[PACKAGE_NAME] ||
      pkg.devDependencies?.[PACKAGE_NAME] ||
      pkg.optionalDependencies?.[PACKAGE_NAME]
    ) {
      return 'project';
    }
  } catch {
    // No package.json or parse error — assume global
  }

  return 'global';
}

function buildNpmUpdateArgs(scope: InstallScope): string[] {
  return scope === 'global'
    ? ['install', '-g', `${PACKAGE_NAME}@latest`]
    : ['install', `${PACKAGE_NAME}@latest`];
}

async function updateSelfNpmPackage(scope: InstallScope, projectPath: string): Promise<boolean> {
  const args = buildNpmUpdateArgs(scope);
  const cwd = scope === 'global' ? process.cwd() : projectPath;

  return new Promise((resolve) => {
    const child = spawn(getNpmExecutable(), args, { cwd, stdio: 'inherit', shell: true });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

// --- Main update command ---

/**
 * Detect the installed language by reading the lock file,
 * then verify by checking installed SKILL.md content (Unicode CJK detection).
 * Falls back to 'zh' if detection fails.
 */
async function detectInstalledLanguage(
  projectPath: string,
  lock: LockFile,
): Promise<string> {
  // Use lock file language as the primary source
  if (lock.lang === 'en' || lock.lang === 'zh') return lock.lang;

  // Fallback: detect from installed SKILL.md content
  const baseDir = lock.scope === 'global' ? os.homedir() : projectPath;
  const platforms = PLATFORMS.filter((p) => lock.platforms.includes(p.id));

  for (const platform of platforms) {
    const skillsDir = getPlatformSkillsDir(platform, lock.scope as InstallScope);
    const skillPatterns = [
      path.join(baseDir, skillsDir, 'skills', 'easy-flow', 'skills', 'design', 'SKILL.md'),
      path.join(baseDir, skillsDir, 'skills', 'easy-flow', 'skills', 'build', 'SKILL.md'),
      path.join(baseDir, skillsDir, 'skills', 'easy-flow', 'skills', 'audit', 'SKILL.md'),
    ];

    for (const skillPath of skillPatterns) {
      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        if (/[\u3400-\u9fff]/u.test(content)) return 'zh';
        // If content exists but has no CJK characters, it's English
        return 'en';
      } catch {
        continue;
      }
    }
  }

  return 'zh'; // default fallback
}

export async function updateCommand(targetPath: string, options: UpdateOptions): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const lockPath = path.join(projectPath, 'eflow-lock.json');

  console.log(`\n  ${bold('easyflow update')} ${dim(`v${currentVersion}`)}\n`);

  // 1. Self-update (npm package)
  let npmStatus: 'updated' | 'failed' | 'skipped' = 'skipped';

  if (!options.skipNpm) {
    const packageScope = await detectPackageScope(projectPath);
    const updateCmd = ['npm', ...buildNpmUpdateArgs(packageScope)].join(' ');

    console.log(`  ${blue('⏳')} ${bold('Self-update')} ${dim(`(${packageScope} scope)`)}`);
    console.log(`    ${dim('$ ' + updateCmd)}`);

    const npmUpdated = await updateSelfNpmPackage(packageScope, projectPath);
    if (npmUpdated) {
      npmStatus = 'updated';
      console.log(`  ${green('✓')}  easyflow npm package updated to latest\n`);
    } else {
      npmStatus = 'failed';
      console.log(`  ${yellow('⚠')}  Self-update failed, continuing with skill updates\n`);
    }
  } else {
    console.log(`  ${dim('○')}  Self-update ${dim('skipped (--skip-npm)')}\n`);
  }

  // 2. Skill component updates
  let lockContent: string;
  try {
    lockContent = await fs.readFile(lockPath, 'utf-8');
  } catch {
    console.error(`  ${red('✗')} eflow-lock.json not found. Run ${cyan('easyflow init')} first.\n`);
    process.exit(1);
  }

  let lock: LockFile;
  try {
    lock = JSON.parse(lockContent);
  } catch {
    console.error(`  ${red('✗')} eflow-lock.json is corrupted. Run ${cyan('easyflow init')} to reinitialize.\n`);
    process.exit(1);
  }

  const scope = lock.scope as InstallScope;
  const platforms = PLATFORMS.filter((p) => lock.platforms.includes(p.id));
  const baseDir = scope === 'global' ? os.homedir() : projectPath;

  // Detect language (--lang overrides auto-detection)
  const lang = options.lang ?? (await detectInstalledLanguage(projectPath, lock));

  const newLockSources: LockSourceEntry[] = [];
  let updated = 0;

  for (const source of SOURCES) {
    const oldEntry = lock.sources.find((s) => s.id === source.id);
    if (!oldEntry && !options.force) {
      continue;
    }

    // npm type: just re-run npm install
    if (source.type === 'npm') {
      console.log(`  ${blue('⏳')} ${bold(source.name)} ${dim('via npm')}...`);
      try {
        const { execSync } = await import('child_process');
        execSync(`npm install -g ${source.npmPackage}@latest`, {
          encoding: 'utf-8',
          timeout: 60000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        // Resolve the actually installed version
        let installedVersion = source.minVersion;
        try {
          const listOutput = execSync(`npm list -g --depth=0 --json ${source.npmPackage}`, {
            encoding: 'utf-8',
            timeout: 15000,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          const listJson = JSON.parse(listOutput);
          const pkg = listJson?.dependencies?.[source.npmPackage!];
          if (pkg?.version) installedVersion = pkg.version;
        } catch {
          // fallback: leave installedVersion as minVersion
        }
        console.log(`  [${source.name}] ✓ Updated via npm (v${installedVersion})`);
        newLockSources.push({ id: source.id, version: installedVersion });
        updated++;
      } catch (err) {
        console.log(`  ${red('✗')}  ${source.name} npm update failed — ${(err as Error).message}`);
        if (oldEntry) newLockSources.push(oldEntry);
      }
      continue;
    }

    // Bundled type: use local assets shipped with the npm package
    if (source.type === 'bundled') {
      const bundledPath = getBundledAssetsPath();
      const repoRoot = path.resolve(bundledPath, '..');

      // Read version from bundled manifest
      let efVersion = source.minVersion;
      try {
        const manifestPath = path.join(bundledPath, 'manifest.json');
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
        if (manifest.version) efVersion = manifest.version;
      } catch { /* use minVersion as fallback */ }

      if (oldEntry && oldEntry.version === efVersion && !options.force) {
        console.log(`  ${green('✓')}  ${source.name} up to date ${dim(`(v${efVersion})`)}`);
        newLockSources.push(oldEntry);
        continue;
      }

      console.log(`  ${blue('⏳')} ${bold(source.name)} ${dim('(bundled)')} ${oldEntry ? dim(oldEntry.version) + ' → ' : ''}${dim(`v${efVersion}`)}`);

      try {
        for (const platform of platforms) {
          await installSource(source, repoRoot, baseDir, platform, scope, lang);
          await installCommands(source, repoRoot, baseDir, platform, scope, lang);
        }
        newLockSources.push({ id: source.id, version: efVersion });
        updated++;
        console.log(`  ${green('✓')}  ${source.name} updated`);
      } catch (err) {
        console.log(`  ${red('✗')}  ${source.name} update failed — ${(err as Error).message}`);
        if (oldEntry) newLockSources.push(oldEntry);
      }
      continue;
    }

    // GitHub type: resolve version + fetch
    const version = resolveVersion(source.repo!, source.minVersion);

    if (oldEntry && oldEntry.version === version && !options.force) {
      const vLabel = version ?? 'HEAD';
      console.log(`  ${green('✓')}  ${source.name} up to date ${dim(`(${vLabel})`)}`);
      newLockSources.push(oldEntry);
      continue;
    }

    const vLabel = version ?? 'HEAD';
    console.log(`  ${blue('⏳')} ${bold(source.name)} ${oldEntry ? dim(oldEntry.version) + ' → ' : ''}${dim(vLabel)}`);

    let fetchResult;
    try {
      fetchResult = await fetchRepo(source.repo!, version);
    } catch (err) {
      console.log(`  ${red('✗')}  ${source.name} fetch failed — ${(err as Error).message}`);
      if (oldEntry) newLockSources.push(oldEntry);
      continue;
    }

    for (const platform of platforms) {
      await installSource(source, fetchResult.localPath, baseDir, platform, scope, lang);
      await installCommands(source, fetchResult.localPath, baseDir, platform, scope, lang);
    }

    newLockSources.push({ id: source.id, version: version ?? 'HEAD' });
    await cleanupTemp(fetchResult.localPath);
    updated++;
    console.log(`  ${green('✓')}  ${source.name} updated`);
  }

  // Write updated lock
  await writeLockFile(projectPath, lang, scope, platforms, newLockSources);

  // Summary
  console.log(`\n  ${bold('Summary')}`);
  console.log(`    self:     ${npmStatus === 'updated' ? green('updated') : npmStatus === 'failed' ? yellow('failed') : dim('skipped')}`);
  console.log(`    skills:   ${updated > 0 ? `${green(updated + ' updated')}` : dim('up to date')}`);

  if (npmStatus === 'updated') {
    console.log(`\n  ${yellow('⚠')}  easyflow was updated. Restart your terminal to use the new version.\n`);
  } else {
    console.log('');
  }
}
