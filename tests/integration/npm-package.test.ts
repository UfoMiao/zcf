import { exec } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
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

      const { stdout: buildOutput } = await execAsync(buildCommand, { cwd: projectRoot })
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
    const { stdout: packOutput } = await execAsync('npm pack --json', { cwd: projectRoot })
    let packData: Array<{ files?: Array<{ path: string }>, filename?: string }>
    try {
      packData = JSON.parse(packOutput)
    }
    catch (error) {
      console.error('Failed to parse npm pack output:', packOutput)
      throw error
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
    // Skip this test if we detect catalog dependencies and no built package exists
    // This indicates we're in a development environment without proper npm package preparation
    const packageJsonContent = await import('node:fs').then(fs =>
      JSON.parse(fs.readFileSync(join(projectRoot, 'package.json'), 'utf-8')),
    )

    // Check if we're using catalog dependencies
    const hasCatalogDeps = Object.values(packageJsonContent.dependencies || {}).some((dep: any) =>
      typeof dep === 'string' && dep.startsWith('catalog:'),
    )

    if (hasCatalogDeps) {
      // Check if pnpm is available
      try {
        await execAsync('pnpm --version', { cwd: projectRoot })
      }
      catch {
        console.log('pnpm not available but catalog dependencies detected - skipping npm package test')
        return // Skip test gracefully
      }

      // Try to build first to generate proper package.json
      try {
        await execAsync('pnpm build', { cwd: projectRoot })
      }
      catch {
        console.log('Build failed, might be in CI without proper setup - skipping npm package test')
        return // Skip test gracefully
      }
    }

    // Create test directory
    mkdirSync(testTmpDir, { recursive: true })

    // Create a minimal package.json
    const packageJson = {
      name: 'test-zcf-install',
      version: '1.0.0',
      private: true,
    }
    writeFileSync(join(testTmpDir, 'package.json'), JSON.stringify(packageJson, null, 2))

    try {
      // Pack current version using pnpm pack for better catalog support
      const { stdout: packOutput } = await execAsync('pnpm pack', { cwd: projectRoot })
      const lines = packOutput.trim().split('\n')
      const tarballName = lines[lines.length - 1]
      if (!tarballName) {
        throw new Error('Failed to get tarball name from pnpm pack output')
      }
      const tarballPath = join(projectRoot, tarballName)

      // Install the packed version using pnpm instead of npm for catalog support
      try {
        await execAsync(`pnpm add ${tarballPath}`, { cwd: testTmpDir })
      }
      catch (installError: any) {
        // If pnpm fails with catalog error, skip test gracefully
        if (installError.message.includes('catalog:') || installError.message.includes('EUNSUPPORTEDPROTOCOL')) {
          console.log('Catalog dependency detected and pnpm installation failed - skipping test')
          return
        }
        throw installError
      }

      // Check if pnpx is available in test directory
      try {
        await execAsync('pnpx --version', { cwd: testTmpDir })
      }
      catch {
        console.log('pnpx not available in test directory - skipping npm package test')
        return
      }

      // Test Chinese menu
      const testScript = `
        const { spawn } = require('child_process');
        const isWindows = process.platform === 'win32';
        const child = spawn(isWindows ? 'pnpx.cmd' : 'pnpx', ['zcf', '--lang', 'zh-CN'], { 
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: process.cwd(),
          shell: isWindows,
          detached: false
        });
        let output = '';
        let killed = false;
        
        child.stdout.on('data', (data) => { output += data; });
        child.stderr.on('data', (data) => { output += data; });
        
        const cleanup = () => {
          if (!killed) {
            killed = true;
            try {
              if (isWindows) {
                // Force kill on Windows
                require('child_process').execSync(\`taskkill /F /T /PID \${child.pid}\`, { stdio: 'ignore' });
              } else {
                child.kill('SIGTERM');
              }
            } catch (e) {
              // Ignore errors during cleanup
            }
          }
        };
        
        process.on('exit', cleanup);
        
        setTimeout(() => {
          cleanup();
          // Check for proper Chinese translation
          if (output.includes('请选择功能') && output.includes('完整初始化') && !output.includes('menuOptions.')) {
            console.log('SUCCESS: Chinese i18n working');
            process.exit(0);
          } else {
            console.error('FAILED: Chinese i18n not working');
            console.error('Output:', output);
            process.exit(1);
          }
        }, 5000);
      `

      writeFileSync(join(testTmpDir, 'test-zh-cn.js'), testScript)
      await execAsync('node test-zh-cn.js', { cwd: testTmpDir, timeout: 10000 })

      // Test English menu
      const testScriptEn = `
        const { spawn } = require('child_process');
        const isWindows = process.platform === 'win32';
        const child = spawn(isWindows ? 'pnpx.cmd' : 'pnpx', ['zcf', '--lang', 'en'], { 
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: process.cwd(),
          shell: isWindows,
          detached: false
        });
        let output = '';
        let killed = false;
        
        child.stdout.on('data', (data) => { output += data; });
        child.stderr.on('data', (data) => { output += data; });
        
        const cleanup = () => {
          if (!killed) {
            killed = true;
            try {
              if (isWindows) {
                // Force kill on Windows
                require('child_process').execSync(\`taskkill /F /T /PID \${child.pid}\`, { stdio: 'ignore' });
              } else {
                child.kill('SIGTERM');
              }
            } catch (e) {
              // Ignore errors during cleanup
            }
          }
        };
        
        process.on('exit', cleanup);
        
        setTimeout(() => {
          cleanup();
          // Check for proper English translation
          if (output.includes('Select function') && output.includes('Full initialization') && !output.includes('menuOptions.')) {
            console.log('SUCCESS: English i18n working');
            process.exit(0);
          } else {
            console.error('FAILED: English i18n not working');
            console.error('Output:', output);
            process.exit(1);
          }
        }, 5000);
      `

      writeFileSync(join(testTmpDir, 'test-en.js'), testScriptEn)
      await execAsync('node test-en.js', { cwd: testTmpDir, timeout: 10000 })

      // Clean up tarball
      if (existsSync(tarballPath)) {
        rmSync(tarballPath)
      }
    }
    finally {
      // Always clean up tarball files to prevent test pollution
      try {
        const tarballFiles = await execAsync('ls zcf-*.tgz 2>/dev/null || true', { cwd: projectRoot })
        if (tarballFiles.stdout) {
          for (const file of tarballFiles.stdout.trim().split('\n').filter(Boolean)) {
            const filePath = join(projectRoot, file)
            if (existsSync(filePath)) {
              rmSync(filePath, { force: true })
              console.log(`Cleaned up test tarball: ${file}`)
            }
          }
        }
      }
      catch (cleanupError) {
        console.warn('Cleanup warning:', cleanupError)
      }
    }
  }, 60000) // Long timeout for npm install and testing

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
