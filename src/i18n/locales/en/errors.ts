export const errors = {
  // General errors
  failedToSetOnboarding: 'Failed to set onboarding completion flag:',
  failedToWriteMcpConfig: 'Failed to write MCP config:',
  templateDirNotFound: 'Template directory not found:',
  failedToReadTemplateSettings: 'Failed to read template settings.json:',
  failedToMergeSettings: 'Failed to merge settings.json:',
  preservingExistingSettings: 'Preserving existing settings.json due to merge error',
  
  // File system errors
  failedToReadFile: 'Failed to read file:',
  failedToWriteFile: 'Failed to write file:',
  failedToCopyFile: 'Failed to copy file:',
  failedToRemoveFile: 'Failed to remove file:',
  failedToReadDirectory: 'Failed to read directory:',
  failedToGetStats: 'Failed to get stats for:',
  sourceDirNotExist: 'Source directory does not exist:',
  memoryDirNotFound: 'Memory directory not found:',
  
  // JSON config errors
  invalidConfiguration: 'Invalid configuration, using default value',
  failedToParseJson: 'Failed to parse JSON file:',
  failedToBackupConfig: 'Failed to backup config file:',
  invalidEnvConfig: 'Invalid env configuration: expected object',
  invalidApiUrl: 'Invalid ANTHROPIC_BASE_URL: expected string',
  invalidApiKey: 'Invalid ANTHROPIC_API_KEY: expected string',
  invalidAuthToken: 'Invalid ANTHROPIC_AUTH_TOKEN: expected string',
  invalidPermissionsConfig: 'Invalid permissions configuration: expected object',
  invalidPermissionsAllow: 'Invalid permissions.allow: expected array',
  
  // MCP errors
  failedToAddOnboardingFlag: 'Failed to add hasCompletedOnboarding flag:',
  
  // AI personality errors
  failedToApplyPersonality: 'Failed to apply personality directive:',
};