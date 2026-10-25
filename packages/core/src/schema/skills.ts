import { join } from 'pathe'

import type { ConfigLanguage } from './config'

/**
 * The `source` value that stands for the skill templates ZCF ships with (v3's built-in
 * workflow skills). Adapters replace it with the local templates folder of the user's
 * language when planning, so the config stays a stable, machine-independent identifier.
 */
export const BUILTIN_SKILLS_SOURCE = 'zcf'

/**
 * The community index answers nothing for queries shorter than this, so both editors hold
 * back from asking and core never sends one.
 */
export const SKILLS_SEARCH_MIN_QUERY = 2

/** One skill of the built-in catalog the Skills page offers as checkboxes. */
export interface CatalogSkill {
  /** The skill's folder name in the templates, which is also the `skills` entry it installs. */
  id: string
  /** What the skill does, per language ZCF speaks; `en` is the fallback. */
  description: Readonly<Record<'en' | 'zh-CN', string>>
}

/**
 * The skills v3 shipped as its workflow templates, in the order v3's workflows installed
 * them. The templates live in `templates/skills/<language>/<id>/SKILL.md` and ship with the
 * published CLI, so the catalog is static: a skill changes with a ZCF release, unlike the
 * provider presets, which are fetched at runtime because they change without one.
 */
export const SKILLS_CATALOG: readonly CatalogSkill[] = [
  {
    id: 'init-project',
    description: {
      en: 'Generate CLAUDE.md context indexes for a project',
      'zh-CN': '生成项目级 CLAUDE.md 上下文索引',
    },
  },
  {
    id: 'workflow',
    description: {
      en: 'Run a six-phase development workflow with quality gates',
      'zh-CN': '运行带质量关卡的六阶段开发工作流',
    },
  },
  {
    id: 'feat',
    description: {
      en: 'Plan and build a new feature through a structured flow',
      'zh-CN': '以结构化流程规划并实现新功能',
    },
  },
  {
    id: 'git-commit',
    description: {
      en: 'Analyze changes and write conventional commit messages',
      'zh-CN': '分析改动并生成规范提交信息',
    },
  },
  {
    id: 'git-rollback',
    description: {
      en: 'Roll a branch back to an earlier version interactively',
      'zh-CN': '交互式回滚分支到历史版本',
    },
  },
  {
    id: 'git-clean-branches',
    description: {
      en: 'Preview and clean up merged or stale branches',
      'zh-CN': '预览并清理已合并或过期的分支',
    },
  },
  {
    id: 'git-worktree',
    description: {
      en: 'Manage git worktrees under a project-local folder',
      'zh-CN': '在项目旁目录中管理 git worktree',
    },
  },
  {
    id: 'bmad-init',
    description: {
      en: 'Initialize or update BMad-Method V6 in a project',
      'zh-CN': '在项目中初始化或更新 BMad-Method V6',
    },
  },
]

/** The description of a catalog skill in `lang`, falling back to English. */
export function skillDescription(skill: CatalogSkill, lang: string): string {
  const known = lang === 'en' || lang === 'zh-CN' ? lang : 'en'
  return skill.description[known]
}

/**
 * The templates folder `BUILTIN_SKILLS_SOURCE` installs from: the language folder of the
 * config's `configLanguage`, the language the configured tools work in. Unlike the interface
 * language it has no `auto`, so one config installs the same templates on every machine.
 */
export function builtinSkillsPath(dir: string, language: ConfigLanguage): string {
  return join(dir, language)
}
