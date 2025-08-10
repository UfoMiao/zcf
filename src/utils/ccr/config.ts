import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import inquirer from 'inquirer';
import ansis from 'ansis';
import type { SupportedLang } from '../../constants';
import { I18N, SETTINGS_FILE } from '../../constants';
import type { CcrConfig, CcrProvider, CcrRouter, ProviderPreset } from '../../types/ccr';
import { readJsonConfig, writeJsonConfig } from '../json-config';
import { backupExistingConfig } from '../config';
import { fetchProviderPresets } from './presets';
import { addCompletedOnboarding } from '../mcp';

const CCR_CONFIG_DIR = join(homedir(), '.claude-code-router');
const CCR_CONFIG_FILE = join(CCR_CONFIG_DIR, 'config.json');

export function ensureCcrConfigDir(): void {
  if (!existsSync(CCR_CONFIG_DIR)) {
    mkdirSync(CCR_CONFIG_DIR, { recursive: true });
  }
}

export function readCcrConfig(): CcrConfig | null {
  if (!existsSync(CCR_CONFIG_FILE)) {
    return null;
  }
  return readJsonConfig<CcrConfig>(CCR_CONFIG_FILE);
}

export function writeCcrConfig(config: CcrConfig): void {
  ensureCcrConfigDir();
  writeJsonConfig(CCR_CONFIG_FILE, config);
}

export async function configureCcrProxy(ccrConfig: CcrConfig): Promise<void> {
  // Read current settings
  const settings = readJsonConfig<any>(SETTINGS_FILE) || {};
  
  // Extract CCR server info
  const host = ccrConfig.HOST || '127.0.0.1';
  const port = ccrConfig.PORT || 3456;
  const apiKey = ccrConfig.APIKEY || 'sk-ccr';
  
  // Update environment variables in settings
  if (!settings.env) {
    settings.env = {};
  }
  
  settings.env.ANTHROPIC_BASE_URL = `http://${host}:${port}`;
  settings.env.ANTHROPIC_API_KEY = apiKey;
  
  // Write back to settings
  writeJsonConfig(SETTINGS_FILE, settings);
}

export async function selectCcrPreset(scriptLang: SupportedLang): Promise<ProviderPreset | null> {
  const i18n = I18N[scriptLang];
  
  // Try to fetch online presets first
  console.log(ansis.cyan(`${i18n.fetchingPresets}`));
  const presets = await fetchProviderPresets();
  
  if (!presets || presets.length === 0) {
    console.log(ansis.yellow(`${i18n.noPresetsAvailable}`));
    return null;
  }
  
  // Let user select a preset
  try {
    const { preset } = await inquirer.prompt<{ preset: ProviderPreset }>({
      type: 'list',
      name: 'preset',
      message: i18n.selectCcrPreset,
      choices: presets.map((p, index) => ({
        name: `${index + 1}. ${p.name}`,
        value: p,
      })),
    });
    
    return preset;
  } catch (error: any) {
    if (error.name === 'ExitPromptError') {
      console.log(ansis.yellow(i18n.cancelled));
      return null;
    }
    throw error;
  }
}

