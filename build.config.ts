import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { glob } from 'glob'
import { dirname, join } from 'pathe'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/cli'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
    inlineDependencies: true,
  },
  // Copy i18n JSON files to dist
  hooks: {
    'build:done': async () => {
      try {
        // Enhanced cross-platform file discovery for Windows CI compatibility
        const findJsonFiles = async (basePath: string): Promise<string[]> => {
          const files: string[] = []

          const scanDirectory = async (dir: string): Promise<void> => {
            try {
              const entries = await readdir(dir, { withFileTypes: true })
              for (const entry of entries) {
                const fullPath = join(dir, entry.name)
                if (entry.isDirectory()) {
                  await scanDirectory(fullPath)
                }
                else if (entry.isFile() && entry.name.endsWith('.json')) {
                  files.push(fullPath)
                }
              }
            }
            catch (error) {
              console.warn(`Could not scan directory ${dir}:`, error)
            }
          }

          await scanDirectory(basePath)
          return files
        }

        // Try both glob and manual search for maximum Windows compatibility
        let jsonFiles: string[] = []
        try {
          // Use forward slashes in glob pattern and normalize results
          jsonFiles = await glob('src/i18n/locales/**/*.json', {
            windowsPathsNoEscape: true,
            posix: false, // Allow platform-specific paths
          })
          // Normalize paths for cross-platform compatibility
          jsonFiles = jsonFiles.map(file => file.replace(/\\/g, '/'))
        }
        catch (globError) {
          console.warn('Glob failed, using manual file search:', globError)
          jsonFiles = await findJsonFiles('src/i18n/locales')
        }

        if (jsonFiles.length === 0) {
          console.warn('No i18n JSON files found to copy')
          // Also try manual search as fallback
          jsonFiles = await findJsonFiles('src/i18n/locales')
        }

        if (jsonFiles.length === 0) {
          console.error('❌ No i18n JSON files found in src/i18n/locales')
          throw new Error('No i18n files found - this will break the application')
        }

        console.log(`Found ${jsonFiles.length} i18n files to copy`)

        for (const file of jsonFiles) {
          // Use pathe.join for proper cross-platform path handling
          const relativePath = file.replace(/^src[/\\]i18n[/\\]/, '')
          const destFile = join('dist', 'i18n', relativePath)
          const destDir = dirname(destFile)

          await mkdir(destDir, { recursive: true })
          await copyFile(file, destFile)
          console.log(`✅ Copied ${file} → ${destFile}`)
        }

        console.log(`🎉 Successfully copied ${jsonFiles.length} i18n files`)
      }
      catch (error) {
        console.error('❌ Failed to copy i18n files:', error)
        throw error
      }
    },
  },
})
