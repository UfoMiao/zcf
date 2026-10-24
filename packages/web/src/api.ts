import type { Message, PresetList, ToolStatus } from '@zcf/core'
import { isToolId, TOOL_NAMES } from '@zcf/core/schema'
import type { ApplyOutcome, Draft, LoadedConfig, PlanView, StepEvent, ZcfService } from '@zcf/ui-kit'

export type Translate = (key: string, params?: Record<string, string | number>) => string

// `zcf ui` puts the session token in the URL fragment, which browsers never send to servers.
const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? ''

async function call(path: string, init: Omit<RequestInit, 'headers'> = {}): Promise<Response> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-zcf-token': token },
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined)
    const message = typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : undefined
    throw new Error(message ?? `${response.status} ${response.statusText}`)
  }
  return response
}

/** Answers from our own server, which sends these shapes. */
async function json<T>(path: string, init?: Omit<RequestInit, 'headers'>): Promise<T> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await (await call(path, init)).json()) as T
}

let home = ''

/** A path with the home folder shown as `~`. */
export function tildify(path: string): string {
  return home && path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

export async function loadTranslator(): Promise<{ lang: string; t: Translate }> {
  const session = await json<{ lang: string; home: string; messages: Record<string, string> }>('session')
  const { lang, messages } = session
  home = session.home
  const t: Translate = (key, params = {}) =>
    (messages[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    )
  return { lang, t }
}

/** A core message in the user's language, with tool ids shown by name. */
export function messageText(t: Translate, message: Message): string {
  const params = { ...message.params }
  if (isToolId(params.tool)) params.tool = TOOL_NAMES[params.tool]
  return t(message.key, params)
}

/** The ZCF service over the local HTTP API of `zcf ui`. */
export const httpService: ZcfService = {
  load: () => json<LoadedConfig>('config'),
  save: async (draft: Draft, base?: Draft) => {
    await call('config', { method: 'PUT', body: JSON.stringify({ draft, base }) })
  },
  detect: () => json<Partial<Record<string, ToolStatus>>>('detect', { method: 'POST' }),
  plan: () => json<PlanView>('plan', { method: 'POST' }),
  presets: refresh => json<PresetList>(refresh ? 'presets?refresh' : 'presets'),
  async apply(onStep) {
    const response = await call('apply', { method: 'POST' })
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    let outcome: ApplyOutcome | undefined
    for (;;) {
      // Events arrive one JSON object per line, as each step finishes.
      // oxlint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines.filter(Boolean)) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const event = JSON.parse(line) as
          | ({ type: 'step' } & StepEvent)
          | ({ type: 'done' } & ApplyOutcome)
          | { type: 'error'; error: string }
        if (event.type === 'step') onStep?.(event)
        else if (event.type === 'error') throw new Error(event.error)
        else outcome = event
      }
    }
    if (!outcome) throw new Error('The apply stream ended early')
    return outcome
  },
}
