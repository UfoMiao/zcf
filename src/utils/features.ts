import inquirer from 'inquirer';
import ansis from 'ansis';
import { existsSync, unlinkSync } from 'node:fs';
import type { SupportedLang } from '../constants';
import { LANG_LABELS, MCP_SERVICES, SUPPORTED_LANGS, ZCF_CONFIG_FILE } from '../constants';
import { getTranslation } from '../i18n';
import { addNumbersToChoices } from './prompt-helpers';
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
  const i18n = getTranslation(scriptLang);
  console.log(ansis.yellow(i18n.common.cancelled));
}



// Configure API
export async function configureApiFeature(scriptLang: SupportedLang) {
  const i18n = getTranslation(scriptLang);
  
  // Check for existing API configuration
  const existingApiConfig = getExistingApiConfig();
  
  if (existingApiConfig) {
    // Display existing configuration
    console.log('\n' + ansis.blue(`ℹ ${i18n.api.existingApiConfig}`));
    console.log(ansis.gray(`  ${i18n.api.apiConfigUrl}: ${existingApiConfig.url || i18n.common.notConfigured}`));
    console.log(ansis.gray(`  ${i18n.api.apiConfigKey}: ${existingApiConfig.key ? formatApiKeyDisplay(existingApiConfig.key) : i18n.common.notConfigured}`));
    console.log(ansis.gray(`  ${i18n.api.apiConfigAuthType}: ${existingApiConfig.authType || i18n.common.notConfigured}\n`));
    
    // Ask user what to do with existing config
    const { action } = await inquirer.prompt<{ action: string }>({
      type: 'list',
      name: 'action',
      message: i18n.api.selectApiAction,
      choices: addNumbersToChoices([
        { name: i18n.api.keepExistingConfig, value: 'keep' },
        { name: i18n.api.modifyAllConfig, value: 'modify-all' },
        { name: i18n.api.modifyPartialConfig, value: 'modify-partial' },
        { name: i18n.api.useCcrProxy, value: 'use-ccr' },
      ]),
    });
    
    if (!action) {
      handleCancellation(scriptLang);
      return;
    }
    
    if (action === 'keep') {
      console.log(ansis.green(`✔ ${i18n.api.keepExistingConfig}`));
      // Ensure onboarding flag is set for existing API config
      try {
        addCompletedOnboarding();
      } catch (error) {
        console.error(ansis.red(i18n.configuration.failedToSetOnboarding), error);
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
        console.log(ansis.yellow(`${i18n.ccr.installingCcr}`));
        await installCcr(scriptLang);
      } else {
        console.log(ansis.green(`✔ ${i18n.ccr.ccrAlreadyInstalled}`));
      }
      
      // Setup CCR configuration
      const ccrConfigured = await setupCcrConfiguration(scriptLang);
      if (ccrConfigured) {
        console.log(ansis.green(`✔ ${i18n.ccr.ccrSetupComplete}`));
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
    message: i18n.api.configureApi,
    choices: addNumbersToChoices([
      { 
        name: `${i18n.api.useAuthToken} - ${ansis.gray(i18n.api.authTokenDesc)}`,
        value: 'auth_token',
        short: i18n.api.useAuthToken
      },
      { 
        name: `${i18n.api.useApiKey} - ${ansis.gray(i18n.api.apiKeyDesc)}`,
        value: 'api_key',
        short: i18n.api.useApiKey
      },
      {
        name: `${i18n.api.useCcrProxy} - ${ansis.gray(i18n.api.ccrProxyDesc)}`,
        value: 'ccr_proxy',
        short: i18n.api.useCcrProxy
      },
      { name: i18n.api.skipApi, value: 'skip' },
    ])
  });
  
  if (!apiChoice || apiChoice === 'skip') {
    return;
  }
  
  // Handle CCR proxy configuration
  if (apiChoice === 'ccr_proxy') {
    const ccrInstalled = await isCcrInstalled();
    if (!ccrInstalled) {
      console.log(ansis.yellow(`${i18n.ccr.installingCcr}`));
      await installCcr(scriptLang);
    } else {
      console.log(ansis.green(`✔ ${i18n.ccr.ccrAlreadyInstalled}`));
    }
    
    // Setup CCR configuration
    const ccrConfigured = await setupCcrConfiguration(scriptLang);
    if (ccrConfigured) {
      console.log(ansis.green(`✔ ${i18n.ccr.ccrSetupComplete}`));
      // addCompletedOnboarding is already called inside setupCcrConfiguration
    }
    return;
  }
  
  
  
  const { url } = await inquirer.prompt<{ url: string }>({
    type: 'input',
    name: 'url',
    message: i18n.api.enterApiUrl,
    validate: (value) => {
      if (!value) return i18n.api.urlRequired;
      try {
        new URL(value);
        return true;
      } catch {
        return i18n.api.invalidUrl;
      }
    },
  });
  
  if (!url) {
    handleCancellation(scriptLang);
    return;
  }
  
  const keyMessage = apiChoice === 'auth_token' ? i18n.api.enterAuthToken : i18n.api.enterApiKey;
  const { key } = await inquirer.prompt<{ key: string }>({
    type: 'input',
    name: 'key',
    message: keyMessage,
    validate: (value) => {
      if (!value) {
        return i18n.api.keyRequired;
      }
      
      const validation = validateApiKey(value, scriptLang);
      if (!validation.isValid) {
        return validation.error || i18n.api.invalidKeyFormat;
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
    console.log(ansis.green(`✔ ${i18n.api.apiConfigSuccess}`));
    console.log(ansis.gray(`  URL: ${configuredApi.url}`));
    console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`));
    // addCompletedOnboarding is already called inside configureApi
  }
}

// Configure MCP
export async function configureMcpFeature(scriptLang: SupportedLang) {
  const i18n = getTranslation(scriptLang);
  
  // Check if Windows needs fix
  if (isWindows()) {
    const { fixWindows } = await inquirer.prompt<{ fixWindows: boolean }>({
      type: 'confirm',
      name: 'fixWindows',
      message: i18n.configuration.fixWindowsMcp || 'Fix Windows MCP configuration?',
      default: true
    });
    
    if (fixWindows) {
      const existingConfig = readMcpConfig() || { mcpServers: {} };
      const fixedConfig = fixWindowsMcpConfig(existingConfig);
      writeMcpConfig(fixedConfig);
      console.log(ansis.green(`✔ Windows MCP configuration fixed`));
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
      console.log(ansis.gray(`✔ ${i18n.mcp.mcpBackupSuccess}: ${mcpBackupPath}`));
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
          validate: (value) => !!value || i18n.api.keyRequired,
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
    console.log(ansis.green(`✔ ${i18n.mcp.mcpConfigSuccess}`));
  }
}

// Configure default model
export async function configureDefaultModelFeature(scriptLang: SupportedLang) {
  // const i18n = getTranslation(scriptLang); // Currently not needed as strings are hardcoded
  
  const { model } = await inquirer.prompt<{ model: 'opus' | 'sonnet' }>({
    type: 'list',
    name: 'model',
    message: 'Select default model',
    choices: addNumbersToChoices([
      { name: 'Opus', value: 'opus' as const },
      { name: 'Sonnet', value: 'sonnet' as const },
    ]),
  });
  
  if (!model) {
    handleCancellation(scriptLang);
    return;
  }
  
  updateDefaultModel(model);
  console.log(ansis.green(`✔ Default model configured`));
}

// Configure AI memory
export async function configureAiMemoryFeature(scriptLang: SupportedLang) {
  const i18n = getTranslation(scriptLang);
  
  const { option } = await inquirer.prompt<{ option: string }>({
    type: 'list',
    name: 'option',
    message: 'Select configuration option',
    choices: addNumbersToChoices([
      { 
        name: i18n.configuration.configureAiLanguage || 'Configure AI output language',
        value: 'language'
      },
      { 
        name: i18n.configuration.configureAiPersonality || 'Configure AI personality',
        value: 'personality'
      },
    ]),
  });
  
  if (!option) {
    return;
  }
  
  if (option === 'language') {
    const zcfConfig = readZcfConfig();
    const aiOutputLang = await resolveAiOutputLanguage(scriptLang, undefined, zcfConfig);
    applyAiLanguageDirective(aiOutputLang);
    updateZcfConfig({ aiOutputLang });
    console.log(ansis.green(`✔ ${i18n.configuration.aiLanguageConfigured || 'AI output language configured'}`));
  } else {
    await configureAiPersonality(scriptLang);
  }
}

// Clear ZCF cache
export async function clearZcfCacheFeature(scriptLang: SupportedLang) {
  const i18n = getTranslation(scriptLang);
  
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: i18n.configuration.confirmClearCache || 'Clear all ZCF preferences cache?',
    default: false
  });
  
  if (!confirm) {
    handleCancellation(scriptLang);
    return;
  }
  
  if (existsSync(ZCF_CONFIG_FILE)) {
    unlinkSync(ZCF_CONFIG_FILE);
    console.log(ansis.green(`✔ ${i18n.configuration.cacheCleared || 'ZCF cache cleared'}`));
  } else {
    console.log(ansis.yellow('No cache found'));
  }
}

// Change script language
export async function changeScriptLanguageFeature(currentLang: SupportedLang): Promise<SupportedLang> {
  const i18n = getTranslation(currentLang);
  
  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: i18n.language.selectScriptLang,
    choices: addNumbersToChoices(SUPPORTED_LANGS.map((l) => ({
      name: LANG_LABELS[l],
      value: l,
    }))),
    default: SUPPORTED_LANGS.indexOf(currentLang)
  });
  
  if (!lang) {
    return currentLang;
  }
  
  updateZcfConfig({ preferredLang: lang });
  const newI18n = getTranslation(lang);
  console.log(ansis.green(`✔ ${newI18n.language.languageChanged || 'Language changed'}`));
  
  return lang;
}

// Configure environment variables and permissions
export async function configureEnvPermissionFeature(scriptLang: SupportedLang) {
  const i18n = getTranslation(scriptLang);
  
  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'list',
    name: 'choice',
    message: i18n.configuration?.selectEnvPermissionOption || 'Select option',
    choices: addNumbersToChoices([
      {
        name: `${i18n.configuration?.importRecommendedEnv || 'Import environment'} ${ansis.gray('- ' + (i18n.configuration?.importRecommendedEnvDesc || 'Import env settings'))}`,
        value: 'env'
      },
      {
        name: `${i18n.configuration?.importRecommendedPermissions || 'Import permissions'} ${ansis.gray('- ' + (i18n.configuration?.importRecommendedPermissionsDesc || 'Import permission settings'))}`,
        value: 'permissions'
      },
      {
        name: `${i18n.configuration?.openSettingsJson || 'Open settings'} ${ansis.gray('- ' + (i18n.configuration?.openSettingsJsonDesc || 'View settings file'))}`,
        value: 'open'
      }
    ])
  });
  
  if (!choice) {
    handleCancellation(scriptLang);
    return;
  }
  
  try {
    switch (choice) {
      case 'env':
        await importRecommendedEnv();
        console.log(ansis.green(`✅ ${i18n.configuration.envImportSuccess}`));
        break;
      case 'permissions':
        await importRecommendedPermissions();
        console.log(ansis.green(`✅ ${i18n.configuration?.permissionsImportSuccess || 'Permissions imported'}`));
        break;
      case 'open':
        console.log(ansis.cyan(i18n.configuration?.openingSettingsJson || 'Opening settings.json...'));
        await openSettingsJson();
        break;
    }
  } catch (error: any) {
    console.error(ansis.red(`${i18n.common.error}: ${error.message}`));
  }
}