export async function configureCcrWithPreset(
  preset: ProviderPreset,
  scriptLang: SupportedLang
): Promise<CcrConfig> {
  const i18n = I18N[scriptLang];
  
  // Create provider configuration
  const provider: CcrProvider = {
    name: preset.name,  // Use the original name from JSON
    api_base_url: preset.baseURL || '',
    api_key: '',
    models: preset.models,
  };
  
  // Add transformer if present
  if (preset.transformer) {
    provider.transformer = preset.transformer;
  }
  
  // Ask for API key if required
  if (preset.requiresApiKey) {
    try {
      const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
        type: 'input',
        name: 'apiKey',
        message: i18n.enterApiKeyForProvider.replace('{provider}', preset.name),
        validate: (value) => !!value || i18n.keyRequired,
      });
      
      provider.api_key = apiKey;
    } catch (error: any) {
      if (error.name === 'ExitPromptError') {
        throw error; // Re-throw to be handled by setupCcrConfiguration
      }
      throw error;
    }
  } else {
    provider.api_key = 'sk-free';
  }
  
  // Let user select default model if there are multiple models
  let defaultModel = preset.models[0];
  if (preset.models.length > 1) {
    try {
      const { model } = await inquirer.prompt<{ model: string }>({
        type: 'list',
        name: 'model',
        message: i18n.selectDefaultModelForProvider.replace('{provider}', preset.name),
        choices: preset.models.map((m, index) => ({
          name: `${index + 1}. ${m}`,
          value: m,
        })),
      });
      defaultModel = model;
    } catch (error: any) {
      if (error.name === 'ExitPromptError') {
        throw error;
      }
      throw error;
    }
  }
  
  // Build router configuration
  const router: CcrRouter = {
    default: `${preset.name},${defaultModel}`,  // Use the original name
    background: `${preset.name},${defaultModel}`,
    think: `${preset.name},${defaultModel}`,
    longContext: `${preset.name},${defaultModel}`,
    longContextThreshold: 60000,
    webSearch: `${preset.name},${defaultModel}`,
  };
  
  // Build complete config
  const config: CcrConfig = {
    LOG: false,
    CLAUDE_PATH: '',
    HOST: '127.0.0.1',
    PORT: 3456,
    APIKEY: 'sk-ccr',
    API_TIMEOUT_MS: '600000',
    PROXY_URL: '',
    transformers: [],
    Providers: [provider],
    Router: router,
  };
  
  return config;
}

export async function setupCcrConfiguration(scriptLang: SupportedLang): Promise<boolean> {
  const i18n = I18N[scriptLang];
  
  try {
    // Backup existing config if any
    const existingConfig = readCcrConfig();
    if (existingConfig) {
      console.log(ansis.blue(`ℹ ${i18n.existingCcrConfig}`));
      let overwrite = false;
      try {
        const result = await inquirer.prompt<{ overwrite: boolean }>({
          type: 'confirm',
          name: 'overwrite',
          message: i18n.overwriteCcrConfig,
          default: false,
        });
        overwrite = result.overwrite;
      } catch (error: any) {
        if (error.name === 'ExitPromptError') {
          console.log(ansis.yellow(i18n.cancelled));
          return false;
        }
        throw error;
      }
      
      if (!overwrite) {
        console.log(ansis.yellow(`${i18n.keepingExistingConfig}`));
        // Still need to configure proxy in settings.json
        await configureCcrProxy(existingConfig);
        return true;
      }
    }
    
    // Select preset
    const preset = await selectCcrPreset(scriptLang);
    if (!preset) {
      return false;
    }
    
    // Configure with preset
    const config = await configureCcrWithPreset(preset, scriptLang);
    
    // Write CCR config
    writeCcrConfig(config);
    console.log(ansis.green(`✔ ${i18n.ccrConfigSuccess}`));
    
    // Configure proxy in settings.json
    await configureCcrProxy(config);
    console.log(ansis.green(`✔ ${i18n.proxyConfigSuccess}`));
    
    // Add hasCompletedOnboarding flag after successful CCR configuration
    try {
      addCompletedOnboarding();
    } catch (error) {
      console.error(ansis.red(i18n.failedToSetOnboarding), error);
    }
    
    return true;
  } catch (error: any) {
    if (error.name === 'ExitPromptError') {
      console.log(ansis.yellow(i18n.cancelled));
      return false;
    }
    console.error(ansis.red(`${i18n.ccrConfigFailed}:`), error);
    return false;
  }
}

export async function configureCcrFeature(scriptLang: SupportedLang): Promise<void> {
  const i18n = I18N[scriptLang];
  
  // Backup existing settings.json
  const backupDir = backupExistingConfig();
  if (backupDir) {
    console.log(ansis.gray(`✔ ${i18n.backupSuccess}: ${backupDir}`));
  }
  
  // Run CCR setup
  await setupCcrConfiguration(scriptLang);
}