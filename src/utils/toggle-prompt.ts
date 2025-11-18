import toggleModule from 'inquirer-toggle'

const togglePrompt: typeof import('inquirer-toggle')['default'] = (
  (toggleModule as any)?.default?.default
  || (toggleModule as any)?.default
  || toggleModule
) as typeof import('inquirer-toggle')['default']

type ToggleOptions = Parameters<typeof togglePrompt>[0]

export interface BooleanPromptOptions {
  message: string
  defaultValue?: boolean
  theme?: ToggleOptions['theme']
}

/**
 * Wrapper around inquirer-toggle to keep boolean prompts consistent.
 * Keeps the API minimal to align with KISS/YAGNI while allowing optional theme overrides.
 */
export async function promptBoolean(options: BooleanPromptOptions): Promise<boolean> {
  const { message, defaultValue = false, theme } = options

  return await togglePrompt({
    message,
    default: defaultValue,
    ...(theme ? { theme } : {}),
  })
}
