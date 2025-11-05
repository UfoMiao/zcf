#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Hardcoded catalog mappings from pnpm-workspace.yaml
const catalogs = {
  build: {
    '@antfu/eslint-config': '^5.4.1',
    'eslint': '^9.36.0',
    'eslint-plugin-format': '^1.0.2',
    'tsx': '^4.20.5',
    'typescript': '^5.9.2',
    'unbuild': '^3.6.1',
  },
  cli: {
    ansis: '^4.1.0',
    cac: '^6.7.14',
    inquirer: '^12.9.6',
    ora: '^9.0.0',
  },
  runtime: {
    'dayjs': '^1.11.18',
    'find-up-simple': '^1.0.1',
    'fs-extra': '^11.3.2',
    'i18next': '^25.5.2',
    'i18next-fs-backend': '^2.6.0',
    'pathe': '^2.0.3',
    'semver': '^7.7.2',
    'smol-toml': '^1.4.2',
    'tinyexec': '^1.0.1',
    'trash': '^10.0.0',
  },
  testing: {
    '@vitest/coverage-v8': '^3.2.4',
    '@vitest/ui': '^3.2.4',
    'glob': '^11.0.3',
    'vitest': '^3.2.4',
  },
  tooling: {
    '@changesets/cli': '^2.29.7',
    '@commitlint/cli': '^19.8.1',
    '@commitlint/config-conventional': '^19.8.1',
    '@commitlint/types': '^19.8.1',
    'husky': '^9.1.7',
    'lint-staged': '^16.2.0',
  },
  types: {
    '@types/fs-extra': '^11.0.4',
    '@types/inquirer': '^9.0.9',
    '@types/node': '^22.18.6',
    '@types/semver': '^7.7.1',
  },
}

// Read package.json
const packageJsonPath = resolve('package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

// Function to resolve catalog references
function resolveCatalog(deps) {
  if (!deps)
    return deps

  const resolved = {}
  for (const [name, version] of Object.entries(deps)) {
    if (typeof version === 'string' && version.startsWith('catalog:')) {
      const catalogName = version.replace('catalog:', '')
      const catalog = catalogs[catalogName]
      if (catalog && catalog[name]) {
        resolved[name] = catalog[name]
        console.log(`✓ Resolved ${name}: catalog:${catalogName} → ${catalog[name]}`)
      }
      else {
        console.warn(`⚠️  Could not resolve ${name} from catalog:${catalogName}`)
        resolved[name] = version
      }
    }
    else {
      resolved[name] = version
    }
  }
  return resolved
}

// Resolve dependencies
console.log('\n📦 Resolving catalog references...\n')
packageJson.dependencies = resolveCatalog(packageJson.dependencies)
packageJson.devDependencies = resolveCatalog(packageJson.devDependencies)

// Write resolved package.json
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

console.log('\n✅ Resolved all catalog references in package.json\n')
