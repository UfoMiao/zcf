export const api = {
  // Basic API configuration
  configureApi: 'Select API authentication method',
  useAuthToken: 'Use Auth Token (OAuth authentication)',
  authTokenDesc: 'For tokens obtained via OAuth or browser login',
  useApiKey: 'Use API Key (Key authentication)',
  apiKeyDesc: 'For API keys from Anthropic Console',
  skipApi: 'Skip (configure manually later)',
  enterApiUrl: 'Enter API URL',
  enterAuthToken: 'Enter Auth Token',
  enterApiKey: 'Enter API Key',
  apiConfigSuccess: 'API configured',
  
  // API modification
  existingApiConfig: 'Existing API configuration detected:',
  apiConfigUrl: 'URL',
  apiConfigKey: 'Key',
  apiConfigAuthType: 'Auth Type',
  selectApiAction: 'Select API processing operation',
  keepExistingConfig: 'Keep existing configuration',
  modifyAllConfig: 'Modify all configuration',
  modifyPartialConfig: 'Modify partial configuration',
  selectModifyItems: 'Select items to modify',
  modifyApiUrl: 'Modify API URL',
  modifyApiKey: 'Modify API Key',
  modifyAuthType: 'Modify auth type',
  continueModification: 'Continue modifying other configurations?',
  modificationSaved: 'Configuration saved',
  enterNewApiUrl: 'Enter new API URL (current: {url})',
  enterNewApiKey: 'Enter new API Key (current: {key})',
  selectNewAuthType: 'Select new auth type (current: {type})',
  
  // API validation
  apiKeyValidation: {
    empty: 'API Key cannot be empty',
    example: 'Example format: sk-abcdef123456_789xyz',
  },
  urlRequired: 'URL is required',
  invalidUrl: 'Invalid URL',
  keyRequired: 'Key is required',
  invalidKeyFormat: 'Invalid key format',
};