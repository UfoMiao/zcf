import type { SupportedLang } from '../constants'
import type { CodeToolInitOptions } from './types'
import { WORKFLOW_CONFIG_BASE } from '../config/workflows'
import { i18n } from '../i18n'

export function applyAllLang(options: CodeToolInitOptions): void {
  if (!options.allLang)
    return

  if (options.allLang === 'zh-CN' || options.allLang === 'en') {
    options.configLang = options.allLang
    options.aiOutputLang = options.allLang
    return
  }

  options.configLang = 'en'
  options.aiOutputLang = options.allLang
}

export function parseWorkflows(options: CodeToolInitOptions): void {
  if (typeof options.workflows === 'string') {
    if (options.workflows === 'skip')
      options.workflows = false
    else if (options.workflows === 'all')
      options.workflows = WORKFLOW_CONFIG_BASE.map(workflow => workflow.id)
    else
      options.workflows = options.workflows.split(',').map(item => item.trim())
  }

  if (!Array.isArray(options.workflows))
    return

  const validWorkflows = WORKFLOW_CONFIG_BASE.map(workflow => workflow.id)
  for (const workflow of options.workflows) {
    if (!validWorkflows.includes(workflow)) {
      throw new Error(i18n.t('errors:invalidWorkflow', {
        workflow,
        validWorkflows: validWorkflows.join(', '),
      }))
    }
  }
}

export function applySkipPromptInitDefaults(options: CodeToolInitOptions): void {
  if (!options.skipPrompt)
    return

  // Non-interactive init cannot ask for config/workflow choices; omitted values
  // must already be concrete so adapters do not reopen prompts.
  if (!options.configAction)
    options.configAction = 'backup'
  if (options.workflows === undefined)
    options.workflows = WORKFLOW_CONFIG_BASE.map(workflow => workflow.id)
}

export function rejectUnsupportedInitCapabilities(
  options: CodeToolInitOptions,
  toolName: string,
  capabilities: Array<[keyof CodeToolInitOptions | 'providers', string]>,
): void {
  for (const [field, capability] of capabilities) {
    const present = field === 'providers'
      ? Boolean(options.provider)
      : options[field] !== undefined
    if (!present)
      continue
    throw new Error(i18n.t('errors:unsupportedCodeToolCapability', {
      tool: toolName,
      capability,
    }))
  }
}

export function isExplicitlyEnabled(value: unknown): boolean {
  return value !== undefined && value !== false && value !== 'skip' && value !== 'false'
}

export function supportedLangFrom(value: string | undefined): SupportedLang {
  return value === 'zh-CN' || value === 'en' ? value : 'en'
}
