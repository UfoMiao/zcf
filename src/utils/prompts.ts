import ansis from 'ansis';
import inquirer from 'inquirer';
import { version } from '../../package.json';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { AI_OUTPUT_LANGUAGES, LANG_LABELS, SUPPORTED_LANGS } from '../constants';
import { getTranslation } from '../i18n';
import type { ZcfConfig } from './zcf-config';
import { readZcfConfig, updateZcfConfig } from './zcf-config';

/**
 * Prompt user to select AI output language
 */
export async function selectAiOutputLanguage(
  scriptLang: SupportedLang,
  defaultLang?: AiOutputLanguage | string
): Promise<AiOutputLanguage | string> {
  const i18n = getTranslation(scriptLang);

  console.log(ansis.dim(`\n  ${i18n.language.aiOutputLangHint}\n`));

  const aiLangChoices = Object.entries(AI_OUTPUT_LANGUAGES).map(([key, value]) => ({
    title: value.label,
    value: key,
  }));

  // Set default selection
  const defaultChoice = defaultLang || (scriptLang === 'zh-CN' ? 'zh-CN' : 'en');

  const { lang } = await inquirer.prompt<{ lang: string }>({
    type: 'list',
    name: 'lang',
    message: i18n.language.selectAiOutputLang,
    choices: aiLangChoices.map((choice) => ({
      name: choice.title,
      value: choice.value,
    })),
    default: defaultChoice,
  });

  if (!lang) {
    console.log(ansis.yellow(i18n.common.cancelled));
    process.exit(0);
  }

  let aiOutputLang = lang as AiOutputLanguage;

  // If custom language selected, ask for the specific language
  if (aiOutputLang === 'custom') {
    const { customLang } = await inquirer.prompt<{ customLang: string }>({
      type: 'input',
      name: 'customLang',
      message: i18n.language.enterCustomLanguage,
      validate: (value) => !!value || i18n.language?.languageRequired || 'Language is required',
    });

    if (!customLang) {
      console.log(ansis.yellow(i18n.common.cancelled));
      process.exit(0);
    }

    return customLang;
  }

  return aiOutputLang;
}

/**
 * Select ZCF display language (for first-time users or when config is not found)
 */
export async function selectScriptLanguage(currentLang?: SupportedLang): Promise<SupportedLang> {
  // Try to read from saved config first
  const zcfConfig = readZcfConfig();
  if (zcfConfig?.preferredLang) {
    return zcfConfig.preferredLang;
  }

  // If provided as parameter, use it
  if (currentLang) {
    return currentLang;
  }

  // Ask user to select
  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: 'Select ZCF display language / 选择ZCF显示语言',
    choices: SUPPORTED_LANGS.map((l) => ({
      name: LANG_LABELS[l],
      value: l,
    })),
  });

  if (!lang) {
    console.log(ansis.yellow('Operation cancelled / 操作已取消'));
    process.exit(0);
  }

  const scriptLang = lang;

  // Save the selected language preference
  updateZcfConfig({
    version,
    preferredLang: scriptLang,
  });

  return scriptLang;
}

/**
 * Resolve AI output language with priority order
 * Priority: 1. Command line option, 2. Saved config, 3. Ask user
 */
export async function resolveAiOutputLanguage(
  scriptLang: SupportedLang,
  commandLineOption?: AiOutputLanguage | string,
  savedConfig?: ZcfConfig | null
): Promise<AiOutputLanguage | string> {
  const i18n = getTranslation(scriptLang);

  // Priority 1: Command line option
  if (commandLineOption) {
    return commandLineOption;
  }

  // Priority 2: Saved config
  if (savedConfig?.aiOutputLang) {
    console.log(ansis.gray(`✔ ${i18n.language.aiOutputLangHint}: ${savedConfig.aiOutputLang}`));
    return savedConfig.aiOutputLang;
  }

  // Priority 3: Ask user
  return await selectAiOutputLanguage(scriptLang, scriptLang);
}
