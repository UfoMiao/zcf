import prompts from '@posva/prompts';
import ansis from 'ansis';
import { existsSync } from 'node:fs';
import { version } from '../../package.json';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N, LANG_LABELS, MCP_SERVICES, SETTINGS_FILE, SUPPORTED_LANGS } from '../constants';
import type { McpServerConfig } from '../types';
import { displayBanner } from '../utils/banner';
import { applyAiLanguageDirective, backupExistingConfig, configureApi, copyConfigFiles, ensureClaudeDir, getExistingApiConfig, type ApiConfig } from '../utils/config';
import { installClaudeCode, isClaudeCodeInstalled } from '../utils/installer';
import { addCompletedOnboarding, backupMcpConfig, buildMcpServerConfig, fixWindowsMcpConfig, mergeMcpServers, readMcpConfig, writeMcpConfig } from '../utils/mcp';
import { isWindows } from '../utils/platform';
import { resolveAiOutputLanguage, selectScriptLanguage } from '../utils/prompts';
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config';
import { validateApiKey, formatApiKeyDisplay } from '../utils/validator';

export interface InitOptions {
  lang?: SupportedLang;
  configLang?: SupportedLang;
  aiOutputLang?: AiOutputLanguage | string;
  force?: boolean;
}

/**
 * Configure API completely (for new config or full modification)
 */
async function configureApiCompletely(
  i18n: typeof I18N['zh-CN'], 
  scriptLang: SupportedLang,
  preselectedAuthType?: 'auth_token' | 'api_key'
): Promise<ApiConfig | null> {
  let authType = preselectedAuthType;
  
  if (!authType) {
    const authResponse = await prompts({
      type: 'select',
      name: 'authType',
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
      ],
    });
    
    if (!authResponse.authType) {
      console.log(ansis.yellow(i18n.cancelled));
      return null;
    }
    
    authType = authResponse.authType;
  }
  
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
  
  if (urlResponse.url === undefined) {
    console.log(ansis.yellow(i18n.cancelled));
    return null;
  }
  
  const keyMessage = authType === 'auth_token' ? i18n.enterAuthToken : i18n.enterApiKey;
  const keyResponse = await prompts({
    type: 'text',
    name: 'key',
    message: keyMessage,
    validate: (value) => {
      if (!value) {
        return `${authType === 'auth_token' ? 'Auth Token' : 'API Key'} is required`;
      }
      
      const validation = validateApiKey(value, scriptLang);
      if (!validation.isValid) {
        return validation.error || 'Invalid API Key format';
      }
      
      return true;
    },
  });
  
  if (keyResponse.key === undefined) {
    console.log(ansis.yellow(i18n.cancelled));
    return null;
  }
  
  console.log(ansis.gray(`  API Key: ${formatApiKeyDisplay(keyResponse.key)}`));
  
  return { url: urlResponse.url, key: keyResponse.key, authType };
}

/**
 * Modify API configuration partially
 */
