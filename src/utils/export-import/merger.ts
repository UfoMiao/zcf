/**
 * Configuration merge module for ZCF import functionality
 *
 * This module provides intelligent configuration merging strategies:
 * - Replace: Completely replace existing configuration
 * - Merge: Deep merge with imported config taking precedence
 * - Skip-existing: Only import items that don't exist
 *
 * Special handling for:
 * - MCP services (avoid duplicates)
 * - Workflows (detect name conflicts)
 * - Profiles (detect duplicate names)
 */

import type {
  ConfigConflict,
  ConfigItemType,
  MergeStrategy,
} from '../../types/export-import'
import { deepMerge, isPlainObject } from '../object-utils'

/**
 * Merge configurations based on strategy
 *
 * @param existing - Existing configuration
 * @param incoming - Incoming configuration from import
 * @param strategy - Merge strategy to use
 * @returns Merged configuration and detected conflicts
 */
export function mergeConfigs(
  existing: any,
  incoming: any,
  strategy: MergeStrategy,
): {
  merged: any
  conflicts: ConfigConflict[]
} {
  const conflicts: ConfigConflict[] = []

  switch (strategy) {
    case 'replace':
      return { merged: incoming, conflicts }

    case 'merge':
      return mergeStrategy(existing, incoming, conflicts)

    case 'skip-existing':
      return skipExistingStrategy(existing, incoming, conflicts)

    default:
      return { merged: existing, conflicts }
  }
}

/**
 * Replace strategy: Completely replace existing configuration
 */
export function replaceStrategy(_existing: any, incoming: any): {
  merged: any
  conflicts: ConfigConflict[]
} {
  // No conflicts in replace mode, just replace everything
  return {
    merged: incoming,
    conflicts: [],
  }
}

/**
 * Merge strategy: Deep merge configurations
 *
 * Incoming configuration takes precedence over existing.
 * Detects conflicts for user review.
 */
export function mergeStrategy(
  existing: any,
  incoming: any,
  conflicts: ConfigConflict[] = [],
): {
  merged: any
  conflicts: ConfigConflict[]
} {
  if (!existing) {
    return { merged: incoming, conflicts }
  }

  if (!incoming) {
    return { merged: existing, conflicts }
  }

  // Detect conflicts before merging
  detectConflicts(existing, incoming, conflicts)

  // Perform deep merge (incoming takes precedence)
  const merged = deepMerge(existing, incoming, {
    mergeArrays: true,
    arrayMergeStrategy: 'unique',
  })

  return { merged, conflicts }
}

/**
 * Skip-existing strategy: Only import items that don't exist
 *
 * Preserves all existing configuration, only adds new items.
 */
export function skipExistingStrategy(
  existing: any,
  incoming: any,
  conflicts: ConfigConflict[] = [],
): {
  merged: any
  conflicts: ConfigConflict[]
} {
  if (!existing) {
    return { merged: incoming, conflicts }
  }

  if (!incoming) {
    return { merged: existing, conflicts }
  }

  const merged = JSON.parse(JSON.stringify(existing))

  // Only add keys that don't exist in existing config
  for (const [key, value] of Object.entries(incoming)) {
    if (!(key in merged)) {
      merged[key] = value
    }
    else if (isPlainObject(value) && isPlainObject(merged[key])) {
      // Recursively skip existing for nested objects
      const result = skipExistingStrategy(merged[key], value, conflicts)
      merged[key] = result.merged
      conflicts.push(...result.conflicts)
    }
    else {
      // Key exists, record as skipped conflict
      conflicts.push({
        type: 'settings',
        name: key,
        existing: merged[key],
        incoming: value,
        suggestedResolution: 'use-existing',
      })
    }
  }

  return { merged, conflicts }
}

/**
 * Detect configuration conflicts
 */
function detectConflicts(
  existing: any,
  incoming: any,
  conflicts: ConfigConflict[],
  path = '',
): void {
  if (!isPlainObject(existing) || !isPlainObject(incoming)) {
    return
  }

  for (const [key, incomingValue] of Object.entries(incoming)) {
    const existingValue = existing[key]
    const currentPath = path ? `${path}.${key}` : key

    // Skip if key doesn't exist in existing config
    if (!(key in existing)) {
      continue
    }

    // Both are objects: recurse
    if (isPlainObject(existingValue) && isPlainObject(incomingValue)) {
      detectConflicts(existingValue, incomingValue, conflicts, currentPath)
      continue
    }

    // Both are arrays: check for differences
    if (Array.isArray(existingValue) && Array.isArray(incomingValue)) {
      if (JSON.stringify(existingValue) !== JSON.stringify(incomingValue)) {
        conflicts.push({
          type: determineConfigType(currentPath),
          name: currentPath,
          existing: existingValue,
          incoming: incomingValue,
          suggestedResolution: 'merge',
        })
      }
      continue
    }

    // Values are different: conflict
    if (existingValue !== incomingValue) {
      conflicts.push({
        type: determineConfigType(currentPath),
        name: currentPath,
        existing: existingValue,
        incoming: incomingValue,
        suggestedResolution: 'use-incoming',
      })
    }
  }
}

