import { promises as fs } from 'node:fs'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

describe('chinese Template Files', () => {
  const templateDir = join(process.cwd(), 'templates', 'claude-code')

  describe('common workflow templates', () => {
    it('should have Chinese templates directory structure', async () => {
      const zhCommonDir = join(templateDir, 'zh-CN', 'workflow', 'common')

      expect(async () => await fs.access(zhCommonDir)).not.toThrow()

      const agentsDir = join(zhCommonDir, 'agents')
      const commandsDir = join(zhCommonDir, 'commands')

      expect(async () => await fs.access(agentsDir)).not.toThrow()
      expect(async () => await fs.access(commandsDir)).not.toThrow()
    })

    it('should have Chinese translation for init-project.md command', async () => {
      const filePath = join(templateDir, 'zh-CN', 'workflow', 'common', 'commands', 'init-project.md')

      expect(async () => await fs.access(filePath)).not.toThrow()

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toContain('初始化项目 AI 上下文')
      expect(content).toContain('生成/更新根级与模块级 CLAUDE.md 索引')
      expect(content).toContain('argument-hint: <项目摘要或名称>')
    })

    it('should have Chinese translation for init-architect.md agent', async () => {
      const filePath = join(templateDir, 'zh-CN', 'workflow', 'common', 'agents', 'init-architect.md')

      expect(async () => await fs.access(filePath)).not.toThrow()

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toContain('初始化架构师')
      expect(content).toContain('自适应初始化：根级简明 + 模块级详尽')
      expect(content).toContain('忽略规则获取策略')
      expect(content).not.toContain('忽略目录（可在代码中内置）')
    })

    it('should have Chinese translation for get-current-datetime.md agent', async () => {
      const filePath = join(templateDir, 'zh-CN', 'workflow', 'common', 'agents', 'get-current-datetime.md')

      expect(async () => await fs.access(filePath)).not.toThrow()

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toContain('执行日期命令并仅返回原始输出')
      expect(content).toContain('不添加任何文本、标题、格式或说明')
      expect(content).toContain('使用 get-current-datetime 代理')
    })

    it('should use appropriate time handling in init-architect', async () => {
      const filePath = join(templateDir, 'zh-CN', 'workflow', 'common', 'agents', 'init-architect.md')

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toContain('时间信息')
      expect(content).toContain('ISO-8601 格式')
    })

    it('should read .gitignore instead of hardcoded ignore patterns in init-architect', async () => {
      const filePath = join(templateDir, 'zh-CN', 'workflow', 'common', 'agents', 'init-architect.md')

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toContain('优先读取项目根目录的 `.gitignore` 文件')
      expect(content).toContain('如果 `.gitignore` 不存在，则使用以下默认忽略规则')
      expect(content).not.toContain('忽略目录（可在代码中内置）')
    })
  })
})
