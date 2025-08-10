import ansis from 'ansis';
import { type SupportedLang } from '../constants';
import { getTranslation } from '../i18n';
import { readZcfConfig } from './zcf-config';

/**
 * Handle ExitPromptError gracefully
 * @returns true if error was ExitPromptError and handled, false otherwise
 */
export function handleExitPromptError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    const zcfConfig = readZcfConfig();
    const defaultLang = zcfConfig?.preferredLang || 'zh-CN';
    const i18n = getTranslation(defaultLang);
    console.log(ansis.cyan(`\n${i18n.common.goodbye}\n`));
    process.exit(0);
  }
  return false;
}

/**
 * Handle general errors with proper formatting
 */
export function handleGeneralError(error: unknown, lang?: string): void {
  const zcfConfig = readZcfConfig();
  const defaultLang = (lang || zcfConfig?.preferredLang || 'en') as SupportedLang;
  const i18n = getTranslation(defaultLang);
  const errorMsg = i18n.common.error || 'Error';
  console.error(ansis.red(`${errorMsg}:`), error);
  
  // Log error details for debugging
  if (error instanceof Error) {
    console.error(ansis.gray(`Stack: ${error.stack}`));
  }
  
  process.exit(1);
}