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
  {
    id: 'rem-engineer',
    isCustom: true,
    filePath: 'rem-engineer.md',
  },
  {
    id: 'leibus-engineer',
    isCustom: true,
    filePath: 'leibus-engineer.md',
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
  // Use shared output-styles from common directory
  const templateDir = join(rootDir, 'templates', 'common', 'output-styles', lang)

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

export function clearGlobalOutputStyle(): void {
  const existingSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE) || {}

  // Remove the outputStyle key entirely
  const { outputStyle: _, ...rest } = existingSettings
  writeJsonConfig(SETTINGS_FILE, rest)
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
  // Order: default first for discoverability, then custom styles, then other built-in styles
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
      id: 'nekomata-engineer',
      name: i18n.t('configuration:outputStyles.nekomata-engineer.name'),
      description: i18n.t('configuration:outputStyles.nekomata-engineer.description'),
    },
    {
      id: 'laowang-engineer',
      name: i18n.t('configuration:outputStyles.laowang-engineer.name'),
      description: i18n.t('configuration:outputStyles.laowang-engineer.description'),
    },
    {
      id: 'ojousama-engineer',
      name: i18n.t('configuration:outputStyles.ojousama-engineer.name'),
      description: i18n.t('configuration:outputStyles.ojousama-engineer.description'),
    },
    {
      id: 'leibus-engineer',
      name: i18n.t('configuration:outputStyles.leibus-engineer.name'),
      description: i18n.t('configuration:outputStyles.leibus-engineer.description'),
    },
    {
      id: 'rem-engineer',
      name: i18n.t('configuration:outputStyles.rem-engineer.name'),
      description: i18n.t('configuration:outputStyles.rem-engineer.description'),
    },
    {
      id: 'explanatory',
      name: i18n.t('configuration:outputStyles.explanatory.name'),
      description: i18n.t('configuration:outputStyles.explanatory.description'),
    },
    {
      id: 'learning',
      name: i18n.t('configuration:outputStyles.learning.name'),
      description: i18n.t('configuration:outputStyles.learning.description'),
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
      // Allow empty selection - user can choose to not install any custom styles
    })

    selectedStyles = promptedStyles || []

    // If no custom styles selected, ask user if they want to set a built-in default style or skip entirely
    if (selectedStyles.length === 0) {
      const builtinStyles = availableStyles.filter(style => !style.isCustom)
      const noneOption = { id: '__none__', name: i18n.t('configuration:noOutputStyle'), description: i18n.t('configuration:noOutputStyleDesc') }
      const { defaultStyle: promptedDefault } = await inquirer.prompt<{ defaultStyle: string }>({
        type: 'list',
        name: 'defaultStyle',
        message: i18n.t('configuration:selectDefaultOutputStyle'),
        choices: addNumbersToChoices([
          // Show "none" option first
          {
            name: `${noneOption.name} - ${ansis.gray(noneOption.description)}`,
            value: '__none__',
            short: noneOption.name,
          },
          // Then show built-in styles
          ...builtinStyles.map((style) => {
            const styleInfo = outputStyleList.find(s => s.id === style.id)
            return {
              name: `${styleInfo?.name || style.id} - ${ansis.gray(styleInfo?.description || '')}`,
              value: style.id,
              short: styleInfo?.name || style.id,
            }
          }),
        ]),
        default: '__none__',
      })

      if (!promptedDefault) {
        // User cancelled the prompt - do nothing
        console.log(ansis.yellow(i18n.t('common:cancelled')))
        return
      }

      if (promptedDefault === '__none__') {
        // User explicitly chose not to use any output style - clear existing settings
        clearGlobalOutputStyle()
        updateZcfConfig({
          outputStyles: [],
          defaultOutputStyle: 'none',
        })
        console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleCleared')}`))
        return
      }

      // User selected a built-in style as default
      defaultStyle = promptedDefault
      setGlobalDefaultOutputStyle(defaultStyle)
      updateZcfConfig({
        outputStyles: [],
        defaultOutputStyle: defaultStyle,
      })
      console.log(ansis.green(`✔ ${i18n.t('configuration:outputStyleInstalled')}`))
      console.log(ansis.gray(`  ${i18n.t('configuration:defaultStyle')}: ${defaultStyle}`))
      return
    }

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
        // Then show all built-in styles (always available), with default first
        ...availableStyles
          .filter(style => !style.isCustom)
          .sort((a, b) => a.id === 'default' ? -1 : b.id === 'default' ? 1 : 0)
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
