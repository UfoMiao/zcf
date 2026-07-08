import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

interface SkillFrontmatter {
  name?: string
  description?: string
  compatibility?: string
}

function parseFrontmatter(content: string): SkillFrontmatter | null {
  const normalized = content.replace(/\r\n/g, '\n')
  const match = /^---\n([\s\S]*?)\n---\n/.exec(normalized)
  if (!match)
    return null

  const meta: SkillFrontmatter = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      meta[key as keyof SkillFrontmatter] = value
    }
  }
  return meta
}

function* walkSkillDirs(skillsDir: string): Generator<string> {
  for (const entry of readdirSync(skillsDir)) {
    const fullPath = join(skillsDir, entry)
    if (statSync(fullPath).isDirectory()) {
      yield entry
    }
  }
}

describe('skill templates', () => {
  const skillsDir = join(process.cwd(), 'templates', 'claude-code', 'skills', 'zcf')

  it('should have a non-empty zcf skill directory', () => {
    const entries = readdirSync(skillsDir)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('should have a SKILL.md in every skill directory', () => {
    for (const skillName of walkSkillDirs(skillsDir)) {
      const skillFile = join(skillsDir, skillName, 'SKILL.md')
      expect(() => statSync(skillFile)).not.toThrow()
    }
  })

  it('should have valid frontmatter in every skill', () => {
    for (const skillName of walkSkillDirs(skillsDir)) {
      const content = readFileSync(join(skillsDir, skillName, 'SKILL.md'), 'utf-8')
      const frontmatter = parseFrontmatter(content)
      expect(frontmatter, `SKILL.md for ${skillName} should have YAML frontmatter`).not.toBeNull()
      expect(frontmatter?.name, `SKILL.md for ${skillName} should have a name`).toBeDefined()
      expect(frontmatter?.description, `SKILL.md for ${skillName} should have a description`).toBeDefined()
      if (frontmatter?.compatibility) {
        expect(frontmatter.compatibility, `SKILL.md for ${skillName} should target claude-code`).toBe('claude-code')
      }
    }
  })
})
