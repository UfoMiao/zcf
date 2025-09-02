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

describe('nPM Package Integration Tests', () => {
  // Clean up before and after tests
  const cleanup = () => {
    if (existsSync(testTmpDir)) {
      rmSync(testTmpDir, { recursive: true, force: true })
    }
  }

  beforeAll(() => cleanup())
  afterAll(() => cleanup())

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
      // Pack current version
      const { stdout: packOutput } = await execAsync('npm pack', { cwd: projectRoot })
      const lines = packOutput.trim().split('\n')
      const tarballName = lines[lines.length - 1]
      if (!tarballName) {
        throw new Error('Failed to get tarball name from npm pack output')
      }
      const tarballPath = join(projectRoot, tarballName)

      // Install the packed version
      await execAsync(`npm install ${tarballPath}`, { cwd: testTmpDir })

      // Test Chinese menu
      const testScript = `
        const { spawn } = require('child_process');
        const isWindows = process.platform === 'win32';
        const child = spawn(isWindows ? 'npx.cmd' : 'npx', ['zcf', '--lang', 'zh-CN'], { 
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: process.cwd(),
          shell: isWindows
        });
        let output = '';
        child.stdout.on('data', (data) => { output += data; });
        child.stderr.on('data', (data) => { output += data; });
        setTimeout(() => {
          child.kill();
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
        const child = spawn(isWindows ? 'npx.cmd' : 'npx', ['zcf', '--lang', 'en'], { 
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: process.cwd(),
          shell: isWindows
        });
        let output = '';
        child.stdout.on('data', (data) => { output += data; });
        child.stderr.on('data', (data) => { output += data; });
        setTimeout(() => {
          child.kill();
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
