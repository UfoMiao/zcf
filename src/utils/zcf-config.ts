import { ZCF_CONFIG_FILE, type AiOutputLanguage, type SupportedLang } from '../constants';
import { readJsonConfig, writeJsonConfig } from './json-config';

export interface ZcfConfig {
  version: string;
  preferredLang: SupportedLang;
  aiOutputLang?: AiOutputLanguage | string;
  aiPersonality?: string;
  lastUpdated: string;
}

export function readZcfConfig(): ZcfConfig | null {
  return readJsonConfig<ZcfConfig>(ZCF_CONFIG_FILE);
}

export function writeZcfConfig(config: ZcfConfig): void {
  writeJsonConfig(ZCF_CONFIG_FILE, config);
}

export function updateZcfConfig(updates: Partial<ZcfConfig>): void {
  const existingConfig = readZcfConfig();
  const newConfig: ZcfConfig = {
    version: updates.version || existingConfig?.version || '1.0.0',
    preferredLang: updates.preferredLang || existingConfig?.preferredLang || 'en',
    aiOutputLang: updates.aiOutputLang || existingConfig?.aiOutputLang,
    aiPersonality: updates.aiPersonality !== undefined ? updates.aiPersonality : existingConfig?.aiPersonality,
    lastUpdated: new Date().toISOString(),
  };
  writeZcfConfig(newConfig);
}
