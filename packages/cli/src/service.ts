import type { AdapterContext, ZcfConfig } from '@zcf/core'
import {
  applyPlan,
  detectTools,
  loadConfigDraft,
  loadConfigFile,
  planTools,
  previewPlan,
  saveConfigDraft,
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
  if (!result.success) throw new Error(`The ZCF config at ${path} is missing or not valid`)
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
  return {
    async load() {
      const loaded = await loadConfigDraft(path)
      return loaded.draft
        ? { path, draft: loaded.draft, exists: loaded.exists, issues: [] }
        : { path, exists: true, issues: loaded.issues }
    },
    save: draft => saveConfigDraft(path, draft),
    detect: tools => detectTools(tools, ctx),
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
