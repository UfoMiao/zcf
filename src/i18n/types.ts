export type SupportedLang = 'zh-CN' | 'en';

export interface TranslationKeys {
  // Common
  multiSelectHint: string;
  yes: string;
  no: string;
  skip: string;
  cancelled: string;
  error: string;
  complete: string;
  none: string;
  notConfigured: string;
  spaceToSelectReturn: string;
  enterChoice: string;
  invalidChoice: string;
  
  // Language selection
  selectScriptLang: string;
  selectConfigLang: string;
  selectAiOutputLang: string;
  aiOutputLangHint: string;
  enterCustomLanguage: string;
  languageChanged: string;
  configLangHint: {
    'zh-CN': string;
    en: string;
  };
  
  // Installation
  installPrompt: string;
  installing: string;
  installSuccess: string;
  installFailed: string;
  npmNotFound: string;
  
  // Termux specific
  termuxDetected: string;
  termuxInstallHint: string;
  termuxPathInfo: string;
  termuxEnvironmentInfo: string;
  
  // API configuration
  configureApi: string;
  useAuthToken: string;
  authTokenDesc: string;
  useApiKey: string;
  apiKeyDesc: string;
  skipApi: string;
  enterApiUrl: string;
  enterAuthToken: string;
  enterApiKey: string;
  apiConfigSuccess: string;
  
  // API modification
  existingApiConfig: string;
  apiConfigUrl: string;
  apiConfigKey: string;
  apiConfigAuthType: string;
  selectApiAction: string;
  keepExistingConfig: string;
  modifyAllConfig: string;
  modifyPartialConfig: string;
  selectModifyItems: string;
  modifyApiUrl: string;
  modifyApiKey: string;
  modifyAuthType: string;
  continueModification: string;
  modificationSaved: string;
  enterNewApiUrl: string;
  enterNewApiKey: string;
  selectNewAuthType: string;
  
  // API validation
  apiKeyValidation: {
    empty: string;
    example: string;
  };
  urlRequired: string;
  invalidUrl: string;
  keyRequired: string;
  invalidKeyFormat: string;
  
  // Configuration
  existingConfig: string;
  backupAndOverwrite: string;
  updateDocsOnly: string;
  mergeConfig: string;
  backupSuccess: string;
  copying: string;
  configSuccess: string;
  noExistingConfig: string;
  updatingPrompts: string;
  updateConfigLangPrompt: string;
  updateConfigLangChoice: {
    'zh-CN': string;
    en: string;
  };
  
  // MCP services
  configureMcp: string;
  selectMcpServices: string;
  allServices: string;
  mcpServiceInstalled: string;
  enterExaApiKey: string;
  skipMcp: string;
  mcpConfigSuccess: string;
  mcpBackupSuccess: string;
  fixWindowsMcp: string;
  fixWindowsMcpDesc: string;
  windowsMcpFixed: string;
  configureMcpServices: string;
  selectMcpOption: string;
  
  // Windows specific
  windowsDetected: string;
  
  // Menu
  selectFunction: string;
  returnToMenu: string;
  goodbye: string;
  menuOptions: {
    fullInit: string;
    importWorkflow: string;
    configureApi: string;
    configureMcp: string;
    configureModel: string;
    configureAiMemory: string;
    configureEnvPermission: string;
    installBmad: string;
    clearCache: string;
    changeLanguage: string;
    exit: string;
  };
  menuDescriptions: {
    fullInit: string;
    importWorkflow: string;
    configureApi: string;
    configureMcp: string;
    configureModel: string;
    configureAiMemory: string;
    configureEnvPermission: string;
    installBmad: string;
    clearCache: string;
    changeLanguage: string;
  };
  
  // Model configuration
  selectDefaultModel: string;
  modelConfigSuccess: string;
  
  // AI memory configuration
  selectMemoryOption: string;
  configureAiLanguage: string;
  configureAiPersonality: string;
  aiLanguageConfigured: string;
  
  // AI personality
  selectAiPersonality: string;
  customPersonalityHint: string;
  enterCustomPersonality: string;
  personalityConfigured: string;
  existingPersonality: string;
  currentPersonality: string;
  modifyPersonality: string;
  keepPersonality: string;
  directiveCannotBeEmpty: string;
  languageRequired: string;
  
  // Cache
  confirmClearCache: string;
  cacheCleared: string;
  noCacheFound: string;
  
  // Environment and permissions
  selectEnvPermissionOption: string;
  importRecommendedEnv: string;
  importRecommendedEnvDesc: string;
  importRecommendedPermissions: string;
  importRecommendedPermissionsDesc: string;
  openSettingsJson: string;
  openSettingsJsonDesc: string;
  envImportSuccess: string;
  permissionsImportSuccess: string;
  openingSettingsJson: string;
  
  // CLI options
  runFullInit: string;
  forceOverwrite: string;
  initClaudeConfig: string;
  updatePromptsOnly: string;
  
  // Workflow selection
  selectWorkflowType: string;
  workflowOption: {
    featPlanUx: string;
    sixStepsWorkflow: string;
    bmadWorkflow: string;
  };
  
  // BMAD workflow
  bmadInitPrompt: string;
  bmadInstallSuccess: string;
  
  // Workflow installation
  installingWorkflow: string;
  installedCommand: string;
  installedAgent: string;
  failedToInstallCommand: string;
  failedToInstallAgent: string;
  workflowInstallSuccess: string;
  workflowInstallError: string;
  cleaningOldFiles: string;
  removedOldFile: string;
  
  // BMad workflow
  installingBmadWorkflow: string;
  bmadWorkflowInstalled: string;
  bmadWorkflowFailed: string;
  installingAgent: string;
  agentInstalled: string;
  agentFailed: string;
  selectBmadOption: string;
  confirmInstallBmad: string;
  bmadInstallComplete: string;
  checkingBmadDependencies: string;
  bmadDependenciesMet: string;
  bmadDependenciesMissing: string;
  runningBmadCommand: string;
  bmadCommandSuccess: string;
  bmadCommandFailed: string;
  configuringBmad: string;
  bmadConfigured: string;
  bmadConfigFailed: string;
  
  // Error messages
  failedToSetOnboarding: string;
  failedToWriteMcpConfig: string;
  templateDirNotFound: string;
  failedToReadTemplateSettings: string;
  failedToMergeSettings: string;
  preservingExistingSettings: string;
  failedToReadFile: string;
  failedToWriteFile: string;
  failedToCopyFile: string;
  failedToRemoveFile: string;
  failedToReadDirectory: string;
  failedToGetStats: string;
  sourceDirNotExist: string;
  memoryDirNotFound: string;
  invalidConfiguration: string;
  failedToParseJson: string;
  failedToBackupConfig: string;
  invalidEnvConfig: string;
  invalidApiUrl: string;
  invalidApiKey: string;
  invalidAuthToken: string;
  invalidPermissionsConfig: string;
  invalidPermissionsAllow: string;
  failedToAddOnboardingFlag: string;
  failedToApplyPersonality: string;
}

export interface McpServiceTranslation {
  name: string;
  description: string;
  apiKeyPrompt?: string;
}

export interface McpServicesTranslations {
  [serviceId: string]: McpServiceTranslation;
}