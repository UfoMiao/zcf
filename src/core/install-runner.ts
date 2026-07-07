import type { AgentAdapter, AgentContext, InstallOptions } from '../adapters/adapter-interface'
import { TemplateEngine } from './template-engine'

export interface InstallRunnerOptions extends InstallOptions {
  /** Directory containing shared templates; defaults to `templates/common`. */
  commonDir?: string | false
}

/**
 * Orchestrate the full install flow for an agent adapter.
 *
 * Phase 0-2 (UFO-131) keeps adapters as thin wrappers over the existing
 * commands/utils. The runner therefore delegates the monolithic install to
 * {@link AgentAdapter.install} and then renders any shared common templates.
 *
 * Phase 3-4 (UFO-132) will split the adapter install into discrete steps so
 * the runner can explicitly sequence:
 *
 *   installCli → configureApi → installWorkflows → installMcp
 *
 * while the command layer only handles argument parsing and result display.
 */
export async function runInstall(adapter: AgentAdapter, options: InstallRunnerOptions, ctx: AgentContext): Promise<void> {
  const engine = new TemplateEngine({ force: options.force })

  // Step 1-4 (Phase 0-2): adapters currently implement the full legacy flow.
  await adapter.install(options, ctx)

  // Step 5: project shared common templates into the agent home directory.
  const commonDir = options.commonDir === false ? false : options.commonDir || 'templates/common'
  if (commonDir) {
    await engine.renderCommon(commonDir, adapter)
  }
}
