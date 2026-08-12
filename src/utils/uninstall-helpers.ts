// Usage: Read uninstall artifacts while preserving missing-file and read-error semantics.
import { readFileSync } from 'node:fs'
// Usage: Recognize resources carrying a ZCF ownership marker.
import { isZcfResourceContent } from './config-ownership'

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function formatHomePath(filePath: string, homeDirectory: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const normalizedHome = homeDirectory.replace(/\\/g, '/').replace(/\/+$/, '')

  if (normalizedPath === normalizedHome)
    return '~'

  const homePrefix = `${normalizedHome}/`
  return normalizedPath.startsWith(homePrefix)
    ? `~${normalizedPath.slice(normalizedHome.length)}`
    : normalizedPath
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function readTextFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf8')
  }
  catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return null
    throw error
  }
}

/** Remove TOML sections owned by the given section names while keeping others intact. */
export function removeTomlSections(content: string, sectionNames: readonly string[]): string | null {
  const ownedSections = new Set(sectionNames.map(section => section.toLowerCase()))
  const lines = content.split(/\r?\n/)
  const output: string[] = []
  let inOwnedSection = false
  let removed = false

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
      const sectionName = trimmedLine.slice(1, -1).trim().toLowerCase()
      inOwnedSection = false
      for (const section of ownedSections) {
        if (sectionName === section || sectionName.startsWith(`${section}.`)) {
          inOwnedSection = true
          break
        }
      }
    }

    if (inOwnedSection) {
      removed = true
      continue
    }
    output.push(line)
  }

  if (!removed)
    return null

  return output.join('\n').replace(/\n{3,}/g, '\n\n')
}

export function hasFrontmatterValue(content: string, key: string, value: string): boolean {
  const normalizedContent = content.replace(/\r\n?/g, '\n')
  if (!normalizedContent.startsWith('---\n'))
    return false
  const frontmatterEnd = normalizedContent.indexOf('\n---', 4)
  if (frontmatterEnd < 0)
    return false
  const frontmatter = normalizedContent.slice(4, frontmatterEnd)

  return new RegExp(`^[ \t]*${escapeRegExp(key)}:[ \t]*['"]?${escapeRegExp(value)}['"]?[ \t]*$`, 'im').test(frontmatter)
}

export function isZcfOutputStyleContent(styleName: string, content: string): boolean {
  const outputStyleSectionPattern = new RegExp(
    '^##[ \t]+(?:'
    + 'Style Overview|样式概述|Identity Definition|身份定义|'
    + 'Core Identity Setting|核心身份设定|'
    + 'Core Behavioral Standards|核心行为规范|Core Behavior Protocols|核心行为协议'
    + ')[ \t]*$',
    'im',
  )

  return isZcfResourceContent(content)
    && hasFrontmatterValue(content, 'name', styleName)
    && /^#[ \t][^\r\n]*(?:Output Style|输出样式)[ \t]*$/im.test(content)
    && outputStyleSectionPattern.test(content)
}

export function isZcfSkillContent(skillName: string, content: string): boolean {
  return isZcfResourceContent(content)
    && hasFrontmatterValue(content, 'name', skillName)
    && /^disable-model-invocation:[ \t]*true[ \t]*$/im.test(content)
}
