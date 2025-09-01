import { copyFile, mkdir } from 'node:fs/promises'
import { glob } from 'glob'
import { dirname } from 'pathe'
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
        // Copy all JSON files from src/i18n/locales to dist/i18n/locales
        const jsonFiles = await glob('src/i18n/locales/**/*.json')

        if (jsonFiles.length === 0) {
          console.warn('No i18n JSON files found to copy')
          return
        }

        for (const file of jsonFiles) {
          const destFile = file.replace('src/', 'dist/')
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
