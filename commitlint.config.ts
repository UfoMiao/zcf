import type { UserConfig } from '@commitlint/types'
import { RuleConfigSeverity } from '@commitlint/types'

/**
 * Commitlint configuration for ZCF project
 * Extends standard Conventional Commits specification with project-specific rules
 *
 * Features:
 * - Standard Conventional Commits types (feat, fix, docs, etc.)
 * - Optional scope (scope is not required but allowed)
 * - Subject validation (no trailing period, flexible case)
 * - Header length limit (100 characters)
 * - TypeScript type safety with @commitlint/types
 */
const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Scope configuration - make scope optional per requirement
    'scope-empty': [RuleConfigSeverity.Disabled], // Allow empty scopes
    'scope-case': [RuleConfigSeverity.Disabled], // Don't enforce scope case when present

    // Subject validation rules
    'subject-empty': [RuleConfigSeverity.Error, 'never'],
    'subject-full-stop': [RuleConfigSeverity.Error, 'never', '.'],
    'subject-case': [RuleConfigSeverity.Disabled], // Allow flexible subject case

    // Header length constraints
    'header-max-length': [RuleConfigSeverity.Error, 'always', 100],

    // Type validation
    'type-empty': [RuleConfigSeverity.Error, 'never'],
    'type-case': [RuleConfigSeverity.Error, 'always', 'lower-case'],

    // Body configuration (optional)
    'body-leading-blank': [RuleConfigSeverity.Warning, 'always'],
    'body-max-line-length': [RuleConfigSeverity.Disabled], // Allow flexible body length

    // Footer configuration (optional)
    'footer-leading-blank': [RuleConfigSeverity.Warning, 'always'],
  },
}

export default config
