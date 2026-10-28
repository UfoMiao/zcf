import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:http'

import type { PlanStep, StepResult } from '@zcf/core'
import { parseBackupKeep, readTextIfExists } from '@zcf/core'
import type { ApplyOutcome, PlanView, ZcfService } from '@zcf/ui-kit'
import { isTable, TOOL_OPTIONS } from '@zcf/ui-kit'
import { extname, join, normalize } from 'pathe'

import type { Lang } from './i18n'
import { createTranslator, errorText, isLang, messagesFor } from './i18n'
import { maskSecrets } from './render'

export interface Asset {
  body: Uint8Array | string
  type: string
}

export interface UiServerOptions {
  service: ZcfService
  /** The language the server's own strings start from; each request can override it. */
  lang: Lang
  /** `--lang` or `ZCF_LANG` fixed the language, so the web UI stops following the config. */
  langPinned?: boolean
  /** Shown as `~` in paths. */
  home: string
  /** Serves the built web app; `path` is like `/assets/index.js`. */
  asset: (path: string) => Promise<Asset | undefined>
  port?: number
  /** Fixed in tests; random otherwise. */
  token?: string
}

export interface UiServer {
  /** The address to open, with the session token in its fragment. */
  url: string
  port: number
  close: () => Promise<void>
}

export const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

export function contentType(path: string): string {
  return CONTENT_TYPES[extname(path)] ?? 'application/octet-stream'
}

type Mask = (text: string) => string

function maskStep(step: PlanStep, mask: Mask): PlanStep {
  if (step.kind === 'file') return { ...step, path: mask(step.path), edits: [] }
  if (step.kind === 'remove') return { ...step, path: mask(step.path) }
  if (step.kind === 'copy') return { ...step, from: mask(step.from), to: mask(step.to) }
  return { ...step, args: step.args.map(mask) }
}

function maskResult(result: StepResult, mask: Mask): StepResult {
  return {
    ...result,
    step: maskStep(result.step, mask),
    detail: result.detail === undefined ? undefined : mask(result.detail),
  }
}

/**
 * The plan as the browser may see it: no file contents or edit values, and secrets
 * masked in what is left. `before` stays only as a marker of an existing file.
 */
export function browserPlan(view: PlanView): PlanView {
  const mask: Mask = text => maskSecrets(text, view.secrets)
  return {
    plan: {
      tools: view.plan.tools.map(toolPlan => ({
        ...toolPlan,
        steps: toolPlan.steps.map(step => maskStep(step, mask)),
      })),
    },
    previews: view.previews.map(row =>
      row.map(
        preview =>
          preview && {
            ...preview,
            path: mask(preview.path),
            before: preview.before === undefined ? undefined : '',
            after: '',
            patch: mask(preview.patch),
            secrets: [],
          },
      ),
    ),
    secrets: [],
  }
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : undefined
}

function send(response: ServerResponse, status: number, body?: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  response.end(body === undefined ? undefined : JSON.stringify(body))
}

function sameToken(given: string | undefined, token: string): boolean {
  if (!given || given.length !== token.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(token))
}

/**
 * The local server behind `zcf ui`. It listens on 127.0.0.1 only, serves the web app,
 * and answers a small JSON API backed by `service`. API calls need the session token,
 * and requests for another host name are refused, so other web pages cannot reach it.
 */
