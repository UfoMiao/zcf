/**
 * Codex TOML Updater Module
 *
 * Provides targeted TOML editing capabilities for Codex configuration.
 * Uses @rainbowatcher/toml-edit-js for format-preserving modifications.
 *
 * Key principle: Only modify what needs to be modified, preserve everything else.
 * - API modifications should NOT affect MCP configurations
 * - MCP modifications should NOT affect API configurations
 */

import type { CodexMcpService, CodexProvider } from './codex'
import { CODEX_CONFIG_FILE, CODEX_DIR } from '../../constants'
// Usage: Fingerprint provider credentials without persisting their plaintext values.
import { hashConfigValue } from '../config-ownership'
import { ensureDir, exists, readFile, writeFile } from '../fs-operations'
import { normalizeTomlPath } from '../platform'
import { editToml, parseToml } from '../toml-edit'

/**
 * Update top-level TOML fields using regex-based replacement
 * This is needed because toml-edit's edit function requires dot-notation paths,
 * and top-level fields like 'model' don't work well with it.
 *
 * @param content - Original TOML content
 * @param field - Field name (e.g., 'model', 'model_provider')
 * @param value - New value (string or null to remove)
 * @param options - Additional options
 * @param options.commented - Whether to comment out the field
 * @returns Updated TOML content
 */
export function updateTopLevelTomlField(
  content: string,
  field: string,
  value: string | null,
  options: { commented?: boolean } = {},
): string {
  // Handle empty or undefined content
  if (!content) {
    if (value === null) {
      return ''
    }
    const commentPrefix = options.commented ? '# ' : ''
    return `${commentPrefix}${field} = "${value}"\n`
  }

  // Find the first [section] to determine top-level boundary
  const firstSectionMatch = content.match(/^\[/m)
  const topLevelEnd = firstSectionMatch?.index ?? content.length

  // Split content into top-level area and rest (sections)
  let topLevel = content.slice(0, topLevelEnd)
  const rest = content.slice(topLevelEnd)

  // Support inline comments like: field = "value" # comment
  // Also support commented-out fields like: # model_provider = "value"
  const fieldRegex = new RegExp(`^(#\\s*)?${field}\\s*=\\s*["'][^"']*["'][ \\t]*(?:#.*)?$`, 'm')
  const existingMatch = topLevel.match(fieldRegex)

  if (value === null) {
    // Remove the field entirely
    if (existingMatch) {
      topLevel = topLevel.replace(fieldRegex, '').replace(/\n{2,}/g, '\n\n')
    }
  }
  else {
    const commentPrefix = options.commented ? '# ' : ''
    const newLine = `${commentPrefix}${field} = "${value}"`

    if (existingMatch) {
      // Update existing field
      topLevel = topLevel.replace(fieldRegex, newLine)
    }
    else {
      // Add new field at end of top-level area
      topLevel = `${topLevel.trimEnd()}\n${newLine}\n`
    }
  }

  // Ensure proper spacing before sections
  if (rest.length > 0 && !topLevel.endsWith('\n\n')) {
    topLevel = `${topLevel.trimEnd()}\n\n`
  }

  return topLevel + rest
}

/**
 * Update multiple top-level API fields in Codex config
 * Only modifies: model, model_provider
 * Does NOT touch: mcp_servers, other sections
 *
 * @param fields - Fields to update
 * @param fields.model - Model name (string or null to remove)
 * @param fields.modelProvider - Model provider name (string or null to remove)
 * @param fields.modelProviderCommented - Whether to comment out model_provider field
 */
export function updateCodexApiFields(fields: {
  model?: string | null
  modelProvider?: string | null
  modelProviderCommented?: boolean
}): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    ensureDir(CODEX_DIR)
    writeFile(CODEX_CONFIG_FILE, '')
  }

  let content = readFile(CODEX_CONFIG_FILE) || ''

  if (fields.model !== undefined) {
    content = updateTopLevelTomlField(content, 'model', fields.model)
    content = updateTopLevelOwnershipMarker(content, 'model', fields.model)
  }

  if (fields.modelProvider !== undefined) {
    content = updateTopLevelTomlField(
      content,
      'model_provider',
      fields.modelProvider,
      { commented: fields.modelProviderCommented },
    )
    content = updateTopLevelOwnershipMarker(content, 'model_provider', fields.modelProvider)
  }

  writeFile(CODEX_CONFIG_FILE, content)
}

