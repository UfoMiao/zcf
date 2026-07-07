/**
 * Legacy bridge for Codex adapter.
 *
 * Re-exports the existing internal functions so that legacy callers and the
 * adapter implementation can consume them through a stable path without
 * depending directly on the deep utils tree.
 */

export { CODEX_AGENTS_FILE, CODEX_CONFIG_FILE, CODEX_DIR, CODEX_PROMPTS_DIR, SUPPORTED_LANGS } from '../../constants'

export { i18n } from '../../i18n'
export {
  backupCodexAgents,
  backupCodexComplete,
  backupCodexFiles,
  backupCodexPrompts,
  checkCodexUpdate,
  type CodexConfigData,
  type CodexProvider,
  configureCodexApi,
  configureCodexMcp,
  installCodexCli,
  listCodexProviders,
  readCodexConfig,
  runCodexFullInit,
  runCodexUninstall,
  runCodexUpdate,
  switchCodexProvider,
  switchToOfficialLogin as switchCodexToOfficialLogin,
  switchToProvider as switchCodexToProvider,
} from '../../utils/code-tools/codex'
export { applyAiLanguageDirective } from '../../utils/config'
export { ensureDir, exists, readFile, writeFile } from '../../utils/fs-operations'
export { readJsonConfig, writeJsonConfig } from '../../utils/json-config'
export { isWindows } from '../../utils/platform'
export { readZcfConfig, updateZcfConfig } from '../../utils/zcf-config'
