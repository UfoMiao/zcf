import process from 'node:process'
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../i18n'

/**
 * Handle ExitPromptError gracefully
 * @returns true if error was ExitPromptError and handled, false otherwise
 */
export function handleExitPromptError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log(ansis.cyan(`\n${i18n.t('common:goodbye')}\n`))
    process.exit(0)
  }
  return false
}

/**
 * Handle general errors with proper formatting
 */
export function handleGeneralError(error: unknown): void {
  ensureI18nInitialized()
  console.error(ansis.red(`${i18n.t('errors:generalError')}:`), error)

  // Log error details for debugging
  if (error instanceof Error) {
    console.error(ansis.gray(`${i18n.t('errors:stackTrace')}: ${error.stack}`))
  }

  process.exit(1)
}
