export const configuration = {
  existingConfig: 'Existing config detected. How to proceed?',
  backupAndOverwrite: 'Backup and overwrite all',
  updateDocsOnly: 'Update workflow-related md files only with backup',
  mergeConfig: 'Merge config',
  backupSuccess: 'All config files backed up to',
  copying: 'Copying configuration files...',
  configSuccess: 'Config files copied to',
  noExistingConfig: 'No existing configuration found. Please run `zcf` first.',
  updatingPrompts: 'Updating Claude Code memory documents...',

  // Model configuration
  selectDefaultModel: 'Select default model',
  modelConfigSuccess: 'Default model configured',
  existingModelConfig: 'Existing model configuration detected',
  currentModel: 'Current model',
  modifyModel: 'Modify model configuration?',
  keepModel: 'Keeping existing model configuration',
  defaultModelOption: 'Default - Let Claude Code choose',
  opusModelOption: 'Opus - Only use opus, high token consumption, use with caution',
  opusPlanModelOption: 'OpusPlan - Use Opus for planning, write code with sonnet, recommended',
  modelConfigured: 'Default model configured',

  // AI memory configuration
  selectMemoryOption: 'Select configuration option',
  configureAiLanguage: 'Configure AI output language',
  configureAiPersonality: 'Configure AI personality',
  configureOutputStyle: 'Configure global AI output style',
  aiLanguageConfigured: 'AI output language configured',
  existingLanguageConfig: 'Existing AI output language configuration detected',
  currentLanguage: 'Current language',
  modifyLanguage: 'Modify AI output language?',
  keepLanguage: 'Keeping existing language configuration',

  // AI personality (deprecated - replaced by output styles)
  selectAiPersonality: 'Select AI personality',
  customPersonalityHint: 'Define your own personality',
  enterCustomPersonality: 'Enter custom personality description',
  personalityConfigured: 'AI personality configured',
  existingPersonality: 'Existing AI personality configuration',
  currentPersonality: 'Current personality',
  modifyPersonality: 'Modify AI personality?',
  keepPersonality: 'Keeping existing personality',
  directiveCannotBeEmpty: 'Directive cannot be empty',
  languageRequired: 'Language is required',

  // Output styles
  selectOutputStyles: 'Select output styles to install',
  selectDefaultOutputStyle: 'Select global default output style',
  outputStyleInstalled: 'Output styles installed successfully',
  selectedStyles: 'Selected styles',
  defaultStyle: 'Default style',
  selectAtLeastOne: 'Please select at least one output style',
  legacyFilesDetected: 'Legacy personality configuration files detected',
  cleanupLegacyFiles: 'Clean up legacy configuration files?',
  legacyFilesRemoved: 'Legacy configuration files removed',

  // Output style names and descriptions
  outputStyles: {
    'engineer-professional': {
      name: 'Engineer Professional',
      description: 'Professional software engineer following SOLID, KISS, DRY, YAGNI principles',
    },
    'nekomata-engineer': {
      name: 'Nekomata Engineer',
      description: 'Professional catgirl engineer UFO Nya, combining rigorous engineering with cute catgirl traits',
    },
    'laowang-engineer': {
      name: 'Laowang Grumpy Tech',
      description: 'Laowang grumpy tech style, never tolerates code errors and non-standard code',
    },
    'default': {
      name: 'Default',
      description: 'Claude completes coding tasks efficiently and provides concise responses (Claude Code built-in)',
    },
    'explanatory': {
      name: 'Explanatory',
      description: 'Claude explains its implementation choices and codebase patterns (Claude Code built-in)',
    },
    'learning': {
      name: 'Learning',
      description: 'Learn-by-doing mode where Claude pauses and asks you to write small pieces of code for hands-on practice (Claude Code built-in)',
    },
  },

  // Cache
  confirmClearCache: 'Confirm clear all ZCF preference cache?',
  cacheCleared: 'ZCF cache cleared',
  noCacheFound: 'No cache file found',

  // Environment and permissions
  selectEnvPermissionOption: 'Select configuration option',
  importRecommendedEnv: 'Import ZCF recommended environment variables',
  importRecommendedEnvDesc: 'Privacy protection variables, etc.',
  importRecommendedPermissions: 'Import ZCF recommended permissions',
  importRecommendedPermissionsDesc:
    'Almost all permissions, reduce frequent permission requests, dangerous ops limited by rules',
  openSettingsJson: 'Open settings.json for manual configuration',
  openSettingsJsonDesc: 'Advanced user customization',
  envImportSuccess: 'Environment variables imported',
  permissionsImportSuccess: 'Permissions imported',
  openingSettingsJson: 'Opening settings.json...',

  // Version check related
  claudeCodeVersionCheck: 'Checking Claude Code version...',
  claudeCodeVersionCheckSkipped: 'Claude Code version check skipped (just installed)',
  claudeCodeAutoUpdating: 'Auto-updating Claude Code...',
  claudeCodeVersionCheckFailed: 'Claude Code version check failed',
  claudeCodeVersionCheckSuccess: 'Claude Code version check completed',
  claudeCodeNoUpdateNeeded: 'Claude Code is up to date',

  // JSON config related
  invalidConfiguration: 'Invalid configuration',
  failedToParseJson: 'Failed to parse JSON file:',
  failedToBackupConfig: 'Failed to backup config',
  failedToReadTemplateSettings: 'Failed to read template settings',
  failedToMergeSettings: 'Failed to merge settings',
  preservingExistingSettings: 'Preserving existing settings',
  memoryDirNotFound: 'Memory directory not found',
  failedToSetOnboarding: 'Failed to set onboarding flag',
  fixWindowsMcp: 'Fix Windows MCP configuration?',
}
