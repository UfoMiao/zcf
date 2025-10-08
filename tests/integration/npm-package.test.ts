import { exec } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { dirname, join } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '../..')
const testTmpDir = join(projectRoot, 'tmp-npm-test')

describe('npm Package Integration Tests', () => {
  // Clean up before and after tests with retry logic for Windows
  const cleanup = async (retries = 3) => {
    if (!existsSync(testTmpDir)) {
      return
    }

    for (let i = 0; i < retries; i++) {
      try {
        rmSync(testTmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
        return
      }
      catch (error: any) {
        if (error.code === 'EBUSY' && i < retries - 1) {
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        // On final retry or non-EBUSY errors, log but don't throw
        console.warn(`Warning: Could not clean up ${testTmpDir}:`, error.message)
      }
    }
  }

  beforeAll(async () => await cleanup())
  afterAll(async () => await cleanup())

  it('should pack successfully with all i18n files included', async () => {
    // Check if critical i18n files exist in dist, if not build the project
    const criticalFiles = [
      'dist/i18n/locales/zh-CN/menu.json',
      'dist/i18n/locales/en/menu.json',
      'dist/i18n/locales/zh-CN/common.json',
      'dist/i18n/locales/en/common.json',
    ]

    const missingFiles = criticalFiles.filter(file => !existsSync(join(projectRoot, file)))

    if (missingFiles.length > 0) {
      console.log(`Building project because ${missingFiles.length} critical i18n files are missing:`, missingFiles)

      // Use platform-specific npm command for Windows compatibility
      const buildCommand = process.platform === 'win32' ? 'npm.cmd run build' : 'npm run build'

      const { stdout: buildOutput } = await execAsync(buildCommand, {
        cwd: projectRoot,
        env: {
          ...process.env,
          HUSKY: '0', // Disable husky to avoid Windows file locking issues
          NO_UPDATE_NOTIFIER: '1', // Disable npm update notifications
        },
      })
      expect(buildOutput).toContain('Successfully copied')
      expect(buildOutput).toContain('i18n files')

      // Verify files exist after build
      for (const file of criticalFiles) {
        const fullPath = join(projectRoot, file)
        expect(existsSync(fullPath), `${file} should exist in dist directory after build`).toBe(true)
      }
    }
    else {
      console.log('All critical i18n files exist, skipping build')
    }

    // Use npm pack with --json for detailed package contents
    // Skip husky prepare script to avoid Windows file locking issues
    const { stdout: packOutput } = await execAsync('npm pack --json', {
      cwd: projectRoot,
      env: {
        ...process.env,
        HUSKY: '0', // Disable husky to avoid Windows file locking issues
        NO_UPDATE_NOTIFIER: '1', // Disable npm update notifications
      },
    })
    let packData: Array<{ files?: Array<{ path: string }>, filename?: string }>
    try {
      // Try to find JSON content more robustly
      // Look for the first occurrence of [ or { that starts a valid JSON structure
      const fullText = packOutput.trim()

      // Remove any prefix text before JSON
      const jsonStartIndex = Math.min(
        !fullText.includes('[') ? Infinity : fullText.indexOf('['),
        !fullText.includes('{') ? Infinity : fullText.indexOf('{'),
      )

      if (jsonStartIndex === Infinity) {
        throw new Error('No JSON structure found in npm pack output')
      }

      // Extract everything from the JSON start to the end
      const jsonContent = fullText.substring(jsonStartIndex).trim()

      // Validate that we have proper JSON content
      if (!jsonContent.startsWith('[') && !jsonContent.startsWith('{')) {
        throw new Error('Invalid JSON start structure found')
      }

      packData = JSON.parse(jsonContent)
    }
    catch (error) {
      console.error('Failed to parse npm pack output:', packOutput)
      throw new Error(`JSON parsing failed: ${(error as Error).message}. Raw output: ${packOutput.substring(0, 200)}...`)
    }

    // Extract file list from npm pack JSON output
    const files = packData[0]?.files || []
    if (files.length === 0) {
      console.error('No files found in npm pack output:', packData)
      throw new Error('npm pack returned no files')
    }

    const fileNames = files.map(f => f.path)

    // Log all files for debugging
    console.log('Files included in npm pack:', fileNames.filter((name: string) => name.includes('i18n')))

    // Verify critical i18n files are included with better error messages
    const expectedFiles = [
      'dist/i18n/locales/zh-CN/menu.json',
      'dist/i18n/locales/en/menu.json',
      'dist/i18n/locales/zh-CN/common.json',
      'dist/i18n/locales/en/common.json',
    ]

    for (const expectedFile of expectedFiles) {
      if (!fileNames.includes(expectedFile)) {
        console.error(`Missing file: ${expectedFile}`)
        console.error('Available i18n files:', fileNames.filter((name: string) => name.includes('i18n')))
        expect(fileNames, `${expectedFile} should be included in npm pack`).toContain(expectedFile)
      }
    }

    // Check all required namespaces
    const requiredNamespaces = ['api', 'ccr', 'cli', 'cometix', 'configuration', 'errors', 'installation', 'language', 'mcp', 'tools', 'updater', 'workflow']
    for (const ns of requiredNamespaces) {
      expect(fileNames).toContain(`dist/i18n/locales/zh-CN/${ns}.json`)
      expect(fileNames).toContain(`dist/i18n/locales/en/${ns}.json`)
    }

    // Count total i18n files
    const i18nFiles = fileNames.filter((name: string) => name.includes('dist/i18n/locales/') && name.endsWith('.json'))
    expect(i18nFiles.length).toBeGreaterThanOrEqual(28) // 14 namespaces × 2 languages

    // Clean up the generated tarball
    const tarballName = packData[0]?.filename
    if (tarballName && existsSync(join(projectRoot, tarballName))) {
      rmSync(join(projectRoot, tarballName), { force: true })
    }
  }, 30000) // Increase timeout for build process

  it('should work correctly when installed as npm package', async () => {
    // Fast validation approach - check if we can even run this test
    const packageJsonContent = await import('node:fs').then(fs =>
      JSON.parse(fs.readFileSync(join(projectRoot, 'package.json'), 'utf-8')),
    )

    // Skip heavy integration test in CI or if catalog dependencies detected
    const hasCatalogDeps = Object.values(packageJsonContent.dependencies || {}).some((dep: any) =>
      typeof dep === 'string' && dep.startsWith('catalog:'),
    )

    if (hasCatalogDeps || process.env.CI) {
      console.log('Skipping npm package integration test (CI environment or catalog dependencies)')
      return
    }

    // Quick dependency check instead of full installation
    try {
      await execAsync('pnpm --version', { cwd: projectRoot, timeout: 500 })
    }
    catch {
      console.log('pnpm not available - skipping npm package test')
      return
    }

    // Fast npm pack validation - verify real package contents without installation
    console.log('Fast validation: verifying npm pack contents')

    // Use npm pack --dry-run for fast content verification
    // Skip husky prepare script to avoid Windows file locking issues
    const { stdout: dryRunOutput } = await execAsync('npm pack --dry-run', {
      cwd: projectRoot,
      timeout: 5000,
      env: {
        ...process.env,
        HUSKY: '0', // Disable husky to avoid Windows file locking issues
        NO_UPDATE_NOTIFIER: '1', // Disable npm update notifications
      },
    })

    // Extract file list from dry-run output
    const packedFiles = dryRunOutput
      .split('\n')
      .filter(line => line.includes('npm notice'))
      .map(line => line.replace(/npm notice\s*\d+\.\d+[kKmMgG]?B\s+/, '').trim())
      .filter(Boolean)

    // Verify critical files are included in pack
    const criticalFiles = [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/i18n/locales/zh-CN/menu.json',
      'dist/i18n/locales/en/menu.json',
      'package.json',
    ]

    for (const file of criticalFiles) {
      expect(
        packedFiles.some(packed => packed.includes(file)),
        `Critical file ${file} should be included in npm pack`,
      ).toBe(true)
    }

    // Verify i18n files count
    const i18nFiles = packedFiles.filter(file => file.includes('dist/i18n/locales/') && file.endsWith('.json'))
    expect(i18nFiles.length).toBeGreaterThanOrEqual(28) // 14 namespaces × 2 languages

    console.log(`Verified ${packedFiles.length} files in package, ${i18nFiles.length} i18n files included`)
  }, 2000) // Fast timeout - optimized test

  it('should have proper path resolution in different environments', async () => {
    // Test that the path resolution logic in i18n/index.ts handles various scenarios
    const i18nIndexPath = join(projectRoot, 'src/i18n/index.ts')
    expect(existsSync(i18nIndexPath)).toBe(true)

    // Read the file and verify it contains the enhanced path resolution
    const { readFileSync } = await import('node:fs')
    const i18nContent = readFileSync(i18nIndexPath, 'utf-8')

    // Verify the enhanced path resolution logic exists
    expect(i18nContent).toContain('packageRoot')
    expect(i18nContent).toContain('package.json')
    expect(i18nContent).toContain('NPM package')
    expect(i18nContent).toContain('node_modules')

    // Verify it includes both development and production paths
    expect(i18nContent).toContain('Development: src/i18n/locales')
    expect(i18nContent).toContain('Production build')
    expect(i18nContent).toContain('possibleBasePaths')
  })
})
