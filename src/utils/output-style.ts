import type { SupportedLang } from '../constants'
import type { ClaudeSettings } from '../types/config'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { CLAUDE_DIR, SETTINGS_FILE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { copyFile, ensureDir, exists, removeFile } from './fs-operations'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { addNumbersToChoices } from './prompt-helpers'
import { promptBoolean } from './toggle-prompt'
import { updateZcfConfig } from './zcf-config'

export interface OutputStyle {
  id: string
  isCustom: boolean
  filePath?: string
}

const OUTPUT_STYLES: OutputStyle[] = [
  // Custom styles (have template files)
  {
    id: 'engineer-professional',
    isCustom: true,
    filePath: 'engineer-professional.md',
  },
  {
    id: 'nekomata-engineer',
    isCustom: true,
    filePath: 'nekomata-engineer.md',
  },
  {
    id: 'laowang-engineer',
    isCustom: true,
    filePath: 'laowang-engineer.md',
  },
  {
    id: 'ojousama-engineer',
    isCustom: true,
    filePath: 'ojousama-engineer.md',
  },
  // Built-in styles (no template files)
  {
    id: 'default',
    isCustom: false,
  },
  {
    id: 'explanatory',
    isCustom: false,
  },
  {
    id: 'learning',
    isCustom: false,
  },
]

const LEGACY_FILES = ['personality.md', 'rules.md', 'technical-guides.md', 'mcp.md', 'language.md']

export function getAvailableOutputStyles(): OutputStyle[] {
  return OUTPUT_STYLES
}

export async function copyOutputStyles(selectedStyles: string[], lang: SupportedLang): Promise<void> {
  const outputStylesDir = join(CLAUDE_DIR, 'output-styles')
  ensureDir(outputStylesDir)

  // Get the root directory of the package
  const currentFilePath = fileURLToPath(import.meta.url)
  const distDir = dirname(dirname(currentFilePath))
  const rootDir = dirname(distDir)
  const templateDir = join(rootDir, 'templates', 'claude-code', lang, 'output-styles')

  for (const styleId of selectedStyles) {
    const style = OUTPUT_STYLES.find(s => s.id === styleId)
    if (!style || !style.isCustom || !style.filePath) {
      continue // Skip built-in styles or invalid styles
    }

    const sourcePath = join(templateDir, style.filePath)
    const destPath = join(outputStylesDir, style.filePath)

    if (exists(sourcePath)) {
      copyFile(sourcePath, destPath)
    }
  }
}

export function setGlobalDefaultOutputStyle(styleId: string): void {
  const existingSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE) || {}

  const updatedSettings: ClaudeSettings = {
    ...existingSettings,
    outputStyle: styleId,
  }

  writeJsonConfig(SETTINGS_FILE, updatedSettings)
}

export function hasLegacyPersonalityFiles(): boolean {
  return LEGACY_FILES.some(filename => exists(join(CLAUDE_DIR, filename)))
}

export function cleanupLegacyPersonalityFiles(): void {
  LEGACY_FILES.forEach((filename) => {
    const filePath = join(CLAUDE_DIR, filename)
    if (exists(filePath)) {
      removeFile(filePath)
    }
  })
}

