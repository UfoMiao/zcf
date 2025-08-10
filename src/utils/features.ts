import inquirer from 'inquirer';
import ansis from 'ansis';
import { existsSync, unlinkSync } from 'node:fs';
import type { SupportedLang } from '../constants';
import { I18N, LANG_LABELS, MCP_SERVICES, SUPPORTED_LANGS, ZCF_CONFIG_FILE } from '../constants';
import type { McpServerConfig } from '../types';
import { 
  applyAiLanguageDirective, 
  configureApi, 
  updateDefaultModel,
  getExistingApiConfig
} from './config';
import { 
  backupMcpConfig, 
  buildMcpServerConfig, 
  fixWindowsMcpConfig, 
  mergeMcpServers, 
  readMcpConfig, 
  writeMcpConfig 
} from './mcp';
import { isWindows } from './platform';
import { resolveAiOutputLanguage } from './prompts';
import { readZcfConfig, updateZcfConfig } from './zcf-config';
import { validateApiKey, formatApiKeyDisplay } from './validator';
import { configureAiPersonality } from './ai-personality';
import { modifyApiConfigPartially } from './config-operations';
import { selectMcpServices } from './mcp-selector';
import { importRecommendedEnv, importRecommendedPermissions, openSettingsJson } from './simple-config';
import { isCcrInstalled, installCcr } from './ccr/installer';
import { setupCcrConfiguration } from './ccr/config';
import { addCompletedOnboarding } from './mcp';

// Helper function to handle cancelled operations
function handleCancellation(scriptLang: SupportedLang): void {
  console.log(ansis.yellow(I18N[scriptLang].cancelled));
}