const ZCF_PROVIDER_MARKER_PREFIX = '# ZCF managed provider:'
const ZCF_PROVIDER_SNAPSHOT_PREFIX = '# ZCF managed provider snapshot:'
const ZCF_TOP_LEVEL_MARKER_PREFIX = '# ZCF managed top-level:'
const ZCF_MCP_MARKER_PREFIX = '# ZCF managed MCP:'

function updateTopLevelOwnershipMarker(content: string, field: string, value: string | null): string {
  const firstSectionMatch = content.match(/^\[/m)
  const topLevelEnd = firstSectionMatch?.index ?? content.length
  let topLevel = content.slice(0, topLevelEnd)
  const rest = content.slice(topLevelEnd)
  const markerPattern = new RegExp(
    `^${escapeRegex(ZCF_TOP_LEVEL_MARKER_PREFIX)}\\s*${escapeRegex(field)}\\s+`
    + '[a-f0-9]{64}\\s*$',
    'im',
  )

  if (value === null) {
    topLevel = topLevel.replace(markerPattern, '').replace(/\n{3,}/g, '\n\n')
  }
  else {
    const marker = `${ZCF_TOP_LEVEL_MARKER_PREFIX} ${field} ${hashConfigValue(value)}`
    if (markerPattern.test(topLevel)) {
      topLevel = topLevel.replace(markerPattern, marker)
    }
    else {
      const fieldPattern = new RegExp(`^(#\\s*)?${escapeRegex(field)}\\s*=`, 'm')
      const fieldMatch = fieldPattern.exec(topLevel)
      if (fieldMatch && fieldMatch.index !== undefined) {
        topLevel = `${topLevel.slice(0, fieldMatch.index)}${marker}\n${topLevel.slice(fieldMatch.index)}`
      }
      else {
        topLevel = `${topLevel.trimEnd()}\n${marker}\n`
      }
    }
  }

  return topLevel + rest
}

function getMcpSectionBounds(content: string, serviceId: string): { start: number, end: number } | null {
  const lines = content.split('\n')
  const headerPattern = new RegExp(`^\\[mcp_servers\\.${escapeRegex(serviceId)}\\]\\s*$`, 'i')
  const start = lines.findIndex(line => headerPattern.test(line.trim()))
  if (start < 0)
    return null

  const nextSection = lines.findIndex((line, index) => index > start && /^\s*\[/.test(line))
  return { start, end: nextSection >= 0 ? nextSection : lines.length }
}

function getMcpOwnershipMarker(serviceId: string, service: CodexMcpService): string {
  const apiKey = serviceId.toLowerCase() === 'exa' ? service.env?.EXA_API_KEY : undefined
  return typeof apiKey === 'string'
    ? `${ZCF_MCP_MARKER_PREFIX} ${serviceId} ${hashConfigValue(apiKey)}`
    : `${ZCF_MCP_MARKER_PREFIX} ${serviceId}`
}

function ensureZcfMcpMarker(content: string, serviceId: string, service: CodexMcpService): string {
  const bounds = getMcpSectionBounds(content, serviceId)
  if (!bounds)
    return content

  const lines = content.split('\n')
  const markerPattern = new RegExp(
    `^${escapeRegex(ZCF_MCP_MARKER_PREFIX)}\\s*${escapeRegex(serviceId)}(?:\\s+[a-f0-9]{64})?\\s*$`,
    'i',
  )
  const markerIndex = lines.findIndex((line, index) => index >= bounds.start
    && index < bounds.end
    && markerPattern.test(line.trim()))
  if (markerIndex >= 0) {
    if (serviceId.toLowerCase() === 'exa' && typeof service.env?.EXA_API_KEY === 'string')
      lines[markerIndex] = getMcpOwnershipMarker(serviceId, service)
    return lines.join('\n')
  }

  lines.splice(bounds.start + 1, 0, getMcpOwnershipMarker(serviceId, service))
  return lines.join('\n')
}

function getProviderSectionBounds(content: string, providerId: string): { start: number, end: number } | null {
  const lines = content.split('\n')
  const headerPattern = new RegExp(`^\\[model_providers\\.${escapeRegex(providerId)}\\]\\s*$`, 'i')
  const start = lines.findIndex(line => headerPattern.test(line.trim()))
  if (start < 0)
    return null

  const nextSection = lines.findIndex((line, index) => index > start && /^\s*\[/.test(line))
  return { start, end: nextSection >= 0 ? nextSection : lines.length }
}

function ensureZcfProviderMarker(content: string, providerId: string, managedCredential?: string): string {
  const bounds = getProviderSectionBounds(content, providerId)
  if (!bounds)
    return content

  const lines = content.split('\n')
  const markerPattern = new RegExp(
    `^${escapeRegex(ZCF_PROVIDER_MARKER_PREFIX)}\\s*${escapeRegex(providerId)}(?:\\s+[a-f0-9]{64})?\\s*$`,
    'i',
  )
  const markerIndex = lines.findIndex((line, index) => index >= bounds.start
    && index < bounds.end
    && markerPattern.test(line.trim()))
  const marker = typeof managedCredential === 'string'
    ? `${ZCF_PROVIDER_MARKER_PREFIX} ${providerId} ${hashConfigValue(managedCredential)}`
    : `${ZCF_PROVIDER_MARKER_PREFIX} ${providerId}`

  if (markerIndex >= 0) {
    if (typeof managedCredential === 'string')
      lines[markerIndex] = marker
    return lines.join('\n')
  }

  lines.splice(bounds.start + 1, 0, marker)
  return lines.join('\n')
}

function ensureZcfProviderSnapshotMarker(content: string, providerId: string): string {
  const bounds = getProviderSectionBounds(content, providerId)
  if (!bounds)
    return content

  const lines = content.split('\n')
  const isOwnershipMarker = (line: string): boolean => {
    const trimmed = line.trim()
    const providerPattern = new RegExp(
      `^${escapeRegex(ZCF_PROVIDER_MARKER_PREFIX)}\\s*${escapeRegex(providerId)}`
      + '(?:\\s+[a-f0-9]{64})?\\s*$',
      'i',
    )
    const snapshotPattern = new RegExp(
      `^${escapeRegex(ZCF_PROVIDER_SNAPSHOT_PREFIX)}\\s*${escapeRegex(providerId)}`
      + '(?:\\s+[a-f0-9]{64})?\\s*$',
      'i',
    )
    return providerPattern.test(trimmed) || snapshotPattern.test(trimmed)
  }
  const body = lines.slice(bounds.start + 1, bounds.end)
    .filter(line => !isOwnershipMarker(line))
    .join('\n')
    .trim()
  const marker = `${ZCF_PROVIDER_SNAPSHOT_PREFIX} ${providerId} ${hashConfigValue(body)}`
  const markerPattern = new RegExp(
    `^${escapeRegex(ZCF_PROVIDER_SNAPSHOT_PREFIX)}\\s*${escapeRegex(providerId)}(?:\\s+[a-f0-9]{64})?\\s*$`,
    'i',
  )
  const markerIndex = lines.findIndex((line, index) => index >= bounds.start
    && index < bounds.end
    && markerPattern.test(line.trim()))
  if (markerIndex >= 0)
    lines[markerIndex] = marker
  else
    lines.splice(bounds.start + 1, 0, marker)
  return lines.join('\n')
}

/**
 * Add or update a provider section in Codex config
 * Only modifies: model_providers.{providerId}
 * Does NOT touch: mcp_servers, top-level fields, other providers
 *
 * @param providerId - Provider ID
 * @param provider - Provider configuration
 */
export function upsertCodexProvider(
  providerId: string,
  provider: CodexProvider,
  managedCredential?: string,
): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    ensureDir(CODEX_DIR)
    writeFile(CODEX_CONFIG_FILE, '')
  }

  let content = readFile(CODEX_CONFIG_FILE) || ''
  const existingSection = getProviderSectionBounds(content, providerId)
  const existingLines = existingSection ? content.split('\n').slice(existingSection.start, existingSection.end) : []
  const markerPattern = new RegExp(
    `^${escapeRegex(ZCF_PROVIDER_MARKER_PREFIX)}\\s*${escapeRegex(providerId)}(?:\\s+[a-f0-9]{64})?\\s*$`,
    'i',
  )
  const hasZcfMarker = existingLines.some(line => markerPattern.test(line.trim()))
  const basePath = `model_providers.${providerId}`

  // Update each field individually to preserve formatting
  content = editToml(content, `${basePath}.name`, provider.name)
  content = editToml(content, `${basePath}.base_url`, provider.baseUrl)
  content = editToml(content, `${basePath}.wire_api`, provider.wireApi)
  content = editToml(content, `${basePath}.temp_env_key`, provider.tempEnvKey)
  content = editToml(content, `${basePath}.requires_openai_auth`, provider.requiresOpenaiAuth)

  if (provider.model) {
    content = editToml(content, `${basePath}.model`, provider.model)
  }

  // New provider sections need an ownership marker so ZCF-only uninstall can
  // remove arbitrary provider IDs without mistaking existing user sections
  // for ZCF-managed configuration.
  if (!existingSection || hasZcfMarker)
    content = ensureZcfProviderMarker(content, providerId, managedCredential)
  if (!existingSection || hasZcfMarker)
    content = ensureZcfProviderSnapshotMarker(content, providerId)

  writeFile(CODEX_CONFIG_FILE, content)
}

/**
 * Delete a provider section from Codex config
 * Only removes: model_providers.{providerId}
 * Does NOT touch: mcp_servers, top-level fields, other providers
 *
 * @param providerId - Provider ID to delete
 */
export function deleteCodexProvider(providerId: string): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    return
  }

  const content = readFile(CODEX_CONFIG_FILE) || ''

  // Use regex to remove the entire section
  // Match [model_providers.{providerId}] and all content until next section or EOF
  const sectionRegex = new RegExp(
    `\\n?\\[model_providers\\.${escapeRegex(providerId)}\\][\\s\\S]*?(?=\\n\\[|$)`,
    'g',
  )

  const updatedContent = content.replace(sectionRegex, '')
  writeFile(CODEX_CONFIG_FILE, updatedContent)
}

