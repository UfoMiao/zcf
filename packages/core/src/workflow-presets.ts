import type { BuiltinAgentId, SkillSource } from './schema/config'

/** A ready-made bundle: the v3 workflow presets, each a name over built-in skills and agents. */
export interface WorkflowPreset {
  id: string
  /** The message key front ends translate: `workflow.preset.<id>`. */
  nameKey: string
  skills: readonly SkillSource[]
  agents: readonly BuiltinAgentId[]
}

/**
 * The presets v3 shipped, carried into v5 as data over the same built-in skills and
 * agents. Installing one merges its picks into the config's `skills` and `agents`.
 */
export const WORKFLOW_PRESETS: readonly WorkflowPreset[] = [
  {
    id: 'common',
    nameKey: 'workflow.preset.common',
    skills: [{ source: 'zcf', skills: ['init-project'] }],
    agents: ['init-architect', 'get-current-datetime'],
  },
  {
    id: 'six-steps',
    nameKey: 'workflow.preset.sixSteps',
    skills: [{ source: 'zcf', skills: ['workflow'] }],
    agents: [],
  },
  {
    id: 'feat',
    nameKey: 'workflow.preset.feat',
    skills: [{ source: 'zcf', skills: ['feat'] }],
    agents: ['planner', 'ui-ux-designer'],
  },
  {
    id: 'git',
    nameKey: 'workflow.preset.git',
    skills: [{ source: 'zcf', skills: ['git-commit', 'git-rollback', 'git-worktree', 'git-clean-branches'] }],
    agents: [],
  },
  {
    id: 'bmad',
    nameKey: 'workflow.preset.bmad',
    skills: [{ source: 'zcf', skills: ['bmad-init'] }],
    agents: [],
  },
]