// Configure API
export async function configureApiFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  // Check for existing API configuration
  const existingApiConfig = getExistingApiConfig();
  
  if (existingApiConfig) {
    // Display existing configuration
    console.log('\n' + ansis.blue(`ℹ ${i18n.existingApiConfig}`));
    console.log(ansis.gray(`  ${i18n.apiConfigUrl}: ${existingApiConfig.url || i18n.notConfigured}`));
    console.log(ansis.gray(`  ${i18n.apiConfigKey}: ${existingApiConfig.key ? formatApiKeyDisplay(existingApiConfig.key) : i18n.notConfigured}`));
    console.log(ansis.gray(`  ${i18n.apiConfigAuthType}: ${existingApiConfig.authType || i18n.notConfigured}\n`));
    
    // Ask user what to do with existing config
    const { action } = await inquirer.prompt<{ action: string }>({
      type: 'list',
      name: 'action',
      message: i18n.selectApiAction,
      choices: [
        { name: i18n.keepExistingConfig, value: 'keep' },
        { name: i18n.modifyAllConfig, value: 'modify-all' },
        { name: i18n.modifyPartialConfig, value: 'modify-partial' },
        { name: i18n.useCcrProxy, value: 'use-ccr' },
      ],
    });
    
    if (!action) {
      handleCancellation(scriptLang);
      return;
    }
    
    if (action === 'keep') {
      console.log(ansis.green(`✔ ${i18n.keepExistingConfig}`));
      // Ensure onboarding flag is set for existing API config
      try {
        addCompletedOnboarding();
      } catch (error) {
        console.error(ansis.red(i18n.failedToSetOnboarding), error);
      }
      return;
    } else if (action === 'modify-partial') {
      // Handle partial modification
      await modifyApiConfigPartially(existingApiConfig, i18n, scriptLang);
      // addCompletedOnboarding is already called inside modifyApiConfigPartially -> configureApi
      return;
    } else if (action === 'use-ccr') {
      // Handle CCR proxy configuration
      const ccrInstalled = await isCcrInstalled();
      if (!ccrInstalled) {
        console.log(ansis.yellow(`${i18n.installingCcr}`));
        await installCcr(scriptLang);
      } else {
        console.log(ansis.green(`✔ ${i18n.ccrAlreadyInstalled}`));
      }
      
      // Setup CCR configuration
      const ccrConfigured = await setupCcrConfiguration(scriptLang);
      if (ccrConfigured) {
        console.log(ansis.green(`✔ ${i18n.ccrSetupComplete}`));
        // addCompletedOnboarding is already called inside setupCcrConfiguration
      }
      return;
    }
    // If 'modify-all', continue to full configuration below
  }
  
  // Full configuration (new or modify-all)
  const { apiChoice } = await inquirer.prompt<{ apiChoice: string }>({
    type: 'list',
    name: 'apiChoice',
    message: i18n.configureApi,
    choices: [
      { 
        name: `${i18n.useAuthToken} - ${ansis.gray(i18n.authTokenDesc)}`,
        value: 'auth_token',
        short: i18n.useAuthToken
      },
      { 
        name: `${i18n.useApiKey} - ${ansis.gray(i18n.apiKeyDesc)}`,
        value: 'api_key',
        short: i18n.useApiKey
      },
      {
        name: `${i18n.useCcrProxy} - ${ansis.gray(i18n.ccrProxyDesc)}`,
        value: 'ccr_proxy',
        short: i18n.useCcrProxy
      },
      { name: i18n.skipApi, value: 'skip' },
    ],
  });
  
  if (!apiChoice || apiChoice === 'skip') {
    return;
  }
  
  // Handle CCR proxy configuration
  if (apiChoice === 'ccr_proxy') {
    const ccrInstalled = await isCcrInstalled();
    if (!ccrInstalled) {
      console.log(ansis.yellow(`${i18n.installingCcr}`));
      await installCcr(scriptLang);
    } else {
      console.log(ansis.green(`✔ ${i18n.ccrAlreadyInstalled}`));
    }
    
    // Setup CCR configuration
    const ccrConfigured = await setupCcrConfiguration(scriptLang);
    if (ccrConfigured) {
      console.log(ansis.green(`✔ ${i18n.ccrSetupComplete}`));
      // addCompletedOnboarding is already called inside setupCcrConfiguration
    }
    return;
  }
  
  
  
  const { url } = await inquirer.prompt<{ url: string }>({
    type: 'input',
    name: 'url',
    message: i18n.enterApiUrl,
    validate: (value) => {
      if (!value) return i18n.urlRequired;
      try {
        new URL(value);
        return true;
      } catch {
        return i18n.invalidUrl;
      }
    },
  });
  
  if (!url) {
    handleCancellation(scriptLang);
    return;
  }
  
  const keyMessage = apiChoice === 'auth_token' ? i18n.enterAuthToken : i18n.enterApiKey;
  const { key } = await inquirer.prompt<{ key: string }>({
    type: 'input',
    name: 'key',
    message: keyMessage,
    validate: (value) => {
      if (!value) {
        return i18n.keyRequired;
      }
      
      const validation = validateApiKey(value, scriptLang);
      if (!validation.isValid) {
        return validation.error || i18n.invalidKeyFormat;
      }
      
      return true;
    },
  });
  
  if (!key) {
    handleCancellation(scriptLang);
    return;
  }
  
  const apiConfig = { url, key, authType: apiChoice as 'auth_token' | 'api_key' };
  const configuredApi = configureApi(apiConfig);
  
  if (configuredApi) {
    console.log(ansis.green(`✔ ${i18n.apiConfigSuccess}`));
    console.log(ansis.gray(`  URL: ${configuredApi.url}`));
    console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`));
    // addCompletedOnboarding is already called inside configureApi
  }
}

// Configure MCP
export async function configureMcpFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  // Check if Windows needs fix
  if (isWindows()) {
    const { fixWindows } = await inquirer.prompt<{ fixWindows: boolean }>({
      type: 'confirm',
      name: 'fixWindows',
      message: i18n.fixWindowsMcp || 'Fix Windows MCP configuration?',
      default: true
    });
    
    if (fixWindows) {
      const existingConfig = readMcpConfig() || { mcpServers: {} };
      const fixedConfig = fixWindowsMcpConfig(existingConfig);
      writeMcpConfig(fixedConfig);
      console.log(ansis.green(`✔ ${i18n.windowsMcpFixed || 'Windows MCP configuration fixed'}`));
    }
  }
  
  // Use common MCP selector
  const selectedServices = await selectMcpServices(scriptLang);
  
  if (!selectedServices) {
    return;
  }

  if (selectedServices.length > 0) {
    const mcpBackupPath = backupMcpConfig();
    if (mcpBackupPath) {
      console.log(ansis.gray(`✔ ${i18n.mcpBackupSuccess}: ${mcpBackupPath}`));
    }

    const newServers: Record<string, McpServerConfig> = {};

    for (const serviceId of selectedServices) {
      const service = MCP_SERVICES.find((s) => s.id === serviceId);
      if (!service) continue;

      let config = service.config;

      if (service.requiresApiKey) {
        const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
          type: 'input',
          name: 'apiKey',
          message: service.apiKeyPrompt![scriptLang],
          validate: (value) => !!value || i18n.keyRequired,
        });

        if (apiKey) {
          config = buildMcpServerConfig(service.config, apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar);
        } else {
          continue;
        }
      }

      newServers[service.id] = config;
    }

    const existingConfig = readMcpConfig();
    let mergedConfig = mergeMcpServers(existingConfig, newServers);
    mergedConfig = fixWindowsMcpConfig(mergedConfig);
    
    writeMcpConfig(mergedConfig);
    console.log(ansis.green(`✔ ${i18n.mcpConfigSuccess}`));
  }
}

// Configure default model
export async function configureDefaultModelFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  const { model } = await inquirer.prompt<{ model: 'opus' | 'sonnet' }>({
    type: 'list',
    name: 'model',
    message: i18n.selectDefaultModel || 'Select default model',
    choices: [
      { name: 'Opus', value: 'opus' as const },
      { name: 'Sonnet', value: 'sonnet' as const },
    ],
  });
  
  if (!model) {
    handleCancellation(scriptLang);
    return;
  }
  
  updateDefaultModel(model);
  console.log(ansis.green(`✔ ${i18n.modelConfigSuccess || 'Default model configured'}`));
}

// Configure AI memory
export async function configureAiMemoryFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  const { option } = await inquirer.prompt<{ option: string }>({
    type: 'list',
    name: 'option',
    message: i18n.selectMemoryOption || 'Select configuration option',
    choices: [
      { 
        name: i18n.configureAiLanguage || 'Configure AI output language',
        value: 'language'
      },
      { 
        name: i18n.configureAiPersonality || 'Configure AI personality',
        value: 'personality'
      },
    ],
  });
  
  if (!option) {
    return;
  }
  
  if (option === 'language') {
    const zcfConfig = readZcfConfig();
    const aiOutputLang = await resolveAiOutputLanguage(scriptLang, undefined, zcfConfig);
    applyAiLanguageDirective(aiOutputLang);
    updateZcfConfig({ aiOutputLang });
    console.log(ansis.green(`✔ ${i18n.aiLanguageConfigured || 'AI output language configured'}`));
  } else {
    await configureAiPersonality(scriptLang);
  }
}

// Clear ZCF cache
export async function clearZcfCacheFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: i18n.confirmClearCache || 'Clear all ZCF preferences cache?',
    default: false
  });
  
  if (!confirm) {
    handleCancellation(scriptLang);
    return;
  }
  
  if (existsSync(ZCF_CONFIG_FILE)) {
    unlinkSync(ZCF_CONFIG_FILE);
    console.log(ansis.green(`✔ ${i18n.cacheCleared || 'ZCF cache cleared'}`));
  } else {
    console.log(ansis.yellow(i18n.noCacheFound || 'No cache found'));
  }
}

// Change script language
export async function changeScriptLanguageFeature(currentLang: SupportedLang): Promise<SupportedLang> {
  const i18n = I18N[currentLang];
  
  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: i18n.selectScriptLang,
    choices: SUPPORTED_LANGS.map((l) => ({
      name: LANG_LABELS[l],
      value: l,
    })),
    default: SUPPORTED_LANGS.indexOf(currentLang)
  });
  
  if (!lang) {
    return currentLang;
  }
  
  updateZcfConfig({ preferredLang: lang });
  console.log(ansis.green(`✔ ${I18N[lang].languageChanged || 'Language changed'}`));
  
  return lang;
}

// Configure environment variables and permissions
export async function configureEnvPermissionFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'list',
    name: 'choice',
    message: i18n.selectEnvPermissionOption,
    choices: [
      {
        name: `${i18n.importRecommendedEnv} ${ansis.gray('- ' + i18n.importRecommendedEnvDesc)}`,
        value: 'env'
      },
      {
        name: `${i18n.importRecommendedPermissions} ${ansis.gray('- ' + i18n.importRecommendedPermissionsDesc)}`,
        value: 'permissions'
      },
      {
        name: `${i18n.openSettingsJson} ${ansis.gray('- ' + i18n.openSettingsJsonDesc)}`,
        value: 'open'
      }
    ]
  });
  
  if (!choice) {
    handleCancellation(scriptLang);
    return;
  }
  
  try {
    switch (choice) {
      case 'env':
        await importRecommendedEnv();
        console.log(ansis.green(`✅ ${i18n.envImportSuccess}`));
        break;
      case 'permissions':
        await importRecommendedPermissions();
        console.log(ansis.green(`✅ ${i18n.permissionsImportSuccess}`));
        break;
      case 'open':
        console.log(ansis.cyan(i18n.openingSettingsJson));
        await openSettingsJson();
        break;
    }
  } catch (error: any) {
    console.error(ansis.red(`${i18n.error}: ${error.message}`));
  }
}