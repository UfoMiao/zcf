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

  // AI memory configuration
  selectMemoryOption: 'Select configuration option',
  configureAiLanguage: 'Configure AI output language',
  configureAiPersonality: 'Configure AI personality',
  aiLanguageConfigured: 'AI output language configured',

  // AI personality
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
};
