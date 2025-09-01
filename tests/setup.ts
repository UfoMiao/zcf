import { beforeAll } from 'vitest'
import { initI18n } from '../src/i18n'

/**
 * Global test setup for i18n initialization
 * This ensures all tests have access to initialized i18n system
 */
beforeAll(async () => {
  // Initialize i18n system for test environment with English locale
  await initI18n('en')
})