export async function modifyApiConfigPartially(
  existingConfig: ApiConfig,
  i18n: typeof I18N['zh-CN'],
  scriptLang: SupportedLang
): Promise<void> {
  let currentConfig: ApiConfig = { ...existingConfig };
  
  while (true) {
    // Re-read config to ensure we have the latest values
    const latestConfig = getExistingApiConfig();
    if (latestConfig) {
      currentConfig = latestConfig;
    }
    
    const modifyResponse = await prompts({
      type: 'select',
      name: 'item',
      message: i18n.selectModifyItems,
      choices: [
        { title: i18n.modifyApiUrl, value: 'url' },
        { title: i18n.modifyApiKey, value: 'key' },
        { title: i18n.modifyAuthType, value: 'authType' },
      ],
    });
    
    if (!modifyResponse.item) {
      console.log(ansis.yellow(i18n.cancelled));
      return;
    }
    
    if (modifyResponse.item === 'url') {
      const urlResponse = await prompts({
        type: 'text',
        name: 'url',
        message: i18n.enterNewApiUrl.replace('{url}', currentConfig.url || 'None'),
        initial: currentConfig.url,
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
      
      if (urlResponse.url === undefined) {
        continue;
      }
      
      // Update and save immediately
      currentConfig.url = urlResponse.url;
      const savedConfig = configureApi(currentConfig);
      
      if (savedConfig) {
        console.log(ansis.green(`✔ ${i18n.modificationSaved}`));
        console.log(ansis.gray(`  ${i18n.apiConfigUrl}: ${savedConfig.url}`));
      }
    } else if (modifyResponse.item === 'key') {
      const authType = currentConfig.authType || 'auth_token';
      const keyMessage = authType === 'auth_token' 
        ? i18n.enterNewApiKey.replace('{key}', currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : 'None')
        : i18n.enterNewApiKey.replace('{key}', currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : 'None');
        
      const keyResponse = await prompts({
        type: 'text',
        name: 'key',
        message: keyMessage,
        validate: (value) => {
          if (!value) {
            return 'Key is required';
          }
          
          const validation = validateApiKey(value, scriptLang);
          if (!validation.isValid) {
            return validation.error || 'Invalid Key format';
          }
          
          return true;
        },
      });
      
      if (keyResponse.key === undefined) {
        continue;
      }
      
      // Update and save immediately
      currentConfig.key = keyResponse.key;
      const savedConfig = configureApi(currentConfig);
      
      if (savedConfig) {
        console.log(ansis.green(`✔ ${i18n.modificationSaved}`));
        console.log(ansis.gray(`  ${i18n.apiConfigKey}: ${formatApiKeyDisplay(savedConfig.key)}`));
      }
    } else if (modifyResponse.item === 'authType') {
      const authResponse = await prompts({
        type: 'select',
        name: 'authType',
        message: i18n.selectNewAuthType.replace('{type}', currentConfig.authType || 'None'),
        choices: [
          { title: 'Auth Token (OAuth)', value: 'auth_token' },
          { title: 'API Key', value: 'api_key' },
        ],
        initial: currentConfig.authType === 'api_key' ? 1 : 0,
      });
      
      if (authResponse.authType === undefined) {
        continue;
      }
      
      // Update and save immediately
      currentConfig.authType = authResponse.authType;
      const savedConfig = configureApi(currentConfig);
      
      if (savedConfig) {
        console.log(ansis.green(`✔ ${i18n.modificationSaved}`));
        console.log(ansis.gray(`  ${i18n.apiConfigAuthType}: ${savedConfig.authType}`));
      }
    }
    
    // Ask if user wants to continue modifying
    const continueResponse = await prompts({
      type: 'confirm',
      name: 'continue',
      message: i18n.continueModification,
      initial: true,
    });
    
    if (!continueResponse.continue) {
      break;
    }
  }
}


export async function updatePromptOnly(configLang: SupportedLang, scriptLang: SupportedLang, aiOutputLang?: AiOutputLanguage | string) {
  const i18n = I18N[scriptLang];
  
  // Backup existing config
  const backupDir = backupExistingConfig();
  if (backupDir) {
    console.log(ansis.gray(`✔ ${i18n.backupSuccess}: ${backupDir}`));
  }
  
  // Copy only documentation files
  copyConfigFiles(configLang, true);
  
  // Apply AI language directive if provided
  if (aiOutputLang) {
    applyAiLanguageDirective(aiOutputLang);
  }
  
  console.log(ansis.green(`✔ ${i18n.configSuccess} ${CLAUDE_DIR}`));
  console.log('\n' + ansis.cyan(i18n.complete));
}


export async function init(options: InitOptions = {}) {
  try {
    // Display banner
    displayBanner();
  console.log(ansis.gray(`  Version: ${ansis.cyan(version)}  |  ${ansis.cyan('https://github.com/UfoMiao/zcf')}\n`));

    // Step 1: Select script language
    const scriptLang = await selectScriptLanguage(options.lang);

    const i18n = I18N[scriptLang];

    // Step 2: Select config language
    let configLang = options.configLang;
    if (!configLang) {
      const response = await prompts({
        type: 'select',
        name: 'lang',
        message: i18n.selectConfigLang,
        choices: SUPPORTED_LANGS.map((l) => ({
          title: `${LANG_LABELS[l]} - ${i18n.configLangHint[l]}`,
          value: l,
        })),
      });
      
      if (!response.lang) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }
      
      configLang = response.lang as SupportedLang;
    }

    // Step 3: Select AI output language
    const zcfConfig = readZcfConfig();
    const aiOutputLang = await resolveAiOutputLanguage(scriptLang, options.aiOutputLang, zcfConfig);

    // Step 4: Check and install Claude Code
    const installed = await isClaudeCodeInstalled();
    if (!installed) {
      const response = await prompts({
        type: 'confirm',
        name: 'shouldInstall',
        message: i18n.installPrompt,
        initial: true,
      });

      if (response.shouldInstall === undefined) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }

      if (response.shouldInstall) {
        await installClaudeCode(scriptLang);
      } else {
        console.log(ansis.yellow(i18n.skip));
      }
    } else {
      console.log(ansis.green(`✔ ${i18n.installSuccess}`));
    }

    // Step 5: Handle existing config
    ensureClaudeDir();
    let onlyUpdateDocs = false;
    let action = 'new'; // default action for new installation

    if (existsSync(SETTINGS_FILE) && !options.force) {
      const actionResponse = await prompts({
        type: 'select',
        name: 'action',
        message: i18n.existingConfig,
        choices: [
          { title: i18n.backupAndOverwrite, value: 'backup' },
          { title: i18n.updateDocsOnly, value: 'docs-only' },
          { title: i18n.mergeConfig, value: 'merge' },
          { title: i18n.skip, value: 'skip' },
        ],
      });
      
      if (!actionResponse.action) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }
      
      action = actionResponse.action;

      if (action === 'skip') {
        console.log(ansis.yellow(i18n.skip));
        return; // Exit early if user chooses to skip
      }

      if (action === 'docs-only') {
        onlyUpdateDocs = true;
      }
    }

    // Step 6: Configure API (skip if only updating docs or if user chose to skip)
    let apiConfig = null;
    const isNewInstall = !existsSync(SETTINGS_FILE);
    if (!onlyUpdateDocs && (isNewInstall || action === 'backup' || action === 'merge')) {
      // Check for existing API configuration
      const existingApiConfig = getExistingApiConfig();
      
      if (existingApiConfig) {
        // Display existing configuration
        console.log('\n' + ansis.blue(`ℹ ${i18n.existingApiConfig}`));
        console.log(ansis.gray(`  ${i18n.apiConfigUrl}: ${existingApiConfig.url || 'Not configured'}`));
        console.log(ansis.gray(`  ${i18n.apiConfigKey}: ${existingApiConfig.key ? formatApiKeyDisplay(existingApiConfig.key) : 'Not configured'}`));
        console.log(ansis.gray(`  ${i18n.apiConfigAuthType}: ${existingApiConfig.authType || 'Not configured'}\n`));
        
        // Ask user what to do with existing config
        const actionResponse = await prompts({
          type: 'select',
          name: 'action',
          message: i18n.selectApiAction,
          choices: [
            { title: i18n.keepExistingConfig, value: 'keep' },
            { title: i18n.modifyAllConfig, value: 'modify-all' },
            { title: i18n.modifyPartialConfig, value: 'modify-partial' },
            { title: i18n.skipApi, value: 'skip' },
          ],
        });
        
        if (!actionResponse.action) {
          console.log(ansis.yellow(i18n.cancelled));
          process.exit(0);
        }
        
        if (actionResponse.action === 'keep' || actionResponse.action === 'skip') {
          // Keep existing config, no changes needed
          apiConfig = null;
        } else if (actionResponse.action === 'modify-partial') {
          // Handle partial modification
          await modifyApiConfigPartially(existingApiConfig, i18n, scriptLang);
          apiConfig = null; // No need to configure again
        } else if (actionResponse.action === 'modify-all') {
          // Proceed with full configuration
          apiConfig = await configureApiCompletely(i18n, scriptLang);
        }
      } else {
        // No existing config, proceed with normal flow
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
        
        if (!apiResponse.apiChoice) {
          console.log(ansis.yellow(i18n.cancelled));
          process.exit(0);
        }
        
        if (apiResponse.apiChoice !== 'skip') {
          apiConfig = await configureApiCompletely(i18n, scriptLang, apiResponse.apiChoice);
        }
      }
    }

    // Step 7: Execute the chosen action
    if (action === 'backup') {
      const backupDir = backupExistingConfig();
      if (backupDir) {
        console.log(ansis.gray(`✔ ${i18n.backupSuccess}: ${backupDir}`));
      }
      copyConfigFiles(configLang, false);
    } else if (action === 'docs-only') {
      const backupDir = backupExistingConfig();
      if (backupDir) {
        console.log(ansis.gray(`✔ ${i18n.backupSuccess}: ${backupDir}`));
      }
      copyConfigFiles(configLang, true);
    } else if (action === 'merge') {
      const backupDir = backupExistingConfig();
      if (backupDir) {
        console.log(ansis.gray(`✔ ${i18n.backupSuccess}: ${backupDir}`));
      }
      copyConfigFiles(configLang, false);
      // Merge will be handled after API config
    } else if (action === 'new') {
      copyConfigFiles(configLang, false);
    }

    // Step 8: Apply language directive to CLAUDE.md
    applyAiLanguageDirective(aiOutputLang);

    // Step 9: Apply API configuration (skip if only updating docs)
    if (apiConfig && !onlyUpdateDocs) {
      const configuredApi = configureApi(apiConfig);
      if (configuredApi) {
        console.log(ansis.green(`✔ ${i18n.apiConfigSuccess}`));
        console.log(ansis.gray(`  URL: ${configuredApi.url}`));
        console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`));
        
        // Add hasCompletedOnboarding flag after successful API configuration
        try {
          addCompletedOnboarding();
        } catch (error) {
          console.error(ansis.red('Failed to set onboarding completion flag:'), error);
        }
      }
    }

    // Step 10: Configure MCP services (skip if only updating docs)
    if (!onlyUpdateDocs) {
      const mcpResponse = await prompts({
        type: 'confirm',
        name: 'shouldConfigureMcp',
        message: i18n.configureMcp,
        initial: true,
      });

      if (mcpResponse.shouldConfigureMcp === undefined) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }

      if (mcpResponse.shouldConfigureMcp) {
        // Show Windows-specific notice
        if (isWindows()) {
          console.log(ansis.blue(`ℹ ${scriptLang === 'zh-CN' ? '检测到 Windows 系统，将自动配置兼容格式' : 'Windows detected, will configure compatible format'}`));
        }
        
        // Create choices array with "All" option first
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

        if (selectedResponse.services === undefined) {
          console.log(ansis.yellow(i18n.cancelled));
          process.exit(0);
        }

        let selectedServices = selectedResponse.services || [];

        // If "ALL" is selected, select all services
        if (selectedServices.includes('ALL')) {
          selectedServices = MCP_SERVICES.map((s) => s.id);
        }

        if (selectedServices.length > 0) {
          // Backup existing MCP config if exists
          const mcpBackupPath = backupMcpConfig();
          if (mcpBackupPath) {
            console.log(ansis.gray(`✔ ${i18n.mcpBackupSuccess}: ${mcpBackupPath}`));
          }

          // Build MCP server configs
          const newServers: Record<string, McpServerConfig> = {};

          for (const serviceId of selectedServices) {
            const service = MCP_SERVICES.find((s) => s.id === serviceId);
            if (!service) continue;

            let config = service.config;

            // Handle services that require API key
            if (service.requiresApiKey) {
              const apiKeyResponse = await prompts({
                type: 'text',
                name: 'apiKey',
                message: service.apiKeyPrompt![scriptLang],
                validate: (value) => !!value || 'API Key is required',
              });

              if (apiKeyResponse.apiKey === undefined) {
                console.log(ansis.yellow(`${i18n.skip}: ${service.name[scriptLang]}`));
                continue;
              }

              if (apiKeyResponse.apiKey) {
                config = buildMcpServerConfig(service.config, apiKeyResponse.apiKey, service.apiKeyPlaceholder);
              } else {
                // Skip this service if no API key provided
                continue;
              }
            }

            newServers[service.id] = config;
          }

          // Merge with existing config
          const existingConfig = readMcpConfig();
          let mergedConfig = mergeMcpServers(existingConfig, newServers);
          
          // Fix Windows config if needed
          mergedConfig = fixWindowsMcpConfig(mergedConfig);

          // Write the config with error handling
          try {
            writeMcpConfig(mergedConfig);
            console.log(ansis.green(`✔ ${i18n.mcpConfigSuccess}`));
          } catch (error) {
            console.error(ansis.red(`Failed to write MCP config: ${error}`));
          }
        }
      }
    }

    // Step 11: Save zcf config
    updateZcfConfig({
      version,
      preferredLang: scriptLang,
      aiOutputLang: aiOutputLang,
    });

    // Step 12: Success message
    console.log(ansis.green(`✔ ${i18n.configSuccess} ${CLAUDE_DIR}`));
    console.log('\n' + ansis.cyan(i18n.complete));
  } catch (error) {
    console.error(ansis.red(`${I18N[options.lang || 'en'].error}:`), error);
    process.exit(1);
  }
}
