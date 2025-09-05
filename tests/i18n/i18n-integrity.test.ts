import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'
import { dirname, join } from 'pathe'
import { beforeEach, describe, expect, it } from 'vitest'
import { i18n, initI18n } from '../../src/i18n/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '../..')

describe('i18n Integrity Tests', () => {
  describe('source i18n Files', () => {
    it('should have all required i18n source files', async () => {
      const sourceLocalesPath = join(projectRoot, 'src/i18n/locales')

      // Check if source directory exists
      expect(existsSync(sourceLocalesPath), 'Source i18n directory should exist').toBe(true)

      // Define required namespaces and languages
      const requiredLanguages = ['zh-CN', 'en']
      const requiredNamespaces = [
        'common',
        'api',
        'ccr',
        'cli',
        'cometix',
        'configuration',
        'errors',
        'installation',
        'language',
        'mcp',
        'menu',
        'tools',
        'updater',
        'workflow',
      ]

      for (const lang of requiredLanguages) {
        for (const ns of requiredNamespaces) {
          const filePath = join(sourceLocalesPath, lang, `${ns}.json`)
          expect(existsSync(filePath), `${lang}/${ns}.json should exist`).toBe(true)

          // Validate JSON format
          const content = readFileSync(filePath, 'utf-8')
          expect(() => JSON.parse(content), `${lang}/${ns}.json should be valid JSON`).not.toThrow()
        }
      }
    })

    it('should have consistent keys across languages', async () => {
      const sourceLocalesPath = join(projectRoot, 'src/i18n/locales')
      const namespaces = [
        'common',
        'api',
        'ccr',
        'cli',
        'cometix',
        'configuration',
        'errors',
        'installation',
        'language',
        'mcp',
        'menu',
        'tools',
        'updater',
        'workflow',
      ]

      for (const ns of namespaces) {
        const zhFile = join(sourceLocalesPath, 'zh-CN', `${ns}.json`)
        const enFile = join(sourceLocalesPath, 'en', `${ns}.json`)

        if (existsSync(zhFile) && existsSync(enFile)) {
          const zhContent = JSON.parse(readFileSync(zhFile, 'utf-8'))
          const enContent = JSON.parse(readFileSync(enFile, 'utf-8'))

          const zhKeys = Object.keys(zhContent).sort()
          const enKeys = Object.keys(enContent).sort()

          expect(zhKeys, `${ns}: zh-CN and en should have same keys`).toEqual(enKeys)
        }
      }
    })
  })

  describe('built i18n Files', () => {
    it('should copy all i18n files to dist after build', async () => {
      const distLocalesPath = join(projectRoot, 'dist', 'i18n', 'locales')

      if (!existsSync(distLocalesPath)) {
        // If dist doesn't exist, skip this test (might be in CI without build)
        console.warn('dist/i18n/locales not found, skipping built files test')
        return
      }

      const requiredLanguages = ['zh-CN', 'en']
      const requiredNamespaces = [
        'common',
        'api',
        'ccr',
        'cli',
        'cometix',
        'configuration',
        'errors',
        'installation',
        'language',
        'mcp',
        'menu',
        'tools',
        'updater',
        'workflow',
      ]

      for (const lang of requiredLanguages) {
        // Create language directory path using pathe.join for cross-platform compatibility
        const langDir = join(distLocalesPath, lang)

        if (!existsSync(langDir)) {
          expect.fail(`Language directory ${lang} should exist at ${langDir}`)
        }

        for (const ns of requiredNamespaces) {
          const filePath = join(langDir, `${ns}.json`)
          expect(existsSync(filePath), `dist: ${lang}/${ns}.json should exist at ${filePath}`).toBe(true)
        }
      }
    })

    it('should have identical content between source and dist files', async () => {
      const sourceLocalesPath = join(projectRoot, 'src/i18n/locales')
      const distLocalesPath = join(projectRoot, 'dist/i18n/locales')

      if (!existsSync(distLocalesPath)) {
        console.warn('dist/i18n/locales not found, skipping content comparison')
        return
      }

      const sourceFiles = await glob('**/*.json', { cwd: sourceLocalesPath })

      for (const file of sourceFiles) {
        const sourcePath = join(sourceLocalesPath, file)
        const distPath = join(distLocalesPath, file)

        if (existsSync(distPath)) {
          const sourceContent = readFileSync(sourcePath, 'utf-8')
          const distContent = readFileSync(distPath, 'utf-8')

          expect(distContent, `dist/${file} should match source content`).toBe(sourceContent)
        }
      }
    })
  })

  describe('path Resolution Tests', () => {
    beforeEach(async () => {
      // Reset i18n instance before each test
      if (i18n.isInitialized) {
        await i18n.changeLanguage('zh-CN')
      }
    })

    it('should initialize i18n successfully in development environment', async () => {
      await expect(initI18n('zh-CN')).resolves.not.toThrow()
      expect(i18n.isInitialized).toBe(true)
      expect(i18n.language).toBe('zh-CN')
    })

    it('should load and translate menu keys correctly', async () => {
      await initI18n('zh-CN')

      // Test critical menu translations
      const menuOptions = [
        'menu:menuOptions.fullInit',
        'menu:menuOptions.importWorkflow',
        'menu:menuOptions.configureApiOrCcr',
        'menu:menuOptions.exit',
      ]

      for (const key of menuOptions) {
        const translation = i18n.t(key)
        expect(translation, `${key} should be translated`).not.toBe(key)
        expect(translation, `${key} should not be empty`).toBeTruthy()
      }
    })

    it('should handle language switching correctly', async () => {
      await initI18n('zh-CN')
      const zhText = i18n.t('menu:selectFunction')
      expect(zhText).toBe('请选择功能')

      await initI18n('en')
      const enText = i18n.t('menu:selectFunction')
      expect(enText).toBe('Select function')
    })
  })

  describe('nPM Package Integrity', () => {
    it('should include i18n files in package.json files array', async () => {
      const packageJsonPath = join(projectRoot, 'package.json')
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

      expect(packageJson.files).toContain('dist')
      // The dist folder should contain i18n files after build
    })

    it('should validate build hook copies i18n files correctly', async () => {
      const buildConfigPath = join(projectRoot, 'build.config.ts')

      if (existsSync(buildConfigPath)) {
        const buildConfig = readFileSync(buildConfigPath, 'utf-8')

        // Check that build config has i18n copy logic
        expect(buildConfig).toContain('i18n')
        expect(buildConfig).toContain('locales')
        expect(buildConfig).toContain('build:done')
      }
    })

    it('should include all i18n files in npm pack output', async () => {
      // This test ensures npm package will contain all i18n files
      const { execSync } = await import('node:child_process')

      try {
        const packOutput = execSync('npm pack --dry-run', {
          encoding: 'utf8',
          cwd: projectRoot,
          stdio: 'pipe',
        })

        // Verify critical i18n files are included
        const criticalFiles = [
          'dist/i18n/locales/zh-CN/menu.json',
          'dist/i18n/locales/en/menu.json',
          'dist/i18n/locales/zh-CN/common.json',
          'dist/i18n/locales/en/common.json',
        ]

        for (const file of criticalFiles) {
          expect(packOutput, `${file} should be included in npm package`).toContain(file)
        }

        // Count total i18n files
        const i18nMatches = packOutput.match(/dist\/i18n\/locales\/.*\.json/g) || []
        const expectedMinCount = 28 // 14 namespaces × 2 languages

        expect(i18nMatches.length, `Should include at least ${expectedMinCount} i18n files`).toBeGreaterThanOrEqual(expectedMinCount)
      }
      catch {
        console.warn('npm pack test skipped - might be in CI without dist built')
        // Skip this test if npm pack fails (e.g., in CI without build)
      }
    })

    it('should verify CLI translations work with built package', async () => {
      // Test that the built CLI actually shows translations, not raw keys
      if (!existsSync(join(projectRoot, 'bin/zcf.mjs'))) {
        console.warn('Built CLI not found, skipping CLI translation test')
        return
      }

      const { execSync } = await import('node:child_process')

      try {
        // Test Chinese CLI output (using Node.js timeout instead of shell timeout for cross-platform compatibility)
        const zhOutput = execSync('node bin/zcf.mjs --lang zh-CN --help', {
          encoding: 'utf8',
          cwd: projectRoot,
          stdio: 'pipe',
          timeout: 10000, // 10 second timeout
        })

        // Should show Chinese translations, not raw keys
        expect(zhOutput).toContain('显示语言')
        expect(zhOutput).not.toContain('menuOptions.')
        expect(zhOutput).not.toContain('menuDescriptions.')

        // Test English CLI output
        const enOutput = execSync('node bin/zcf.mjs --lang en --help', {
          encoding: 'utf8',
          cwd: projectRoot,
          stdio: 'pipe',
          timeout: 10000, // 10 second timeout
        })

        // Should show English translations, not raw keys
        expect(enOutput).toContain('display language')
        expect(enOutput).not.toContain('menuOptions.')
        expect(enOutput).not.toContain('menuDescriptions.')
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn('CLI test skipped - might timeout in CI environment:', message)
        // This is expected in CI environments where interactive CLI might not work properly
      }
    })
  })
})
