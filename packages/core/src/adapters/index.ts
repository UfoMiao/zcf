import { resolveMirror, withMirrorEnv } from '../mirror'
import type { Plan, ToolPlan } from '../plan/types'
import type { ToolId, ZcfConfig } from '../schema/config'
import { claudeCode } from './claude-code'
import { codex } from './codex'
import { cursor } from './cursor'
import { geminiCli } from './gemini-cli'
import { opencode } from './opencode'
import { pi } from './pi'
import type { AdapterContext, ToolAdapter, ToolStatus } from './types'

export const ADAPTERS: Partial<Record<ToolId, ToolAdapter>> = {
  'claude-code': claudeCode,
  codex,
  'gemini-cli': geminiCli,
  opencode,
  cursor,
  pi,
}

function unsupported(tool: ToolId): ToolPlan {
  return {
    tool,
    steps: [],
    notices: [
      {
        level: 'warning',
        message: {
          key: 'notice.toolNotSupported',
          params: { tool },
        },
      },
    ],
  }
}

export async function detectTools(
  tools: readonly ToolId[],
  ctx: AdapterContext,
): Promise<Partial<Record<ToolId, ToolStatus>>> {
  const entries = await Promise.all(
    tools.map(async tool => {
      const adapter = ADAPTERS[tool]
      return [tool, adapter ? await adapter.detect(ctx) : undefined] as const
    }),
  )
  return Object.fromEntries(entries.filter(([, status]) => status))
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
      if (!adapter) return unsupported(tool)
      return adapter.plan(config, await adapter.detect(mirrored), mirrored)
    }),
  )
  return withMirrorEnv({ tools: plans }, mirror, ctx.env)
}

/** Plan each tool's own update. The mirror is `ctx.mirror`, else `ZCF_MIRROR`. */
export async function planUpdates(tools: readonly ToolId[], ctx: AdapterContext): Promise<Plan> {
  const mirror = resolveMirror({ override: ctx.mirror, env: ctx.env })
  const mirrored = { ...ctx, mirror }
  const plans = await Promise.all(
    [...new Set(tools)].map(async tool => {
      const adapter = ADAPTERS[tool]
      if (!adapter) return unsupported(tool)
      return adapter.planUpdate(await adapter.detect(mirrored), mirrored)
    }),
  )
  return withMirrorEnv({ tools: plans }, mirror, ctx.env)
}
