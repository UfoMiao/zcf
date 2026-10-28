import type { AdapterContext, ConfigDraft, Mirror, ZcfConfig } from '@zcf/core'
import {
  applyPlan,
  BackupRun,
  backupRunDir,
  detectTools,
  envMirror,
  isMirror,
  listBackups,
  loadConfigDraft,
  loadPresets,
  type PresetList,
  loadConfigFile,
  MessageError,
  planTools,
  previewPlan,
  pruneBackups,
  resolveMirror,
  restoreBackup,
  saveConfigDraft,
  searchSkills,
} from '@zcf/core'
import type { PlanView, ZcfService } from '@zcf/ui-kit'
import { join } from 'pathe'

import { collectSecrets } from './render'

/** Where every backup run of this home lives. */
export function backupsRoot(home: string): string {
  return join(home, '.ufomiao', 'zcf', 'backups')
}

export function backupFolder(home: string, now: Date): string {
  return backupRunDir(backupsRoot(home), now)
}

/**
 * The provider presets for this machine: fetched through the mirror in play (the context's, or
 * the override `zcf init --mirror` gives), cached under home the way `loadPresets` keeps it.
 * `configMirror` is the mirror the config names, as the draft writes it.
 */
export function loadPresetsFor(
  ctx: AdapterContext,
  configMirror: unknown,
  options: { override?: Mirror; fetch?: typeof globalThis.fetch; refresh?: boolean } = {},
): Promise<PresetList> {
  return loadPresets({
    // Presets come from GitHub, so they follow the mirror like other downloads.
    mirror: resolveMirror({
      override: options.override ?? ctx.mirror,
      env: ctx.env,
      config: { mirror: isMirror(configMirror) ? configMirror : undefined },
    }),
    cacheDir: join(ctx.home, '.ufomiao', 'zcf', 'cache'),
    env: ctx.env,
    fetch: options.fetch,
    refresh: options.refresh,
  })
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
  // The run this session's saves are backed up into, written to before the first of them.
  let saveRun: BackupRun | undefined
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
      if (!saveRun) {
        const at = now()
        saveRun = new BackupRun(backupRunDir(backupsRoot(ctx.home), at), ctx.home, () => at, 'save')
      }
      await saveRun.snapshot(path)
      await saveRun.finish()
      // Each editor passes its own base: with two browser tabs open, one tab's save must not
      // undo what the other saved.
      await saveConfigDraft(path, draft, base ?? current)
      current = draft
    },
    detect: tools => detectTools(tools, ctx),
    presets: refresh => loadPresetsFor(ctx, current?.mirror, { refresh }),
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
    backups: () => listBackups(backupsRoot(ctx.home)),
    restoreBackup: async id => {
      const root = backupsRoot(ctx.home)
      if (!(await listBackups(root)).some(backup => backup.id === id))
        throw new MessageError({ key: 'cli.backup.missing', params: { id } }, `No backup with id ${id}`)
      return restoreBackup(root, id, ctx.home, now)
    },
    pruneBackups: keep => pruneBackups(backupsRoot(ctx.home), keep),
  }
}
