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
  restartingCcr: 'Restarting CCR service...',
  checkingCcrStatus: 'Checking CCR service status...',
  ccrRestartSuccess: 'CCR service restarted',
  ccrRestartFailed: 'Failed to restart CCR service',
  
  // Configuration tips
  configTips: 'Configuration Tips',
  useClaudeCommand: 'Use the claude command to start Claude Code (not ccr code)',
  advancedConfigTip: 'You can use the ccr ui command for advanced configuration',
  manualConfigTip: 'After manually modifying the configuration file, run ccr restart to apply changes',
};