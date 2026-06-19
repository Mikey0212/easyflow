import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { checkbox, select } from '@inquirer/prompts';
import { PLATFORMS, getPlatformSkillsDir, getSettingsFilePath, type Platform } from '../core/platforms.js';
import { SOURCES, getBundledAssetsPath, type SkillSource } from '../core/sources.js';
import { detectPlatforms, getBaseDir, hasSkills, type InstallScope } from '../core/detect.js';
import { resolveVersion, fetchRepo, cleanupTemp } from '../core/github.js';
import { installSource, installCommands, writeLockFile, type LockSourceEntry } from '../core/install.js';
import { installNpmPackage, getNpmPackageVersion } from '../core/npm.js';
import { installOpenSpec } from '../core/openspec.js';
import { bold, dim, cyan, green, yellow, red, gray, blue, white, drawBox } from '../core/color.js';
import { registerHooks } from '../core/hooks.js';

export type InitOptions = {
  yes?: boolean;
  skipExisting?: boolean;
  overwrite?: boolean;
  json?: boolean;
  scope?: InstallScope;
  lang?: string;
};

type InstallStatus = 'installed' | 'skipped' | 'failed';
type ComponentAction = 'overwrite' | 'skip' | 'install';
type BulkOverwriteChoice = 'overwrite-all' | 'skip-all' | 'choose';

interface PlatformResult {
  platform: Platform;
  easyflow: InstallStatus;
  superpowers: InstallStatus;
  openspec: InstallStatus;
}

type ComponentPlan = {
  efAction: ComponentAction;
  spAction: ComponentAction;
  osAction: ComponentAction;
};

interface LanguageConfig {
  id: string;
  name: string;
}

const LANGUAGES: LanguageConfig[] = [
  { id: 'en', name: 'English' },
  { id: 'zh', name: '中文' },
];

const EASYFLOW_BANNER = [
  ``,
  `  ${cyan('███████╗')} █████╗ ███████╗██╗   ██╗${cyan('███████╗')}██╗      ██████╗ ██╗    ██╗`,
  `  ${cyan('██╔════╝')}██╔══██╗██╔════╝╚██╗ ██╔╝${cyan('██╔════╝')}██║     ██╔═══██╗██║    ██║`,
  `  ${cyan('█████╗  ')}███████║███████╗ ╚████╔╝ ${cyan('█████╗  ')}██║     ██║   ██║██║ █╗ ██║`,
  `  ${cyan('██╔══╝  ')}██╔══██║╚════██║  ╚██╔╝  ${cyan('██╔══╝  ')}██║     ██║   ██║██║███╗██║`,
  `  ${cyan('███████╗')}██║  ██║███████║   ██║   ${cyan('██║     ')}███████╗╚██████╔╝╚███╔███╔╝`,
  `  ${cyan('╚══════╝')}╚═╝  ╚═╝╚══════╝   ╚═╝   ${cyan('╚═╝     ')}╚══════╝ ╚═════╝  ╚══╝╚══╝ `,
  ``,
  `  ${bold('OpenSpec')} + ${bold('Superpowers')} Engineering Workflow`,
  ``,
].join('\n');

async function selectScope(options: InitOptions): Promise<InstallScope> {
  if (options.scope) {
    if (options.scope === 'project' || options.scope === 'global') return options.scope;
    console.warn(`  Warning: invalid scope "${options.scope}", expected "project" or "global". Falling back to prompt.`);
  }
  if (options.yes) return 'project';

  return select({
    message: 'Install scope:',
    choices: [
      { name: 'Project (current directory)', value: 'project' as const },
      { name: 'Global (home directory)', value: 'global' as const },
    ],
  });
}

async function selectLanguage(options: InitOptions): Promise<LanguageConfig> {
  if (options.lang) {
    return LANGUAGES.find((l) => l.id === options.lang) ?? LANGUAGES[0];
  }
  if (options.yes) return LANGUAGES[0];

  const langId = await select({
    message: 'Language for easyflow skills:',
    choices: LANGUAGES.map((lang) => ({ name: lang.name, value: lang.id })),
  });

  return LANGUAGES.find((l) => l.id === langId) ?? LANGUAGES[0];
}

