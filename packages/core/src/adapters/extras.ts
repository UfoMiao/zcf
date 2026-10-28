import type { CommandStep, PlanStep, ToolPlan } from '../plan/types'
import type { ZcfConfig } from '../schema/config'
import { notice, probe } from './shared'
import type { AdapterContext } from './types'

/** The magpie gateway's local address; its installer script, one file for both faces. */
const MAGPIE_INSTALL_URL = 'https://usemagpie.ai/install.sh'
/**
 * The mirror prefix magpie's installer takes: the bare proxy address, which the installer
 * puts in front of the whole github.com release URL. Unlike git's insteadOf prefix, it must
 * not itself end in github.com or the joined URL would name github.com twice (a real 404).
 */
const MAGPIE_MIRROR_PREFIX = 'https://gh-proxy.com'
/** The npm wrapper that puts the ccline binary in `~/.claude/ccline/ccline`. */
const CCLINE_PACKAGE = '@cometix/ccline'

/**
 * Plan the companion tools the config asks for. They are not `ToolId`s: the tools page
 * lists coding tools only, and these take no per-tool config — just their install, run
 * through the same plan/apply machinery so the diff, backups and summary all apply.
 */
export async function planExtras(config: ZcfConfig, ctx: AdapterContext): Promise<ToolPlan[]> {
  const plans: ToolPlan[] = []
  const { magpie, ccline } = config.extras ?? {}

  if (magpie) {
    const steps: PlanStep[] = []
    const notices = []
    if (await probe(ctx, 'magpie')) notices.push(notice('info', 'notice.extraInstalled', { extra: 'magpie' }))
    else if (ctx.platform === 'win32') {
      // The installer script is a POSIX shell one; Windows takes the desktop download.
      notices.push(notice('warning', 'notice.magpieWindows', {}))
    } else {
      // pipefail: a failed download must fail the step, not run an empty script. The
      // mirror flag is the installer's own (`sh -s --`), not curl's.
      const script = `set -o pipefail; curl -fsSL ${MAGPIE_INSTALL_URL} | sh -s --${
        ctx.mirror === 'china' ? ` --mirror ${MAGPIE_MIRROR_PREFIX}` : ''
      }`
      const step: CommandStep = {
        kind: 'command',
        title: { key: 'step.installExtra', params: { extra: 'magpie' } },
        command: 'bash',
        args: ['-c', script],
      }
      steps.push(step)
    }
    notices.push(magpie === 'cli' ? notice('info', 'notice.magpieCli', {}) : notice('info', 'notice.magpieClient', {}))
    plans.push({ tool: 'magpie', steps, notices })
  }

  if (ccline) {
    const steps: PlanStep[] = []
    if (!(await probe(ctx, 'ccline')))
      steps.push({
        kind: 'command',
        title: { key: 'step.installExtra', params: { extra: 'ccline' } },
        command: 'npm',
        // npm 12 blocks install scripts unless allowed; ccline's postinstall is what puts
        // the binary in ~/.claude/ccline, where the statusLine points.
        args: ['install', '-g', `--allow-scripts=${CCLINE_PACKAGE}`, CCLINE_PACKAGE],
      })
    // The statusLine key itself is the claude-code adapter's to write, next to the rest
    // of the settings it owns; without that tool selected the notice says what is missing.
    const notices = config.tools.includes('claude-code') ? [] : [notice('warning', 'notice.cclineNeedsTool', {})]
    plans.push({ tool: 'ccline', steps, notices })
  }

  return plans
}
