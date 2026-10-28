import { resolveMirror, withMirrorEnv } from '../mirror'
import type { Plan, ToolPlan } from '../plan/types'
import type { Provider, ToolId, ZcfConfig } from '../schema/config'
import { claudeCode } from './claude-code'
import { codex } from './codex'
import { cursor } from './cursor'
import { dsh } from './dsh'
import { planExtras } from './extras'
import { geminiCli } from './gemini-cli'
import { opencode } from './opencode'
import { pi } from './pi'
import { notice, npmLatestPackage } from './shared'
import type { AdapterContext, ToolAdapter, ToolStatus } from './types'

export const ADAPTERS: Record<ToolId, ToolAdapter> = {
  'claude-code': claudeCode,
  codex,
  'gemini-cli': geminiCli,
  opencode,
  cursor,
  pi,
  dsh,
}

export async function detectTools(
  tools: readonly ToolId[],
  ctx: AdapterContext,
): Promise<Partial<Record<ToolId, ToolStatus>>> {
  const entries = await Promise.all(tools.map(async tool => [tool, await ADAPTERS[tool].detect(ctx)] as const))
  return Object.fromEntries(entries)
}

/**
 * Plan every selected tool in parallel. `tools` overrides the tools listed in the config.
 * When a mirror is in use, every command step gets its npm registry.
 */
export async function planTools(
  config: ZcfConfig,
  ctx: AdapterContext,
  tools: readonly ToolId[] = config.tools,
): Promise<Plan> {
  const mirror = resolveMirror({ override: ctx.mirror, env: ctx.env, config })
  const mirrored = { ...ctx, mirror }
  const plans = await Promise.all(
    [...new Set(tools)].map(async tool => {
      const adapter = ADAPTERS[tool]
      return adapter.plan(config, await adapter.detect(mirrored), mirrored)
    }),
  )
  // Companion tools ride along whenever the config asks for them, selected tools or not.
  const extras = await planExtras(config, mirrored)
  return withMirrorEnv({ tools: [...plans, ...extras] }, mirror, ctx.env)
}

/** Plan each tool's own update. The mirror is `ctx.mirror`, else `ZCF_MIRROR`. */
export async function planUpdates(tools: readonly ToolId[], ctx: AdapterContext): Promise<Plan> {
  const mirror = resolveMirror({ override: ctx.mirror, env: ctx.env })
  const mirrored = { ...ctx, mirror }
  const plans = await Promise.all(
    [...new Set(tools)].map(async tool => {
      const adapter = ADAPTERS[tool]
      const status = await adapter.detect(mirrored)
      const plan = await adapter.planUpdate(status, mirrored)
      if (status.version) plan.version = status.version
      return plan
    }),
  )
  const plan = withMirrorEnv({ tools: plans }, mirror, ctx.env)
  await Promise.all(plan.tools.map(toolPlan => skipCurrentNpmUpdate(toolPlan, ctx)))
  return plan
}

/**
 * Plan each tool's uninstall: its own uninstall channel (npm, the official uninstaller, or
 * the native files) and the settings ZCF wrote for it. No mirror applies; nothing downloads.
 */
export async function planUninstalls(
  tools: readonly ToolId[],
  ctx: AdapterContext,
  provider?: Provider,
): Promise<Plan> {
  const plans = await Promise.all(
    [...new Set(tools)].map(async tool => {
      const adapter = ADAPTERS[tool]
      return adapter.planUninstall(await adapter.detect(ctx), ctx, provider)
    }),
  )
  return { tools: plans }
}

/**
 * Drop an `npm install -g <pkg>@latest` update when the installed version already is
 * npm's latest. npm would reinstall the same version, which takes a while and proves nothing.
 */
async function skipCurrentNpmUpdate(toolPlan: ToolPlan, ctx: AdapterContext): Promise<void> {
  const [step] = toolPlan.steps
  const pkg = toolPlan.steps.length === 1 && step ? npmLatestPackage(step) : undefined
  if (!pkg || !toolPlan.version || step?.kind !== 'command') return
  // The same registry the update would use, so a mirror that lags behind is compared with itself.
  const result = await ctx.runner.run('npm', ['view', pkg, 'version'], step.env ? { env: step.env } : undefined)
  if (result.exitCode !== 0 || result.stdout.trim() !== toolPlan.version) return
  toolPlan.steps = []
  toolPlan.notices.push(notice('info', 'notice.upToDate', { tool: toolPlan.tool, version: toolPlan.version }))
}
