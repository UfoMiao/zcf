import prompts from '@posva/prompts';
import ansis from 'ansis';
import { existsSync } from 'node:fs';
import { version } from '../../package.json';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { I18N, LANG_LABELS, SETTINGS_FILE, SUPPORTED_LANGS } from '../constants';
import { displayBanner } from '../utils/banner';
import { updatePromptOnly } from '../utils/config-operations';
import { resolveAiOutputLanguage, selectScriptLanguage } from '../utils/prompts';
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config';

export interface UpdateOptions {
  configLang?: SupportedLang;
  aiOutputLang?: AiOutputLanguage | string;
  skipBanner?: boolean;
}

export async function update(options: UpdateOptions = {}) {
  try {
    // Display banner
    if (!options.skipBanner) {
      displayBanner('Update configuration for Claude Code');
    }

    // Get script language from config or ask user
    const scriptLang = await selectScriptLanguage();
    const zcfConfig = readZcfConfig();
    
    // Now use the selected script language for all messages
    const i18n = I18N[scriptLang];
    
    // Check if config exists
    if (!existsSync(SETTINGS_FILE)) {
      console.log(ansis.yellow(i18n.noExistingConfig));
      process.exit(1);
    }

    // Select config language if not provided
    let configLang = options.configLang as SupportedLang;
    if (!configLang) {
      // Display hint in user's preferred language
      console.log(ansis.dim(`  ${i18n.configLangHint['zh-CN']}`));
      console.log(ansis.dim(`  ${i18n.configLangHint['en']}\n`));
      
      const configResponse = await prompts({
        type: 'select',
        name: 'lang',
        message: i18n.updateConfigLangPrompt,
        choices: SUPPORTED_LANGS.map((l) => ({
          title: `${LANG_LABELS[l]} - ${i18n.configLangHint[l]}`,
          value: l,
        })),
      });

      if (!configResponse.lang) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }

      configLang = configResponse.lang as SupportedLang;
    }

    // Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(scriptLang, options.aiOutputLang, zcfConfig);

    console.log(ansis.cyan(`\n${i18n.updatingPrompts}\n`));

    // Execute prompt-only update with AI language
    await updatePromptOnly(configLang, scriptLang, aiOutputLang);
    
    // Update zcf config with new version and AI language preference
    updateZcfConfig({
      version,
      preferredLang: scriptLang,
      aiOutputLang: aiOutputLang,
    });
  } catch (error) {
    const zcfConfig = readZcfConfig();
    const defaultLang = zcfConfig?.preferredLang || 'en';
    const errorMsg = I18N[defaultLang].error;
    console.error(ansis.red(`${errorMsg}:`), error);
    process.exit(1);
  }
}