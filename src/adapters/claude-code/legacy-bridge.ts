/**
 * Legacy bridge for Claude Code adapter.
 *
 * Re-exports the existing internal functions so that legacy callers and the
 * adapter implementation can consume them through a stable path without
 * depending directly on the deep utils tree.
 */

// Constants
export { CLAUDE_DIR, SETTINGS_FILE } from '../../constants'

// i18n
export { i18n } from '../../i18n'

// Banner
export { displayBannerWithInfo } from '../../utils/banner'

export {
  backupCcrConfig,
  configureCcrProxy,
  createDefaultCcrConfig,
  readCcrConfig,
  setupCcrConfiguration,
  writeCcrConfig,
} from '../../utils/ccr/config'

// CCR helpers
export { installCcr, isCcrInstalled } from '../../utils/ccr/installer'

// ClaudeCodeConfigManager
export { ClaudeCodeConfigManager } from '../../utils/claude-code-config-manager'

// Incremental config manager
export { configureIncrementalManagement } from '../../utils/claude-code-incremental-manager'

// Claude Code specific config helpers
export {
  addCompletedOnboarding,
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  mergeMcpServers,
  readMcpConfig,
  setPrimaryApiKey,
  writeMcpConfig,
} from '../../utils/claude-config'

// Cometix
export { installCometixLine, isCometixLineInstalled } from '../../utils/cometix/installer'

// Configuration helpers
export {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
  promptApiConfigurationAction,
  switchToOfficialLogin,
  updateCustomModel,
} from '../../utils/config'

// API config operations
export { configureApiCompletely, modifyApiConfigPartially } from '../../utils/config-operations'

// fs operations
export { exists } from '../../utils/fs-operations'

// Installation manager
export { handleMultipleInstallations } from '../../utils/installation-manager'

// Installer helpers
export {
  displayVerificationResult,
  getInstallationStatus,
  installClaudeCode,
  removeLocalClaudeCode,
  verifyInstallation,
} from '../../utils/installer'

// MCP selector
export { selectMcpServices } from '../../utils/mcp-selector'
// Output styles
export { configureOutputStyle } from '../../utils/output-style'

// Platform
export { isTermux, isWindows } from '../../utils/platform'

// Prompt helpers
export { resolveAiOutputLanguage, resolveTemplateLanguage } from '../../utils/prompts'

// Boolean prompt
export { promptBoolean } from '../../utils/toggle-prompt'

// Version checker
export { checkClaudeCodeVersionAndPrompt } from '../../utils/version-checker'

// Workflows
export { selectAndInstallWorkflows } from '../../utils/workflow-installer'

// ZCF config
export { readZcfConfig, updateZcfConfig } from '../../utils/zcf-config'
