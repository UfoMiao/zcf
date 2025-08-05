import prompts from '@posva/prompts';
import ansis from 'ansis';
import { existsSync, unlinkSync } from 'node:fs';
import type { SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N, LANG_LABELS, MCP_SERVICES, SETTINGS_FILE, SUPPORTED_LANGS, ZCF_CONFIG_FILE } from '../constants';
import type { McpServerConfig } from '../types';
import { 
  applyAiLanguageDirective, 
  backupExistingConfig, 
  configureApi, 
  copyConfigFiles, 
  ensureClaudeDir,
  updateDefaultModel
} from './config';
import { installClaudeCode, isClaudeCodeInstalled } from './installer';
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
import { updatePromptOnly } from '../commands/init';

// Helper function to handle cancelled operations
function handleCancellation(scriptLang: SupportedLang): void {
  console.log(ansis.yellow(I18N[scriptLang].cancelled));
}

// Full initialization (current init command logic)
export async function fullInitFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  // Select config language
  const configLangResponse = await prompts({
    type: 'select',
    name: 'lang',
    message: i18n.selectConfigLang,
    choices: SUPPORTED_LANGS.map((l) => ({
      title: `${LANG_LABELS[l]} - ${i18n.configLangHint[l]}`,
      value: l,
    })),
  });
  
  if (!configLangResponse.lang) {
    handleCancellation(scriptLang);
    return;
  }
  
  const configLang = configLangResponse.lang as SupportedLang;
  
  // Install Claude Code if needed
  const installed = await isClaudeCodeInstalled();
  if (!installed) {
    const response = await prompts({
      type: 'confirm',
      name: 'shouldInstall',
      message: i18n.installPrompt,
      initial: true,
    });

    if (response.shouldInstall) {
      await installClaudeCode(scriptLang);
    }
  } else {
    console.log(ansis.green(`✔ ${i18n.installSuccess}`));
  }
  
  // Handle existing config
  ensureClaudeDir();
  if (existsSync(SETTINGS_FILE)) {
    const backupDir = backupExistingConfig();
    if (backupDir) {
      console.log(ansis.gray(`✔ ${i18n.backupSuccess}: ${backupDir}`));
    }
  }
  
  // Copy config files
  copyConfigFiles(configLang, false);
  
  // Configure API
  await configureApiFeature(scriptLang);
  
  // Configure MCP
  await configureMcpFeature(scriptLang);
  
  // Apply AI language
  const zcfConfig = readZcfConfig();
  const aiOutputLang = await resolveAiOutputLanguage(scriptLang, undefined, zcfConfig);
  applyAiLanguageDirective(aiOutputLang);
  
  // Save config
  updateZcfConfig({
    preferredLang: scriptLang,
    aiOutputLang: aiOutputLang,
  });
  
  console.log(ansis.green(`✔ ${i18n.configSuccess} ${CLAUDE_DIR}`));
  console.log('\n' + ansis.cyan(i18n.complete));
}

// Import workflow only
export async function importWorkflowFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  if (!existsSync(SETTINGS_FILE)) {
    console.log(ansis.yellow(i18n.noExistingConfig));
    return;
  }
  
  const configLangResponse = await prompts({
    type: 'select',
    name: 'lang',
    message: i18n.selectConfigLang,
    choices: SUPPORTED_LANGS.map((l) => ({
      title: `${LANG_LABELS[l]} - ${i18n.configLangHint[l]}`,
      value: l,
    })),
  });
  
  if (!configLangResponse.lang) {
    handleCancellation(scriptLang);
    return;
  }
  
  const configLang = configLangResponse.lang as SupportedLang;
  const zcfConfig = readZcfConfig();
  const aiOutputLang = await resolveAiOutputLanguage(scriptLang, undefined, zcfConfig);
  
  await updatePromptOnly(configLang, scriptLang, aiOutputLang);
  
  updateZcfConfig({
    preferredLang: scriptLang,
    aiOutputLang: aiOutputLang,
  });
}

