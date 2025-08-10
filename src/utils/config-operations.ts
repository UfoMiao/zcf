import inquirer from 'inquirer';
import ansis from 'ansis';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N } from '../constants';
import type { ApiConfig } from '../types/config';
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
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
    const { authType: selectedAuthType } = await inquirer.prompt<{ authType: 'auth_token' | 'api_key' }>({
      type: 'list',
      name: 'authType',
      message: i18n.configureApi,
      choices: [
        {
          name: `${i18n.useAuthToken} - ${ansis.gray(i18n.authTokenDesc)}`,
          value: 'auth_token',
          short: i18n.useAuthToken,
        },
        {
          name: `${i18n.useApiKey} - ${ansis.gray(i18n.apiKeyDesc)}`,
          value: 'api_key',
          short: i18n.useApiKey,
        },
      ],
    });

    if (!selectedAuthType) {
      console.log(ansis.yellow(i18n.cancelled));
      return null;
    }

    authType = selectedAuthType;
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

  if (url === undefined) {
    console.log(ansis.yellow(i18n.cancelled));
    return null;
  }

  const keyMessage = authType === 'auth_token' ? i18n.enterAuthToken : i18n.enterApiKey;
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

  if (key === undefined) {
    console.log(ansis.yellow(i18n.cancelled));
    return null;
  }

  console.log(ansis.gray(`  API Key: ${formatApiKeyDisplay(key)}`));

  return { url, key, authType };
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

  // Re-read config to ensure we have the latest values
  const latestConfig = getExistingApiConfig();
  if (latestConfig) {
    currentConfig = latestConfig;
  }

  const { item } = await inquirer.prompt<{ item: 'url' | 'key' | 'authType' }>({
    type: 'list',
    name: 'item',
    message: i18n.selectModifyItems,
    choices: [
      { name: i18n.modifyApiUrl, value: 'url' },
      { name: i18n.modifyApiKey, value: 'key' },
      { name: i18n.modifyAuthType, value: 'authType' },
    ],
  });

  if (!item) {
    console.log(ansis.yellow(i18n.cancelled));
    return;
  }

  if (item === 'url') {
    const { url } = await inquirer.prompt<{ url: string }>({
      type: 'input',
      name: 'url',
      message: i18n.enterNewApiUrl.replace('{url}', currentConfig.url || i18n.none),
      default: currentConfig.url,
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

    if (url === undefined) {
      console.log(ansis.yellow(i18n.cancelled));
      return;
    }

    // Update and save immediately
    currentConfig.url = url;
    const savedConfig = configureApi(currentConfig);

    if (savedConfig) {
      console.log(ansis.green(`✔ ${i18n.modificationSaved}`));
      console.log(ansis.gray(`  ${i18n.apiConfigUrl}: ${savedConfig.url}`));
      // Note: addCompletedOnboarding is already called inside configureApi
    }
  } else if (item === 'key') {
    const authType = currentConfig.authType || 'auth_token';
    const keyMessage =
      authType === 'auth_token'
        ? i18n.enterNewApiKey.replace('{key}', currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : i18n.none)
        : i18n.enterNewApiKey.replace('{key}', currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : i18n.none);

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

    if (key === undefined) {
      console.log(ansis.yellow(i18n.cancelled));
      return;
    }

    // Update and save immediately
    currentConfig.key = key;
    const savedConfig = configureApi(currentConfig);

    if (savedConfig) {
      console.log(ansis.green(`✔ ${i18n.modificationSaved}`));
      console.log(ansis.gray(`  ${i18n.apiConfigKey}: ${formatApiKeyDisplay(savedConfig.key)}`));
      // Note: addCompletedOnboarding is already called inside configureApi
    }
  } else if (item === 'authType') {
    const { authType } = await inquirer.prompt<{ authType: 'auth_token' | 'api_key' }>({
      type: 'list',
      name: 'authType',
      message: i18n.selectNewAuthType.replace('{type}', currentConfig.authType || i18n.none),
      choices: [
        { name: 'Auth Token (OAuth)', value: 'auth_token' },
        { name: 'API Key', value: 'api_key' },
      ],
      default: currentConfig.authType === 'api_key' ? 1 : 0,
    });

    if (authType === undefined) {
      console.log(ansis.yellow(i18n.cancelled));
      return;
    }

    // Update and save immediately
    currentConfig.authType = authType;
    const savedConfig = configureApi(currentConfig);

    if (savedConfig) {
      console.log(ansis.green(`✔ ${i18n.modificationSaved}`));
      console.log(ansis.gray(`  ${i18n.apiConfigAuthType}: ${savedConfig.authType}`));
      // Note: addCompletedOnboarding is already called inside configureApi
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

  console.log(ansis.green(`✔ ${i18n.configSuccess} ${CLAUDE_DIR}`));
  console.log('\n' + ansis.cyan(i18n.complete));
}