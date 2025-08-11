export const ccrMessages = {
  // Installation
  installingCcr: 'Installing Claude Code Router...',
  ccrInstallSuccess: 'Claude Code Router installed successfully',
  ccrInstallFailed: 'Failed to install Claude Code Router',
  ccrAlreadyInstalled: 'Claude Code Router is already installed',
  
  // Configuration
  configureCcr: 'Configure Model Proxy (CCR)',
  useCcrProxy: 'Use CCR Proxy',
  ccrProxyDesc: 'Connect to multiple AI models via Claude Code Router',
  fetchingPresets: 'Fetching provider presets...',
  noPresetsAvailable: 'No presets available',
  selectCcrPreset: 'Select a provider preset:',
  keyRequired: 'API key is required',
  
  // Existing config
  existingCcrConfig: 'Existing CCR configuration found',
  overwriteCcrConfig: 'Backup existing CCR configuration and reconfigure?',
  keepingExistingConfig: 'Keeping existing configuration',
  backupCcrConfig: 'Backing up existing CCR configuration...',
  ccrBackupSuccess: 'CCR configuration backed up to: {path}',
  ccrBackupFailed: 'Failed to backup CCR configuration',
  
  // Model selection
  selectDefaultModelForProvider: 'Select default model for {provider}:',
  enterApiKeyForProvider: 'Enter API key for {provider}:',
  
  // Skip option
  skipOption: 'Skip, configure in CCR manually',
  skipConfiguring: 'Skipping preset configuration, will create empty configuration framework',
  
  // Success/Error messages
  ccrConfigSuccess: 'CCR configuration saved',
  proxyConfigSuccess: 'Proxy settings configured',
  ccrConfigFailed: 'Failed to configure CCR',
  ccrSetupComplete: 'CCR setup complete',
  fetchPresetsError: 'Failed to fetch provider presets',
  failedToStartCcrService: 'Failed to start CCR service',
  errorStartingCcrService: 'Error starting CCR service',
  
  // CCR service status
  ccrRestartSuccess: 'CCR service restarted',
  ccrRestartFailed: 'Failed to restart CCR service',
  
  // Configuration tips
  configTips: 'Configuration Tips',
  useClaudeCommand: 'Use the claude command to start Claude Code (not ccr code)',
  advancedConfigTip: 'You can use the ccr ui command for advanced configuration',
  manualConfigTip: 'After manually modifying the configuration file, run ccr restart to apply changes',
  
  // CCR Menu
  ccrMenuTitle: 'CCR - Claude Code Router Management',
  ccrMenuOptions: {
    initCcr: 'Initialize CCR',
    startUi: 'Start CCR UI',
    checkStatus: 'Check CCR Status',
    restart: 'Restart CCR',
    start: 'Start CCR',
    stop: 'Stop CCR',
    back: 'Back to Main Menu',
  },
  ccrMenuDescriptions: {
    initCcr: 'Install and configure CCR',
    startUi: 'Open web interface to manage CCR',
    checkStatus: 'View CCR service status',
    restart: 'Restart CCR service',
    start: 'Start CCR service',
    stop: 'Stop CCR service',
  },
  
  // Command execution messages
  startingCcrUi: 'Starting CCR UI...',
  ccrUiStarted: 'CCR UI started',
  checkingCcrStatus: 'Checking CCR status...',
  ccrStatusTitle: 'CCR Status:',
  restartingCcr: 'Restarting CCR...',
  ccrRestarted: 'CCR restarted',
  startingCcr: 'Starting CCR...',
  ccrStarted: 'CCR started',
  stoppingCcr: 'Stopping CCR...',
  ccrStopped: 'CCR stopped',
  ccrCommandFailed: 'Failed to execute CCR command',
  
  // Configuration check messages
  ccrNotConfigured: 'CCR is not configured yet. Please initialize CCR first.',
  pleaseInitFirst: 'Please select option 1 to initialize CCR.',
  
  // UI API Key messages
  ccrUiApiKey: 'CCR UI API Key',
  ccrUiApiKeyHint: 'Use this API key to login to CCR UI',
};