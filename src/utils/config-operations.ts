import prompts from '@posva/prompts';
import ansis from 'ansis';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { I18N } from '../constants';
import type { ApiConfig } from '../types/config';
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
} from './config';
import { configureAiPersonality } from './ai-personality';
import { formatApiKeyDisplay, validateApiKey } from './validator';

/**
 * Configure API completely (for new config or full modification)
 */
export async function configureApiCompletely(
  i18n: (typeof I18N)['zh-CN'],
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
          description: ansis.gray(i18n.authTokenDesc),
        },
        {
          title: i18n.useApiKey,
          value: 'api_key',
          description: ansis.gray(i18n.apiKeyDesc),
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
      if (!value) return i18n.urlRequired;
      try {
        new URL(value);
        return true;
      } catch {
        return i18n.invalidUrl;
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
        return i18n.keyRequired;
      }

      const validation = validateApiKey(value, scriptLang);
      if (!validation.isValid) {
        return validation.error || i18n.invalidKeyFormat;
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
  i18n: (typeof I18N)['zh-CN'],
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
        message: i18n.enterNewApiUrl.replace('{url}', currentConfig.url || i18n.none),
        initial: currentConfig.url,
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
      const keyMessage =
        authType === 'auth_token'
          ? i18n.enterNewApiKey.replace('{key}', currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : i18n.none)
          : i18n.enterNewApiKey.replace('{key}', currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : i18n.none);

      const keyResponse = await prompts({
        type: 'text',
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
        message: i18n.selectNewAuthType.replace('{type}', currentConfig.authType || i18n.none),
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

/**
 * Update only prompt/documentation files
 */
export async function updatePromptOnly(
  configLang: SupportedLang,
  scriptLang: SupportedLang,
  aiOutputLang?: AiOutputLanguage | string
) {
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

  // Configure AI personality
  await configureAiPersonality(scriptLang);

  console.log(ansis.green(`✔ ${i18n.configSuccess} ${ensureClaudeDir()}`));
  console.log('\n' + ansis.cyan(i18n.complete));
}