/**
 * Determine configuration item type from path
 */
function determineConfigType(path: string): ConfigItemType {
  const lowerPath = path.toLowerCase()

  if (lowerPath.includes('workflow') || lowerPath.includes('agent')) {
    return 'workflows'
  }

  if (lowerPath.includes('mcp') || lowerPath.includes('mcpserver')) {
    return 'mcp'
  }

  if (lowerPath.includes('profile')) {
    return 'profiles'
  }

  if (lowerPath.includes('hook')) {
    return 'hooks'
  }

  if (lowerPath.includes('skill')) {
    return 'skills'
  }

  return 'settings'
}

/**
 * Merge MCP service configurations
 *
 * Special handling to avoid duplicate MCP servers
 */
export function mergeMcpServices(
  existing: any,
  incoming: any,
  strategy: MergeStrategy,
): {
  merged: any
  conflicts: ConfigConflict[]
} {
  const conflicts: ConfigConflict[] = []

  if (!existing || !existing.mcpServers) {
    return { merged: incoming, conflicts }
  }

  if (!incoming || !incoming.mcpServers) {
    return { merged: existing, conflicts }
  }

  const merged = JSON.parse(JSON.stringify(existing))

  // Ensure mcpServers object exists
  if (!merged.mcpServers) {
    merged.mcpServers = {}
  }

  for (const [serverName, serverConfig] of Object.entries(incoming.mcpServers)) {
    if (strategy === 'replace' || !(serverName in merged.mcpServers)) {
      // Add new server or replace existing (in replace mode)
      merged.mcpServers[serverName] = serverConfig
    }
    else if (strategy === 'merge') {
      // Merge server configuration
      const existingConfig = merged.mcpServers[serverName]

      conflicts.push({
        type: 'mcp',
        name: serverName,
        existing: existingConfig,
        incoming: serverConfig,
        suggestedResolution: 'use-incoming',
      })

      // Merge the server config (incoming takes precedence)
      merged.mcpServers[serverName] = deepMerge(
        existingConfig,
        serverConfig as any,
        { mergeArrays: true, arrayMergeStrategy: 'unique' },
      )
    }
    else if (strategy === 'skip-existing') {
      // Skip if server already exists
      if (serverName in merged.mcpServers) {
        conflicts.push({
          type: 'mcp',
          name: serverName,
          existing: merged.mcpServers[serverName],
          incoming: serverConfig,
          suggestedResolution: 'use-existing',
        })
      }
    }
  }

  return { merged, conflicts }
}

/**
 * Merge workflow configurations
 *
 * Detects workflow name conflicts
 */
export function mergeWorkflows(
  existingWorkflows: string[],
  incomingWorkflows: string[],
  strategy: MergeStrategy,
): {
  merged: string[]
  conflicts: ConfigConflict[]
} {
  const conflicts: ConfigConflict[] = []

  if (!existingWorkflows || existingWorkflows.length === 0) {
    return { merged: incomingWorkflows || [], conflicts }
  }

  if (!incomingWorkflows || incomingWorkflows.length === 0) {
    return { merged: existingWorkflows, conflicts }
  }

  let merged: string[]

  if (strategy === 'replace') {
    merged = incomingWorkflows
  }
  else if (strategy === 'merge') {
    // Merge with unique values
    merged = [...new Set([...existingWorkflows, ...incomingWorkflows])]

    // Detect duplicates as conflicts
    const duplicates = existingWorkflows.filter(wf => incomingWorkflows.includes(wf))
    for (const workflow of duplicates) {
      conflicts.push({
        type: 'workflows',
        name: workflow,
        existing: workflow,
        incoming: workflow,
        suggestedResolution: 'merge',
      })
    }
  }
  else {
    // skip-existing: only add workflows that don't exist
    merged = [...existingWorkflows]
    for (const workflow of incomingWorkflows) {
      if (!existingWorkflows.includes(workflow)) {
        merged.push(workflow)
      }
      else {
        conflicts.push({
          type: 'workflows',
          name: workflow,
          existing: workflow,
          incoming: workflow,
          suggestedResolution: 'use-existing',
        })
      }
    }
  }

  return { merged, conflicts }
}

