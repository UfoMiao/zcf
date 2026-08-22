import type { CodeToolType } from './definitions'
import { i18n } from '../i18n'
import { getCodeToolRegistry } from './register-builtins'

export function getCodeToolDisplayName(codeTool: CodeToolType): string {
  const definition = getCodeToolRegistry().get(codeTool).definition
  const translated = i18n.t(definition.displayNameKey)
  return translated === definition.displayNameKey ? definition.displayName : translated
}

export function getCodeToolBanner(codeTool: CodeToolType): string {
  return i18n.t('common:codeToolBanner', { tool: getCodeToolDisplayName(codeTool) })
}