async function selectPlatforms(detected: Set<string>, options: InitOptions): Promise<string[]> {
  const choices = PLATFORMS.map((p) => ({
    name: `${p.name}${detected.has(p.id) ? ' (detected)' : ''}`,
    value: p.id,
    checked: detected.has(p.id),
  }));

  if (options.yes) {
    const selected = [...detected];
    return selected.length > 0 ? selected : PLATFORMS.map((p) => p.id);
  }

  return checkbox({ message: 'Select platforms to set up:', choices, required: true });
}

async function promptOverwriteChoice(
  componentName: string,
  platformName: string,
): Promise<'overwrite' | 'skip'> {
  return select({
    message: `${componentName} already installed on ${platformName}. What to do?`,
    choices: [
      { name: 'Overwrite', value: 'overwrite' as const },
      { name: 'Skip', value: 'skip' as const },
    ],
  });
}

async function promptBulkOverwriteChoice(
  platformName: string,
  components: string[],
): Promise<BulkOverwriteChoice> {
  return select({
    message: `${platformName} already has ${components.join(', ')} installed. What to do?`,
    choices: [
      { name: 'Overwrite all existing components', value: 'overwrite-all' as const },
      { name: 'Skip all existing components', value: 'skip-all' as const },
      { name: 'Choose per component', value: 'choose' as const },
    ],
  });
}

function resolveAction(
  hasExisting: boolean,
  options: InitOptions,
): ComponentAction {
  if (!hasExisting) return 'install';
  if (options.overwrite) return 'overwrite';
  if (options.skipExisting) return 'skip';
  if (options.yes) return 'skip';
  return 'install';
}

function displaySummary(results: PlatformResult[], scope: InstallScope): void {
  const scopeLabel = scope === 'global' ? os.homedir() : 'project';

  console.log(`\n  ${green(bold('✓'))}  ${bold('Setup complete!')} ${dim(`scope: ${scopeLabel}`)}\n`);

  const installed = results.filter(
    (r) => r.easyflow === 'installed' || r.superpowers === 'installed' || r.openspec === 'installed',
  );
  const skipped = results.filter(
    (r) => r.easyflow === 'skipped' && r.superpowers === 'skipped' && r.openspec === 'skipped',
  );
  const failed = results.filter(
    (r) => r.easyflow === 'failed' || r.superpowers === 'failed' || r.openspec === 'failed',
  );

  if (installed.length > 0) {
    console.log(`  ${green('Installed')}`);
    for (const r of installed) {
      console.log(`    ${green('✓')}  ${bold(r.platform.name)} ${dim(`${getPlatformSkillsDir(r.platform, scope)}/skills/`)}`);
    }
  }
  if (skipped.length > 0) {
    console.log(`  ${yellow('Skipped')}  ${skipped.map((r) => r.platform.name).join(', ')}`);
  }
  if (failed.length > 0) {
    console.log(`  ${red('Failed')}   ${failed.map((r) => r.platform.name).join(', ')}`);
  }

  console.log(`\n  ${bold('Quick start')}`);
  console.log(`    ${cyan('/ezfl:design')}    Start a new change with design exploration`);
  console.log(`    ${cyan('/ezfl:triage')}    Triage change complexity first`);
  console.log(`    ${cyan('/ezfl:propose')}   Create a change\n`);
}

