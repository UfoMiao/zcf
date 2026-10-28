import type { BackupInfo, Message, PresetList, RestoreResult, SkillSearchList, ToolStatus } from '@zcf/core'
import { isConfigLanguage, isExtraId, EXTRA_NAMES, isToolId, TOOL_NAMES } from '@zcf/core/schema'
import type { ApplyOutcome, Draft, LoadedConfig, PlanView, StepEvent, ZcfService } from '@zcf/ui-kit'
import { interpolate, isLang, type Lang } from '@zcf/ui-kit'

export type { Lang } from '@zcf/ui-kit'

export type Translate = (key: string, params?: Record<string, string | number>) => string

// `zcf ui` puts the session token in the URL fragment, which browsers never send to servers.
const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? ''

// Sent with every call, so the server's own errors speak the language the page is showing.
let requestLang: Lang = 'en'
export function setRequestLang(lang: Lang): void {
  requestLang = lang
}

async function call(path: string, init: Omit<RequestInit, 'headers'> = {}): Promise<Response> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-zcf-token': token, 'x-zcf-lang': requestLang },
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

/** The language the browser itself asks for: any Chinese locale becomes `zh-CN`. */
export function browserLang(): Lang {
  return navigator.languages.some(code => code.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en'
}

export interface Session {
  /** The language the server resolved at startup, shown while the language is pinned. */
  startupLang: Lang
  /** `--lang` or `ZCF_LANG` fixed the language, so the UI stops following the config. */
  langPinned: boolean
  translators: Record<Lang, Translate>
}

export async function loadSession(): Promise<Session> {
  const session = await json<{
    lang: string
    langPinned: boolean
    home: string
    messages: Record<string, Record<string, string>>
  }>('session')
  home = session.home
  const of = (lang: Lang): Translate => {
    const messages = session.messages[lang] ?? {}
    return (key, params = {}) => interpolate(messages[key] ?? key, params)
  }
  return {
    startupLang: isLang(session.lang) ? session.lang : 'en',
    langPinned: session.langPinned,
    translators: { en: of('en'), 'zh-CN': of('zh-CN') },
  }
}

/** A core message in the user's language, with tool ids shown by name. */
export function messageText(t: Translate, message: Message): string {
  const params = { ...message.params }
  if (isToolId(params.tool)) params.tool = TOOL_NAMES[params.tool]
  if (isExtraId(params.extra)) params.extra = EXTRA_NAMES[params.extra]
  if (isConfigLanguage(params.language)) params.language = t(`language.${params.language}`)
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
  searchSkills: query => json<SkillSearchList>(`skills/search?q=${encodeURIComponent(query)}`),
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
  backups: () => json<BackupInfo[]>('backups'),
  restoreBackup: (id: string) =>
    json<RestoreResult>('backups/restore', { method: 'POST', body: JSON.stringify({ id }) }),
  pruneBackups: (keep?: number) => json<string[]>('backups/prune', { method: 'POST', body: JSON.stringify({ keep }) }),
}