// Configure API
export async function configureApiFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  const apiResponse = await prompts({
    type: 'select',
    name: 'apiChoice',
    message: i18n.configureApi,
    choices: [
      { 
        title: i18n.useAuthToken, 
        value: 'auth_token',
        description: ansis.gray(i18n.authTokenDesc)
      },
      { 
        title: i18n.useApiKey, 
        value: 'api_key',
        description: ansis.gray(i18n.apiKeyDesc)
      },
      { 
        title: i18n.skipApi, 
        value: 'skip'
      },
    ],
  });
  
  if (!apiResponse.apiChoice || apiResponse.apiChoice === 'skip') {
    return;
  }
  
  const apiChoice = apiResponse.apiChoice;
  
  const urlResponse = await prompts({
    type: 'text',
    name: 'url',
    message: i18n.enterApiUrl,
    validate: (value) => {
      if (!value) return 'URL is required';
      try {
        new URL(value);
        return true;
      } catch {
        return 'Invalid URL';
      }
    },
  });
  
  if (!urlResponse.url) {
    handleCancellation(scriptLang);
    return;
  }
  
  const keyMessage = apiChoice === 'auth_token' ? i18n.enterAuthToken : i18n.enterApiKey;
  const keyResponse = await prompts({
    type: 'text',
    name: 'key',
    message: keyMessage,
    validate: (value) => {
      if (!value) {
        return `${apiChoice === 'auth_token' ? 'Auth Token' : 'API Key'} is required`;
      }
      
      const validation = validateApiKey(value, scriptLang);
      if (!validation.isValid) {
        return validation.error || 'Invalid API Key format';
      }
      
      return true;
    },
  });
  
  if (!keyResponse.key) {
    handleCancellation(scriptLang);
    return;
  }
  
  const apiConfig = { url: urlResponse.url, key: keyResponse.key, authType: apiChoice };
  const configuredApi = configureApi(apiConfig);
  
  if (configuredApi) {
    console.log(ansis.green(`✔ ${i18n.apiConfigSuccess}`));
    console.log(ansis.gray(`  URL: ${configuredApi.url}`));
    console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`));
  }
}

// Configure MCP
export async function configureMcpFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  // Check if Windows needs fix
  if (isWindows()) {
    const fixResponse = await prompts({
      type: 'confirm',
      name: 'fixWindows',
      message: i18n.fixWindowsMcp || 'Fix Windows MCP configuration?',
      initial: true
    });
    
    if (fixResponse.fixWindows) {
      const existingConfig = readMcpConfig() || { mcpServers: {} };
      const fixedConfig = fixWindowsMcpConfig(existingConfig);
      writeMcpConfig(fixedConfig);
      console.log(ansis.green(`✔ ${i18n.windowsMcpFixed || 'Windows MCP configuration fixed'}`));
    }
  }
  
  // Show MCP services selection
  const choices = [
    {
      title: ansis.bold(i18n.allServices),
      value: 'ALL',
      selected: false,
    },
    ...MCP_SERVICES.map((service) => ({
      title: `${service.name[scriptLang]} - ${ansis.gray(service.description[scriptLang])}`,
      value: service.id,
      selected: false,
    })),
  ];

  const selectedResponse = await prompts({
    type: 'multiselect',
    name: 'services',
    message: i18n.selectMcpServices,
    choices,
    instructions: false,
    hint: '- Space to select. Return to submit',
  });

  if (!selectedResponse.services) {
    return;
  }

  let selectedServices = selectedResponse.services || [];
  if (selectedServices.includes('ALL')) {
    selectedServices = MCP_SERVICES.map((s) => s.id);
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
        const apiKeyResponse = await prompts({
          type: 'text',
          name: 'apiKey',
          message: service.apiKeyPrompt![scriptLang],
          validate: (value) => !!value || 'API Key is required',
        });

        if (apiKeyResponse.apiKey) {
          config = buildMcpServerConfig(service.config, apiKeyResponse.apiKey, service.apiKeyPlaceholder);
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
  
  const modelResponse = await prompts({
    type: 'select',
    name: 'model',
    message: i18n.selectDefaultModel || 'Select default model',
    choices: [
      { title: 'Opus', value: 'opus' as const },
      { title: 'Sonnet', value: 'sonnet' as const },
    ],
  });
  
  if (!modelResponse.model) {
    handleCancellation(scriptLang);
    return;
  }
  
  updateDefaultModel(modelResponse.model);
  console.log(ansis.green(`✔ ${i18n.modelConfigSuccess || 'Default model configured'}`));
}

// Configure AI memory
export async function configureAiMemoryFeature(scriptLang: SupportedLang) {
  const i18n = I18N[scriptLang];
  
  const memoryResponse = await prompts({
    type: 'select',
    name: 'option',
    message: i18n.selectMemoryOption || 'Select configuration option',
    choices: [
      { 
        title: i18n.configureAiLanguage || 'Configure AI output language',
        value: 'language'
      },
      { 
        title: i18n.configureAiPersonality || 'Configure AI personality',
        value: 'personality'
      },
    ],
  });
  
  if (!memoryResponse.option) {
    return;
  }
  
  if (memoryResponse.option === 'language') {
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
  
  const confirmResponse = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: i18n.confirmClearCache || 'Clear all ZCF preferences cache?',
    initial: false
  });
  
  if (!confirmResponse.confirm) {
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
  
  const langResponse = await prompts({
    type: 'select',
    name: 'lang',
    message: i18n.selectScriptLang,
    choices: SUPPORTED_LANGS.map((l) => ({
      title: LANG_LABELS[l],
      value: l,
    })),
    initial: SUPPORTED_LANGS.indexOf(currentLang)
  });
  
  if (!langResponse.lang) {
    return currentLang;
  }
  
  updateZcfConfig({ preferredLang: langResponse.lang });
  console.log(ansis.green(`✔ ${I18N[langResponse.lang as SupportedLang].languageChanged || 'Language changed'}`));
  
  return langResponse.lang;
}