/**
 * Merge profile configurations (TOML profiles)
 *
 * Detects profile name conflicts
 */
export function mergeProfiles(
  existing: any,
  incoming: any,
  strategy: MergeStrategy,
): {
  merged: any
  conflicts: ConfigConflict[]
} {
  const conflicts: ConfigConflict[] = []

  if (!existing || !existing.profiles) {
    return { merged: incoming, conflicts }
  }

  if (!incoming || !incoming.profiles) {
    return { merged: existing, conflicts }
  }

  const merged = JSON.parse(JSON.stringify(existing))

  // Ensure profiles object exists
  if (!merged.profiles) {
    merged.profiles = {}
  }

  for (const [profileName, profileConfig] of Object.entries(incoming.profiles)) {
    if (strategy === 'replace' || !(profileName in merged.profiles)) {
      // Add new profile or replace existing
      merged.profiles[profileName] = profileConfig
    }
    else if (strategy === 'merge') {
      // Merge profile configuration
      const existingConfig = merged.profiles[profileName]

      conflicts.push({
        type: 'profiles',
        name: profileName,
        existing: existingConfig,
        incoming: profileConfig,
        suggestedResolution: 'use-incoming',
      })

      merged.profiles[profileName] = deepMerge(
        existingConfig,
        profileConfig as any,
        { mergeArrays: false },
      )
    }
    else if (strategy === 'skip-existing') {
      // Skip if profile already exists
      if (profileName in merged.profiles) {
        conflicts.push({
          type: 'profiles',
          name: profileName,
          existing: merged.profiles[profileName],
          incoming: profileConfig,
          suggestedResolution: 'use-existing',
        })
      }
    }
  }

  return { merged, conflicts }
}

/**
 * Resolve conflicts based on user choices
 *
 * @param config - Current configuration
 * @param conflicts - Detected conflicts
 * @param resolutions - User's resolution choices (conflict name -> resolution)
 * @returns Resolved configuration
 */
export function resolveConflicts(
  config: any,
  conflicts: ConfigConflict[],
  resolutions: Record<string, 'use-existing' | 'use-incoming' | 'merge' | 'rename'>,
): any {
  const resolved = JSON.parse(JSON.stringify(config))

  for (const conflict of conflicts) {
    const resolution = resolutions[conflict.name]

    if (!resolution) {
      continue
    }

    // Apply resolution based on user choice
    const pathParts = conflict.name.split('.')
    let current = resolved

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i]
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }

    const finalKey = pathParts[pathParts.length - 1]

    switch (resolution) {
      case 'use-existing':
        current[finalKey] = conflict.existing
        break
      case 'use-incoming':
        current[finalKey] = conflict.incoming
        break
      case 'merge':
        if (isPlainObject(conflict.existing) && isPlainObject(conflict.incoming)) {
          current[finalKey] = deepMerge(conflict.existing, conflict.incoming)
        }
        else if (Array.isArray(conflict.existing) && Array.isArray(conflict.incoming)) {
          current[finalKey] = [...new Set([...conflict.existing, ...conflict.incoming])]
        }
        else {
          current[finalKey] = conflict.incoming
        }
        break
      case 'rename':
        // For rename, use incoming but with a suffix
        current[`${finalKey}_imported`] = conflict.incoming
        break
    }
  }

  return resolved
}

/**
 * Get conflict summary for user review
 */
export function getConflictSummary(conflicts: ConfigConflict[]): {
  total: number
  byType: Record<ConfigItemType, number>
  critical: ConfigConflict[]
} {
  const byType: Record<ConfigItemType, number> = {
    settings: 0,
    profiles: 0,
    workflows: 0,
    agents: 0,
    mcp: 0,
    hooks: 0,
    skills: 0,
  }

  for (const conflict of conflicts) {
    byType[conflict.type] = (byType[conflict.type] || 0) + 1
  }

  // Critical conflicts are those affecting MCP services or profiles
  const critical = conflicts.filter(
    c => c.type === 'mcp' || c.type === 'profiles',
  )

  return {
    total: conflicts.length,
    byType,
    critical,
  }
}