export async function startUiServer(options: UiServerOptions): Promise<UiServer> {
  const { service, lang } = options
  const token = options.token ?? randomBytes(24).toString('base64url')
  let port = 0

  // Errors speak the language the browser is showing, when it names a valid one.
  const t = (request: IncomingMessage) => {
    const raw = request.headers['x-zcf-lang']
    const asked = typeof raw === 'string' ? raw : undefined
    return createTranslator(isLang(asked) ? asked : lang)
  }

  async function api(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    const route = url.pathname.slice('/api/'.length)
    const header = request.headers['x-zcf-token']
    if (!sameToken(typeof header === 'string' ? header : undefined, token)) return send(response, 401)
    const method = request.method ?? 'GET'

    if (route === 'session' && method === 'GET')
      // Both dictionaries go out, so the browser can switch languages without asking again.
      return send(response, 200, {
        lang,
        langPinned: options.langPinned ?? false,
        home: options.home,
        messages: { en: messagesFor('en'), 'zh-CN': messagesFor('zh-CN') },
      })
    if (route === 'config' && method === 'GET') return send(response, 200, await service.load())
    if (route === 'config' && method === 'PUT') {
      const body = await readJson(request)
      if (!isTable(body) || !isTable(body.draft) || (body.base !== undefined && !isTable(body.base)))
        return send(response, 400)
      await service.save(body.draft, body.base)
      return send(response, 204)
    }
    if (route === 'presets' && method === 'GET')
      return send(response, 200, await service.presets(url.searchParams.has('refresh')))
    if (route === 'skills/search' && method === 'GET')
      return send(response, 200, await service.searchSkills(url.searchParams.get('q') ?? ''))
    if (route === 'detect' && method === 'POST') return send(response, 200, await service.detect(TOOL_OPTIONS))
    if (route === 'backups' && method === 'GET') return send(response, 200, await service.backups())
    if (route === 'backups/restore' && method === 'POST') {
      const body = await readJson(request)
      if (!isTable(body) || typeof body.id !== 'string') return send(response, 400)
      return send(response, 200, await service.restoreBackup(body.id))
    }
    if (route === 'backups/prune' && method === 'POST') {
      const body = await readJson(request)
      let keep: number | undefined
      if (isTable(body) && body.keep !== undefined) {
        keep = parseBackupKeep(body.keep)
        if (keep === undefined) return send(response, 400)
      }
      return send(response, 200, await service.pruneBackups(keep))
    }
    if (route === 'plan' && method === 'POST') {
      return send(response, 200, browserPlan(await service.plan()))
    }
    if (route === 'apply' && method === 'POST') {
      // Mask with the secrets of the config this request applies, not whatever another request planned.
      const { secrets } = await service.plan()
      // One JSON object per line: each finished step, then the outcome.
      response.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' })
      const mask: Mask = text => maskSecrets(text, secrets)
      const write = (event: unknown) => response.write(`${JSON.stringify(event)}\n`)
      let outcome: ApplyOutcome
      try {
        outcome = await service.apply(event =>
          write({ type: 'step', ...event, result: maskResult(event.result, mask) }),
        )
      } catch (error) {
        // The response has started, so the failure travels as the last event instead of a status code.
        write({ type: 'error', error: mask(errorText(error, t(request))) })
        response.end()
        return
      }
      write({
        type: 'done',
        backupDir: outcome.backupDir,
        results: outcome.results.map(({ tool, ok, steps }) => ({
          tool,
          ok,
          steps: steps.map(step => maskResult(step, mask)),
        })),
      })
      response.end()
      return
    }
    send(response, 404)
  }

  const server = createServer((request, response) => {
    // A page on another site could point a host name at 127.0.0.1 (DNS rebinding); only our own host is served.
    const host = request.headers.host ?? ''
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(response, 403)
    const url = new URL(request.url ?? '/', `http://${host}`)
    const { pathname } = url

    const handle = pathname.startsWith('/api/')
      ? api(request, response, url)
      : options.asset(pathname === '/' ? '/index.html' : pathname).then(asset => {
          if (!asset) return send(response, 404)
          response.writeHead(200, { 'content-type': asset.type })
          response.end(asset.body)
        })
    handle.catch(async (error: unknown) => {
      if (response.headersSent) response.end()
      else {
        // A plain Error's message can quote a command line and so leak a secret; mask it with the
        // secrets of the config on disk, the same source the apply path masks with. When planning
        // fails too (an invalid config, say), the error text is all there is to send.
        let secrets: readonly string[] = []
        try {
          secrets = (await service.plan()).secrets
        } catch {
          // Nothing more to mask with.
        }
        send(response, 500, { error: maskSecrets(errorText(error, t(request)), secrets) })
      }
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 0, '127.0.0.1', resolve)
  })
  const address = server.address()
  port = typeof address === 'object' && address ? address.port : 0
  return {
    url: `http://127.0.0.1:${port}/#token=${token}`,
    port,
    close: () =>
      new Promise<void>(resolve => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

/** Serve files from the first of `dirs` that has an index.html; undefined when none has. */
export async function fileAssets(
  dirs: readonly string[],
): Promise<((path: string) => Promise<Asset | undefined>) | undefined> {
  for (const dir of dirs) {
    // oxlint-disable-next-line no-await-in-loop
    if (await readTextIfExists(join(dir, 'index.html'))) {
      return async path => {
        const file = normalize(join(dir, path))
        // Never serve anything outside the web app folder.
        if (!file.startsWith(`${normalize(dir)}/`)) return undefined
        try {
          return { body: await readFile(file), type: contentType(file) }
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}
