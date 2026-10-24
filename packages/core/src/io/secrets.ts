const SENSITIVE_KEY = /api[_-]?key|token|secret|passw(?:or)?d|credential|private[_-]?key|authorization|cookie/i
/** A key such as dsh's `apiKeyEnv` holds the name of the variable a credential is read from. */
const VARIABLE_NAME_KEY = /[_-]?env$/i

/** String values stored under credential-like keys, at any depth. Used to keep them out of printed output. */
export function sensitiveValues(data: unknown): string[] {
  const found: string[] = []
  const visit = (value: unknown, key: string | undefined): void => {
    if (typeof value === 'string') {
      if (key !== undefined && SENSITIVE_KEY.test(key) && !VARIABLE_NAME_KEY.test(key)) found.push(value)
    } else if (Array.isArray(value)) {
      for (const item of value) visit(item, key)
    } else if (typeof value === 'object' && value !== null) {
      for (const [childKey, child] of Object.entries(value)) visit(child, childKey)
    }
  }
  visit(data, undefined)
  return found
}