/**
 * Add or update an MCP service section in Codex config
 * Only modifies: mcp_servers.{serviceId}
 * Does NOT touch: model_providers, top-level fields, other MCP services
 *
 * IMPORTANT: This preserves existing fields that ZCF doesn't manage (like 'url' for SSE services)
 *
 * @param serviceId - Service ID
 * @param service - Service configuration (only ZCF-managed fields)
 */
export function upsertCodexMcpService(serviceId: string, service: CodexMcpService): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    ensureDir(CODEX_DIR)
    writeFile(CODEX_CONFIG_FILE, '')
  }

  let content = readFile(CODEX_CONFIG_FILE) || ''
  const basePath = `mcp_servers.${serviceId}`
  const existingSection = getMcpSectionBounds(content, serviceId)
  const existingLines = existingSection ? content.split('\n').slice(existingSection.start, existingSection.end) : []
  const markerPattern = new RegExp(
    `^${escapeRegex(ZCF_MCP_MARKER_PREFIX)}\\s*${escapeRegex(serviceId)}(?:\\s+[a-f0-9]{64})?\\s*$`,
    'i',
  )
  const hasZcfMarker = existingLines.some(line => markerPattern.test(line.trim()))

  // Check if this is an existing service with 'url' field (SSE protocol)
  // If so, we should NOT add command/args fields
  const parsed = content ? parseToml(content) as any : {}
  const existingService = parsed.mcp_servers?.[serviceId]

  if (existingService?.url && !existingService?.command) {
    // This is an SSE-type service, only update non-conflicting fields
    if (service.env && Object.keys(service.env).length > 0) {
      content = editToml(content, `${basePath}.env`, service.env)
    }
    if (service.startup_timeout_sec) {
      content = editToml(content, `${basePath}.startup_timeout_sec`, service.startup_timeout_sec)
    }
  }
  else {
    // This is a stdio-type service or new service, update all fields
    const normalizedCommand = normalizeTomlPath(service.command)
    content = editToml(content, `${basePath}.command`, normalizedCommand)
    content = editToml(content, `${basePath}.args`, service.args || [])

    if (service.env && Object.keys(service.env).length > 0) {
      content = editToml(content, `${basePath}.env`, service.env)
    }
    if (service.startup_timeout_sec) {
      content = editToml(content, `${basePath}.startup_timeout_sec`, service.startup_timeout_sec)
    }
  }

  // Existing unmarked services are user-owned, even when ZCF updates their
  // managed fields. Only new sections or previously marked sections may be
  // claimed for ZCF-only cleanup.
  if (!existingSection || hasZcfMarker)
    content = ensureZcfMcpMarker(content, serviceId, service)
  writeFile(CODEX_CONFIG_FILE, content)
}

