// Usage: Hash sensitive configuration values without storing plaintext.
import { createHash } from 'node:crypto'

export const ZCF_API_ENV_KEYS = new Set([
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
])

export function hashConfigValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

const ZCF_SYSTEM_PROMPT_MARKER = /^<!--\s*ZCF managed system prompt:\s*([a-f0-9]{64})\s*-->\r?\n?/i

const ZCF_LANGUAGE_DIRECTIVE_MARKER = /<!--\s*ZCF managed language directive:\s*([a-f0-9]{64})\s*-->\r?\n?/i
const ZCF_RESOURCE_MARKER = /(?:^|\n)<!--\s*ZCF managed resource:\s*([a-f0-9]{64})\s*-->\s*$/i

export function markZcfSystemPrompt(content: string): string {
  const normalizedContent = content.replace(/\r\n?/g, '\n').replace(ZCF_SYSTEM_PROMPT_MARKER, '')
  return `<!-- ZCF managed system prompt: ${hashConfigValue(normalizedContent)} -->\n${normalizedContent}`
}

export function getZcfSystemPromptContent(content: string): { body: string, hash: string } | null {
  const marker = ZCF_SYSTEM_PROMPT_MARKER.exec(content)
  if (!marker)
    return null

  return {
    body: content.slice(marker[0].length).replace(/\r\n?/g, '\n'),
    hash: marker[1].toLowerCase(),
  }
}

export function isZcfSystemPromptContent(content: string): boolean {
  const ownership = getZcfSystemPromptContent(content)
  return ownership !== null && ownership.hash === hashConfigValue(ownership.body)
}

export function markZcfLanguageDirective(content: string): string {
  const normalizedContent = content.replace(/\r\n?/g, '\n').trim()
  return `<!-- ZCF managed language directive: ${hashConfigValue(normalizedContent)} -->\n${normalizedContent}\n`
}

export function getZcfLanguageDirectiveContent(content: string): { body: string, hash: string } | null {
  const normalizedContent = content.replace(/\r\n?/g, '\n')
  const marker = ZCF_LANGUAGE_DIRECTIVE_MARKER.exec(normalizedContent)
  if (!marker)
    return null

  return {
    body: normalizedContent.slice(marker.index + marker[0].length),
    hash: marker[1].toLowerCase(),
  }
}

function getOwnedLanguageDirective(content: string): { start: number, end: number } | null {
  const normalizedContent = content.replace(/\r\n?/g, '\n')
  const marker = ZCF_LANGUAGE_DIRECTIVE_MARKER.exec(normalizedContent)
  if (!marker)
    return null

  const bodyStart = marker.index + marker[0].length
  const body = normalizedContent.slice(bodyStart)
  const directive = body.match(
    /^\*\*Most Important:\s*Always respond in [^*]+\*\*(?:\n|$)/i,
  ) || body.match(/^Always respond in [^\n]+(?:\n|$)/i)
  if (!directive)
    return null

  const directiveText = directive[0].replace(/\n$/, '').trim()
  if (hashConfigValue(directiveText) !== marker[1].toLowerCase())
    return null

  return { start: marker.index, end: bodyStart + directive[0].length }
}

export function isZcfLanguageDirectiveContent(content: string): boolean {
  const normalizedContent = content.replace(/\r\n?/g, '\n')
  const ownership = getOwnedLanguageDirective(normalizedContent)
  if (!ownership || normalizedContent.slice(0, ownership.start).trim() !== '')
    return false

  return normalizedContent.slice(ownership.end).trim() === ''
}

export function stripZcfLanguageDirective(content: string): string | null {
  const normalizedContent = content.replace(/\r\n?/g, '\n')
  const ownership = getOwnedLanguageDirective(normalizedContent)
  if (!ownership)
    return null

  const before = normalizedContent.slice(0, ownership.start).trimEnd()
  const after = normalizedContent.slice(ownership.end).replace(/^\n+/, '')
  if (!before)
    return after
  if (!after)
    return before
  return `${before}\n${after}`
}

export function markZcfResourceContent(content: string): string {
  const normalizedContent = content.replace(/\r\n?/g, '\n').trimEnd()
  return `${normalizedContent}\n<!-- ZCF managed resource: ${hashConfigValue(normalizedContent)} -->\n`
}

export function isZcfResourceContent(content: string): boolean {
  const normalizedContent = content.replace(/\r\n?/g, '\n')
  const marker = ZCF_RESOURCE_MARKER.exec(normalizedContent)
  if (!marker)
    return false

  const body = normalizedContent.slice(0, marker.index).trimEnd()
  return marker[1].toLowerCase() === hashConfigValue(body)
}

/** Match a markerless artifact against an immutable legacy template snapshot. */
export function isLegacyZcfResourceContent(content: string, fingerprints: readonly string[]): boolean {
  if (isZcfResourceContent(content))
    return false

  const normalizedContent = content.replace(/\r\n?/g, '\n').trimEnd()
  return fingerprints.includes(hashConfigValue(normalizedContent))
}

export function createConfigValueHashes(values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([key, value]) => ZCF_API_ENV_KEYS.has(key) && typeof value === 'string')
      .map(([key, value]) => [key, hashConfigValue(value as string)]),
  )
}
