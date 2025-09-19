import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { exec } from 'tinyexec'
import { CLAUDE_DIR, SETTINGS_FILE } from '../constants.js'
import { ensureDir } from './fs-operations.js'
import { mergeAndCleanPermissions } from './permission-cleaner.js'
import { getPlatform } from './platform.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Get template settings
function getTemplateSettings(): any {
  const templatePath = join(__dirname, '../../templates/claude-code/common/settings.json')
  const content = readFileSync(templatePath, 'utf-8')
  return JSON.parse(content)
}

// Load current settings
function loadCurrentSettings(): any {
  if (!existsSync(SETTINGS_FILE)) {
    return {}
  }

  try {
    const content = readFileSync(SETTINGS_FILE, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return {}
  }
}

// Save settings
function saveSettings(settings: any): void {
  ensureDir(CLAUDE_DIR)
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

// Import recommended environment variables
export async function importRecommendedEnv(): Promise<void> {
  const templateSettings = getTemplateSettings()
  const currentSettings = loadCurrentSettings()

  // Merge env variables
  currentSettings.env = {
    ...currentSettings.env,
    ...templateSettings.env,
  }

  saveSettings(currentSettings)
}

// Import recommended permissions
export async function importRecommendedPermissions(): Promise<void> {
  const templateSettings = getTemplateSettings()
  const currentSettings = loadCurrentSettings()

  // Merge permissions with cleanup
  if (templateSettings.permissions && templateSettings.permissions.allow) {
    currentSettings.permissions = {
      ...templateSettings.permissions,
      allow: mergeAndCleanPermissions(
        templateSettings.permissions.allow,
        currentSettings.permissions?.allow,
      ),
    }
  }
  else {
    currentSettings.permissions = templateSettings.permissions
  }

  saveSettings(currentSettings)
}

// Open settings.json in system editor
export async function openSettingsJson(): Promise<void> {
  ensureDir(CLAUDE_DIR)

  // Ensure file exists
  if (!existsSync(SETTINGS_FILE)) {
    saveSettings({})
  }

  const platform = getPlatform()
  let command: string

  switch (platform) {
    case 'macos':
      command = 'open'
      break
    case 'windows':
      command = 'start'
      break
    default:
      // Linux - try common editors
      command = 'xdg-open'
  }

  try {
    await exec(command, [SETTINGS_FILE])
  }
  catch {
    // Fallback to code/vim/nano
    try {
      await exec('code', [SETTINGS_FILE])
    }
    catch {
      try {
        await exec('vim', [SETTINGS_FILE])
      }
      catch {
        await exec('nano', [SETTINGS_FILE])
      }
    }
  }
}