/**
 * Delete an MCP service section from Codex config
 * Only removes: mcp_servers.{serviceId}
 * Does NOT touch: model_providers, top-level fields, other MCP services
 *
 * @param serviceId - Service ID to delete
 */
export function deleteCodexMcpService(serviceId: string): void {
  if (!exists(CODEX_CONFIG_FILE)) {
    return
  }

  const content = readFile(CODEX_CONFIG_FILE) || ''

  // Use regex to remove the entire section
  const sectionRegex = new RegExp(
    `\\n?\\[mcp_servers\\.${escapeRegex(serviceId)}\\][\\s\\S]*?(?=\\n\\[|$)`,
    'g',
  )

  const updatedContent = content.replace(sectionRegex, '')
  writeFile(CODEX_CONFIG_FILE, updatedContent)
}

/**
 * Batch update multiple MCP services
 * Preserves existing MCP services that are not in the update list
 *
 * @param services - Services to add/update
 * @param options - Options for the update
 * @param options.replaceAll - Whether to replace all existing services instead of merging
 */
export function batchUpdateCodexMcpServices(
  services: CodexMcpService[],
  options: { replaceAll?: boolean } = {},
): void {
  if (options.replaceAll) {
    // Remove all existing MCP services first
    if (exists(CODEX_CONFIG_FILE)) {
      let content = readFile(CODEX_CONFIG_FILE) || ''

      // Remove all mcp_servers sections
      content = content.replace(/\n?\[mcp_servers\.[^\]]+\][\s\S]*?(?=\n\[|$)/g, '')

      // Also remove the MCP header comment if present
      content = content.replace(/\n?#\s*---\s*MCP servers added by ZCF\s*---\s*/gi, '')

      writeFile(CODEX_CONFIG_FILE, content)
    }
  }

  // Add/update each service
  for (const service of services) {
    upsertCodexMcpService(service.id, service)
  }
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
