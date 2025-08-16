export type SupportedLang = 'zh-CN' | 'en';

// Module-specific translation interfaces
export interface CommonTranslations {
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
  goodbye: string;
  returnToMenu: string;
  back: string;
}

export interface LanguageTranslations {
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
}

export interface InstallationTranslations {
  installPrompt: string;
  installing: string;
  installSuccess: string;
  alreadyInstalled: string;
  installFailed: string;
  npmNotFound: string;
  termuxDetected: string;
  termuxInstallHint: string;
  termuxPathInfo: string;
  termuxEnvironmentInfo: string;
  windowsDetected: string;
}

export interface ApiTranslations {
  configureApi: string;
  useAuthToken: string;
  authTokenDesc: string;
  useApiKey: string;
  apiKeyDesc: string;
  useCcrProxy: string;
  ccrProxyDesc: string;
  skipApi: string;
  enterApiUrl: string;
  enterAuthToken: string;
  enterApiKey: string;
  apiConfigSuccess: string;
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
  apiKeyValidation: {
    empty: string;
    example: string;
  };
  urlRequired: string;
  invalidUrl: string;
  keyRequired: string;
  invalidKeyFormat: string;
}

export interface BmadTranslations {
  description: string;
  directoryOption: string;
  forceOption: string;
  versionOption: string;
  checkingExisting: string;
  alreadyInstalled: string;
  existingAction: string;
  actionUpdate: string;
  actionReinstall: string;
  actionSkip: string;
  installationSkipped: string;
  installing: string;
  installSuccess: string;
  installFailed: string;
  installError: string;
  nextSteps: string;
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
}

export interface WorkflowTranslations {
  selectWorkflow: string;
  selectedWorkflows: string;
  installingWorkflow: string;
  workflowInstalled: string;
  workflowFailed: string;
  cleaningOldFiles: string;
  oldFilesCleaned: string;
  selectWorkflowPrompt: string;
  basePrompts: string;
  basePromptsDesc: string;
  commonCommands: string;
  commonCommandsDesc: string;
  workflowAgents: string;
  workflowAgentsDesc: string;
  bmadWorkflow: string;
  bmadWorkflowDesc: string;
  bmadInitPrompt: string;
  bmadInstallSuccess: string;
  installingWorkflows: string;
  installingSingleWorkflow: string;
  workflowsInstalled: string;
  workflowsFailed: string;
  workflowProgress: string;
}

// Main translation structure with namespaces
export interface TranslationStructure {
  common: any;
  language: any;
  installation: any;
  api: any;
  bmad: any;
  workflow: any;
  configuration: any;
  mcp: any;
  menu: any;
  cli: any;
  errors: any;
  tools: any;
  ccr: any;
  cometix: any;
  updater: any;
}

// For backward compatibility during migration
export interface TranslationKeys extends 
  CommonTranslations,
  LanguageTranslations,
  InstallationTranslations,
  ApiTranslations,
  BmadTranslations,
  WorkflowTranslations {
  // All flattened keys for backward compatibility
  [key: string]: any;
}

// Updater translations
export interface UpdaterTranslations {
  checkingVersion: string;
  checkingTools: string;
  ccrNotInstalled: string;
  ccrUpToDate: string;
  claudeCodeNotInstalled: string;
  claudeCodeUpToDate: string;
  cometixLineNotInstalled: string;
  cometixLineUpToDate: string;
  cannotCheckVersion: string;
  currentVersion: string;
  latestVersion: string;
  confirmUpdate: string;
  updateSkipped: string;
  updating: string;
  updateSuccess: string;
  updateFailed: string;
  checkFailed: string;
}

// MCP Services translations (keep separate)
export interface McpServicesTranslations {
  [key: string]: {
    name: string;
    description: string;
    apiKeyPrompt?: string;
  };
}