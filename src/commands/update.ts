import inquirer from 'inquirer';
import ansis from 'ansis';
import { version } from '../../package.json';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { I18N, LANG_LABELS, SUPPORTED_LANGS } from '../constants';
import { displayBanner } from '../utils/banner';
import { updatePromptOnly } from '../utils/config-operations';
import { resolveAiOutputLanguage, selectScriptLanguage } from '../utils/prompts';
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config';
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler';
import { selectAndInstallWorkflows } from '../utils/workflow-installer';

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

    // Select config language if not provided
    let configLang = options.configLang as SupportedLang;
    if (!configLang) {
      const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
        type: 'list',
        name: 'lang',
        message: i18n.updateConfigLangPrompt,
        choices: SUPPORTED_LANGS.map((l) => ({
          name: `${LANG_LABELS[l]} - ${i18n.configLangHint[l]}`,
          value: l,
        })),
      });

      if (!lang) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }

      configLang = lang;
    }

    // Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(scriptLang, options.aiOutputLang, zcfConfig);

    console.log(ansis.cyan(`\n${i18n.updatingPrompts}\n`));

    // Execute prompt-only update with AI language
    await updatePromptOnly(configLang, scriptLang, aiOutputLang);
    
    // Select and install workflows
    await selectAndInstallWorkflows(configLang, scriptLang);

    // Update zcf config with new version and AI language preference
    updateZcfConfig({
      version,
      preferredLang: scriptLang,
      aiOutputLang: aiOutputLang,
    });
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error);
    }
  }
}
