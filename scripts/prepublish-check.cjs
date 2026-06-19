#!/usr/bin/env node

/**
 * pre-publish check: ensure dist/ exists and version matches package.json
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

let hasError = false;

// 1. Check dist/ exists
const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('✗ dist/ directory not found. Run `npm run build` first.');
  hasError = true;
} else {
  const required = [
    'dist/cli/index.js',
    'dist/commands/init.js',
    'dist/commands/update.js',
    'dist/commands/doctor.js',
    'dist/commands/status.js',
    'dist/core/sources.js',
    'dist/core/platforms.js',
    'dist/core/github.js',
    'dist/core/install.js',
    'dist/core/detect.js',
    'dist/core/npm.js',
  ];
  for (const f of required) {
    if (!fs.existsSync(path.join(root, f))) {
      console.error(`✗ Missing: ${f}`);
      hasError = true;
    }
  }
  if (!hasError) {
    console.log('✓ All dist files present');
  }
}

// 2. Check bin entry exists
const binPath = path.join(root, 'bin', 'easyflow.js');
if (!fs.existsSync(binPath)) {
  console.error('✗ bin/easyflow.js not found');
  hasError = true;
} else {
  console.log('✓ bin/easyflow.js present');
}

// 3. Check version is not 0.0.0
if (pkg.version === '0.0.0') {
  console.error('✗ Version is 0.0.0 — update before publishing');
  hasError = true;
} else {
  console.log(`✓ Version: ${pkg.version}`);
}

// 4. Check package name
if (!pkg.name.startsWith('@')) {
  console.error('✗ Package name should be scoped (e.g. @code-happy/easyflow)');
  hasError = true;
} else {
  console.log(`✓ Package name: ${pkg.name}`);
}

if (hasError) {
  console.error('\n❌ Pre-publish check failed. Fix the issues above before publishing.');
  process.exit(1);
} else {
  console.log('\n✅ Pre-publish check passed. Ready to publish.');
}