export async function initCommand(targetPath: string, options: InitOptions = {}): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const log = options.json ? () => undefined : console.log;

  log(`\n${EASYFLOW_BANNER}`);
  log(`  ${dim('Setting up in')} ${bold(projectPath)}\n`);
  log(drawBox([
    `${cyan('◆')}  Agent skills for AI tools`,
    `${cyan('◆')}  /ezfl:* commands`,
  ], 42));
  log('');

  const detected = await detectPlatforms(projectPath);
  const scope = await selectScope(options);
  const language = await selectLanguage(options);

  const selectedPlatformIds = await selectPlatforms(detected, options);
  if (selectedPlatformIds.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ projectPath, scope, language: language.id, selectedPlatforms: [], results: [] }, null, 2));
      return;
    }
    log('\n  No platforms selected. Exiting.\n');
    return;
  }

  const selectedPlatforms = PLATFORMS.filter((p) => selectedPlatformIds.includes(p.id));
  const baseDir = getBaseDir(scope, projectPath);

  // --- Plan phase: detect existing, resolve overwrite strategy ---

  type PlatformPlan = ComponentPlan & {
    platform: Platform;
    hasEF: boolean;
    hasSP: boolean;
    hasOS: boolean;
  };

  const plans: PlatformPlan[] = [];

  for (const platform of selectedPlatforms) {
    const hasEF = await hasSkills(baseDir, platform, 'easy-flow', scope);
    const hasSP = await hasSkills(baseDir, platform, 'superpowers', scope);
    const hasOS = await hasSkills(baseDir, platform, 'openspec', scope);

    let efAction = resolveAction(hasEF, options);
    let spAction = resolveAction(hasSP, options);
    let osAction = resolveAction(hasOS, options);

    if (!options.yes) {
      const existingComponents = [
        hasEF && efAction === 'install' ? 'easy-flow' : null,
        hasSP && spAction === 'install' ? 'Superpowers' : null,
        hasOS && osAction === 'install' ? 'OpenSpec' : null,
      ].filter((c): c is string => Boolean(c));

      if (existingComponents.length > 1) {
        const bulkChoice = await promptBulkOverwriteChoice(platform.name, existingComponents);
        if (bulkChoice !== 'choose') {
          const action = bulkChoice === 'overwrite-all' ? 'overwrite' : 'skip';
          if (efAction === 'install') efAction = action;
          if (spAction === 'install') spAction = action;
          if (osAction === 'install') osAction = action;
        }
      }

      if (efAction === 'install' && hasEF) efAction = await promptOverwriteChoice('easy-flow', platform.name);
      if (spAction === 'install' && hasSP) spAction = await promptOverwriteChoice('Superpowers', platform.name);
      if (osAction === 'install' && hasOS) osAction = await promptOverwriteChoice('OpenSpec', platform.name);
    }

    plans.push({ platform, efAction, spAction, osAction, hasEF, hasSP, hasOS });
  }

  // --- Install phase ---

  const lockSources: LockSourceEntry[] = [];
  const results: PlatformResult[] = [];

  // 1. OpenSpec (install CLI + run `openspec init`)
  const osToolIds = plans
    .filter((p) => p.osAction !== 'skip' && p.platform.openspecToolId)
    .map((p) => p.platform.openspecToolId!);
  let osGlobalStatus: InstallStatus = 'skipped';

  if (osToolIds.length > 0) {
    log(`\n  ${blue('⏳')} ${bold('OpenSpec')} ${dim(`for: ${osToolIds.join(', ')}`)}`);
    const result = await installOpenSpec(projectPath, osToolIds, scope);
    osGlobalStatus = result;
    log(`  ${result === 'installed' ? green('✓') : result === 'skipped' ? dim('○') : red('✗')}  OpenSpec ${result === 'installed' ? green('installed') : result === 'skipped' ? dim('skipped') : red('failed')}`);
    const osSource = SOURCES.find((s) => s.id === 'openspec')!;
    const installedVersion = result === 'installed' ? getNpmPackageVersion(osSource.npmPackage!) : osSource.minVersion;
    lockSources.push({ id: 'openspec', version: installedVersion });
  } else {
    log(`\n  ${dim('○')}  OpenSpec ${dim('skipped')}`);
  }

  // 2. Superpowers (GitHub clone)
  const spSource = SOURCES.find((s) => s.id === 'superpowers')!;
  const spNeeded = plans.some((p) => p.spAction !== 'skip');
  let spGlobalStatus: InstallStatus = 'skipped';

  if (spNeeded) {
    log(`\n  ${blue('⏳')} ${bold('Superpowers')} ${dim(`>= ${spSource.minVersion}`)}...`);
    try {
      const version = resolveVersion(spSource.repo!, spSource.minVersion);
      log(`  ${dim('↳')} ${version ? `v${version}` : 'HEAD (no tag)'}`);
      const { localPath } = await fetchRepo(spSource.repo!, version);

      for (const plan of plans) {
        if (plan.spAction === 'skip') continue;
        await installSource(spSource, localPath, baseDir, plan.platform, scope, language.id);
        log(`  ${green('✓')}  Superpowers ${dim('→')} ${plan.platform.name}`);
      }

      await cleanupTemp(localPath);
      spGlobalStatus = 'installed';
      lockSources.push({ id: 'superpowers', version: version ?? 'HEAD' });
    } catch (err) {
      log(`  ${red('✗')}  Superpowers: ${red((err as Error).message)}`);
      spGlobalStatus = 'failed';
    }
  } else {
    log(`\n  ${dim('○')}  Superpowers ${dim('skipped')}`);
  }

  // 3. easy-flow (bundled assets — no network required)
  const efSource = SOURCES.find((s) => s.id === 'easy-flow')!;
  const efNeeded = plans.some((p) => p.efAction !== 'skip');
  let efGlobalStatus: InstallStatus = 'skipped';

  if (efNeeded) {
    log(`\n  ${blue('⏳')} ${bold('easy-flow')} ${dim('(bundled)')}...`);
    try {
      const bundledPath = getBundledAssetsPath();
      // The bundled path is the root that contains assets/, and source paths
      // are relative to this root (e.g. "assets/zh/skills").
      // Since getBundledAssetsPath() returns the assets/ dir itself, we need
      // the parent so that "assets/zh/skills" resolves correctly.
      const repoRoot = path.resolve(bundledPath, '..');

      for (const plan of plans) {
        if (plan.efAction === 'skip') continue;
        await installSource(efSource, repoRoot, baseDir, plan.platform, scope, language.id);
        await installCommands(efSource, repoRoot, baseDir, plan.platform, scope, language.id);
        log(`  ${green('✓')}  easy-flow ${dim('→')} ${plan.platform.name}`);
      }

      efGlobalStatus = 'installed';
      // Read version from bundled manifest
      const manifestPath = path.join(bundledPath, 'manifest.json');
      let efVersion = efSource.minVersion;
      try {
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
        if (manifest.version) efVersion = manifest.version;
      } catch { /* use minVersion as fallback */ }
      lockSources.push({ id: 'easy-flow', version: efVersion });
    } catch (err) {
      log(`  ${red('✗')}  easy-flow: ${red((err as Error).message)}`);
      efGlobalStatus = 'failed';
    }
  } else {
    log(`\n  ${dim('○')}  easy-flow ${dim('skipped')}`);
  }

  // 4. Register hooks for platforms that support them
  if (efGlobalStatus === 'installed') {
    log(`\n  ${blue('⏳')} ${bold('Hooks')}...`);
    for (const platform of selectedPlatforms) {
      const result = await registerHooks(baseDir, platform, scope, 'easy-flow');
      if (result.registered) {
        const hooksLocation = platform.hookType === 'codex-hooks'
          ? '~/.codex/hooks.json'
          : getSettingsFilePath(platform, scope);
        log(`  ${green('✓')}  Hooks ${dim('→')} ${platform.name} ${dim(`(${hooksLocation})`)}`);
      } else if (result.reason === 'already registered') {
        log(`  ${dim('○')}  Hooks: ${platform.name} ${dim('already registered')}`);
      } else if (result.reason === 'no native hook support') {
        log(`  ${dim('○')}  Hooks: ${platform.name} ${dim('not supported')}`);
      }
    }
  }

  // Build results
  for (const plan of plans) {
    results.push({
      platform: plan.platform,
      openspec: plan.osAction !== 'skip' && plan.platform.openspecToolId ? osGlobalStatus : 'skipped',
      superpowers: plan.spAction !== 'skip' ? spGlobalStatus : 'skipped',
      easyflow: plan.efAction !== 'skip' ? efGlobalStatus : 'skipped',
    });
  }

  // Write lock
  await writeLockFile(projectPath, language.id, scope, selectedPlatforms, lockSources);

  // Output
  if (options.json) {
    console.log(JSON.stringify({
      projectPath,
      scope,
      language: language.id,
      selectedPlatforms: selectedPlatformIds,
      results: results.map((r) => ({
        platform: r.platform.id,
        platformName: r.platform.name,
        openspec: r.openspec,
        superpowers: r.superpowers,
        easyflow: r.easyflow,
      })),
    }, null, 2));
    return;
  }

  displaySummary(results, scope);
}
