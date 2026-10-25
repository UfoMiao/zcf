import type { AdapterContext, ConfigDraft, ZcfConfig } from '@zcf/core'
import {
  applyPlan,
  detectTools,
  envMirror,
  isMirror,
  loadConfigDraft,
  loadPresets,
  loadConfigFile,
  MessageError,
  planTools,
  previewPlan,
  resolveMirror,
  saveConfigDraft,
  searchSkills,
  snapshotFile,
} from '@zcf/core'
import type { PlanView, ZcfService } from '@zcf/ui-kit'
import { join } from 'pathe'

import { collectSecrets } from './render'

export function backupFolder(home: string, now: Date): string {
  return join(home, '.ufomiao', 'zcf', 'backups', now.toISOString().replace(/[:.]/g, '-'))
}

/** The config at `path`, validated; throws when it is missing or invalid, which front ends prevent by saving first. */
async function savedConfig(path: string): Promise<ZcfConfig> {
  const result = await loadConfigFile(path)
  if (!result.success) {
    throw new MessageError({ key: 'service.configInvalid', params: { path } }, `The ZCF config at ${path} is not valid`)
  }
  return result.config
}

/** Plan a config and preview every file step, with the secrets front ends must mask. */
export async function planWithPreviews(config: ZcfConfig, ctx: AdapterContext): Promise<PlanView> {
  const plan = await planTools(config, ctx)
  const byStep = await previewPlan(plan, ctx.readFile)
  const previews = plan.tools.map(toolPlan => toolPlan.steps.map(step => byStep.get(step) ?? null))
  const fileSecrets = [...byStep.values()].flatMap(preview => preview.secrets)
  return { plan, previews, secrets: collectSecrets(config, fileSecrets) }
}

/** The ZCF service backed by this machine: the config file at `path` and the real tools. */
export function createLocalService(ctx: AdapterContext, path: string, now: () => Date = () => new Date()): ZcfService {
  // The draft as last loaded or saved, for the mirror and for a save that does not pass its own base.
  let current: ConfigDraft | undefined
  // The file as it was before the first save of this session, for when a save goes wrong.
  let backedUp = false
  return {
    async load() {
      const loaded = await loadConfigDraft(path)
      current = loaded.draft
      const env = envMirror(ctx.env)
      const result = loaded.draft
        ? { path, draft: loaded.draft, exists: loaded.exists, issues: [] }
        : { path, exists: true, issues: loaded.issues }
      return env ? { ...result, envMirror: env } : result
    },
    async save(draft, base) {
      if (!backedUp) {
        await snapshotFile(path, backupFolder(ctx.home, now()), ctx.home)
        backedUp = true
      }
      // Each editor passes its own base: with two browser tabs open, one tab's save must not
      // undo what the other saved.
      await saveConfigDraft(path, draft, base ?? current)
      current = draft
    },
    detect: tools => detectTools(tools, ctx),
    presets: refresh =>
      loadPresets({
        // Presets come from GitHub, so they follow the mirror like other downloads.
        mirror: resolveMirror({
          override: ctx.mirror,
          env: ctx.env,
          config: { mirror: isMirror(current?.mirror) ? current.mirror : undefined },
        }),
        cacheDir: join(ctx.home, '.ufomiao', 'zcf', 'cache'),
        env: ctx.env,
        refresh,
      }),
    searchSkills: query => searchSkills(query, { env: ctx.env }),
    plan: async () => planWithPreviews(await savedConfig(path), ctx),
    async apply(onStep) {
      const config = await savedConfig(path)
      const plan = await planTools(config, ctx)
      const backupDir = backupFolder(ctx.home, now())
      const results = await applyPlan(plan, {
        runner: ctx.runner,
        backupDir,
        home: ctx.home,
        onEvent: event => {
          if (event.type === 'step-end') onStep?.({ tool: event.tool, index: event.index, result: event.result })
        },
      })
      return { results, backupDir }
    },
  }
}
