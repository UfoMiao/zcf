import type { ParseError } from 'jsonc-parser'
import { parse } from 'jsonc-parser'
import { join } from 'pathe'

import { readTextIfExists } from './io/fs'
import type { ParseConfigResult } from './schema/config'
import { parseZcfConfig } from './schema/config'

export function defaultConfigPath(home: string): string {
  return join(home, '.ufomiao', 'zcf', 'zcf.json')
}

export type LoadConfigResult = ParseConfigResult | { success: false; missing: true; issues: [] }

/** Read and validate a ZCF config file. Comments and trailing commas are allowed. */
export async function loadConfigFile(path: string): Promise<LoadConfigResult> {
  const text = await readTextIfExists(path)
  if (text === undefined) return { success: false, missing: true, issues: [] }

  const errors: ParseError[] = []
  const data = parse(text, errors, { allowTrailingComma: true })
  // Later syntax errors are usually knock-on effects of the first one.
  const [first] = errors
  if (first) {
    const lines = text.slice(0, first.offset).split('\n')
    return {
      success: false,
      issues: [
        {
          path: '',
          message: {
            key: 'configIssue.syntax',
            params: { line: lines.length, column: lines.at(-1)!.length + 1 },
          },
        },
      ],
    }
  }
  return parseZcfConfig(data)
}