export async function configureOutputStyle(
  preselectedStyles?: string[],
  preselectedDefault?: string,
): Promise<void> {
  ensureI18nInitialized()

  // Create static output style list for i18n-ally compatibility
  const outputStyleList = [
    {
      id: 'default',
      name: i18n.t('configuration:outputStyles.default.name'),
      description: i18n.t('configuration:outputStyles.default.description'),
    },
    {
      id: 'engineer-professional',
      name: i18n.t('configuration:outputStyles.engineer-professional.name'),
      description: i18n.t('configuration:outputStyles.engineer-professional.description'),
    },
    {
      id: 'explanatory',
      name: i18n.t('configuration:outputStyles.explanatory.name'),
      description: i18n.t('configuration:outputStyles.explanatory.description'),
    },
    {
      id: 'laowang-engineer',
      name: i18n.t('configuration:outputStyles.laowang-engineer.name'),
      description: i18n.t('configuration:outputStyles.laowang-engineer.description'),
    },
    {
      id: 'learning',
      name: i18n.t('configuration:outputStyles.learning.name'),
      description: i18n.t('configuration:outputStyles.learning.description'),
    },
    {
      id: 'nekomata-engineer',
      name: i18n.t('configuration:outputStyles.nekomata-engineer.name'),
      description: i18n.t('configuration:outputStyles.nekomata-engineer.description'),
    },
    {
      id: 'ojousama-engineer',
      name: i18n.t('configuration:outputStyles.ojousama-engineer.name'),
      description: i18n.t('configuration:outputStyles.ojousama-engineer.description'),
    },
  ]

  const availableStyles = getAvailableOutputStyles()

  // Check for legacy files
  if (hasLegacyPersonalityFiles() && !preselectedStyles) {
    console.log(ansis.yellow(`⚠️  ${i18n.t('configuration:legacyFilesDetected')}`))

    const cleanupLegacy = await promptBoolean({
      message: i18n.t('configuration:cleanupLegacyFiles'),
      defaultValue: true,
    })

    if (cleanupLegacy) {
      cleanupLegacyPersonalityFiles()
      console.log(ansis.green(`✔ ${i18n.t('configuration:legacyFilesRemoved')}`))
    }
  }
  else if (hasLegacyPersonalityFiles() && preselectedStyles) {
    // Auto cleanup in non-interactive mode
    cleanupLegacyPersonalityFiles()
  }

  let selectedStyles: string[]
  let defaultStyle: string

  if (preselectedStyles && preselectedDefault) {
    // Non-interactive mode
    selectedStyles = preselectedStyles
    defaultStyle = preselectedDefault
  }
  else {
    // Interactive mode - only show custom styles for installation
    const customStyles = availableStyles.filter(style => style.isCustom)
    const { selectedStyles: promptedStyles } = await inquirer.prompt<{ selectedStyles: string[] }>({
      type: 'checkbox',
      name: 'selectedStyles',
      message: `${i18n.t('configuration:selectOutputStyles')}${i18n.t('common:multiSelectHint')}`,
      choices: addNumbersToChoices(customStyles.map((style) => {
        const styleInfo = outputStyleList.find(s => s.id === style.id)
        return {
          name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || '')}`,
          value: style.id,
          checked: true, // Default select all custom styles
        }
      })),
      validate: async input => input.length > 0 || i18n.t('configuration:selectAtLeastOne'),
    })

    if (!promptedStyles || promptedStyles.length === 0) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    selectedStyles = promptedStyles

    const { defaultStyle: promptedDefault } = await inquirer.prompt<{ defaultStyle: string }>({
      type: 'list',
      name: 'defaultStyle',
      message: i18n.t('configuration:selectDefaultOutputStyle'),
      choices: addNumbersToChoices([
        // Show selected custom styles first (only what user actually installed)
        ...selectedStyles.map((styleId) => {
          const styleInfo = outputStyleList.find(s => s.id === styleId)
          return {
            name: `${styleInfo?.name || styleId} - ${ansis.gray(styleInfo?.description || '')}`,
            value: styleId,
            short: styleInfo?.name || styleId,
          }
        }),
        // Then show all built-in styles (always available)
        ...availableStyles
          .filter(style => !style.isCustom)
          .map((style) => {
            const styleInfo = outputStyleList.find(s => s.id === style.id)
            return {
              name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || '')}`,
              value: style.id,
              short: styleInfo?.name || style.id,
            }
          }),
      ]),
      default: selectedStyles.includes('engineer-professional') ? 'engineer-professional' : selectedStyles[0],
    })

    if (!promptedDefault) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    defaultStyle = promptedDefault
  }

  // Copy selected output styles using configLang for template language
  await copyOutputStyles(selectedStyles, 'zh-CN')

  // Set global default output style
  setGlobalDefaultOutputStyle(defaultStyle)

  // Update ZCF config
  updateZcfConfig({
    outputStyles: selectedStyles,
    defaultOutputStyle: defaultStyle,
  })

  console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleInstalled')}`))
  console.log(ansis.gray(`  ${i18n.t('configuration:selectedStyles')}: ${selectedStyles.join(', ')}`))
  console.log(ansis.gray(`  ${i18n.t('configuration:defaultStyle')}: ${defaultStyle}`))
}
