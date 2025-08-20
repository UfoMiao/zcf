import { describe, expect, it } from 'vitest'
import { format, getLanguage, setLanguage, t } from '../../../src/utils/i18n'

describe('i18n utilities', () => {
  describe('t function', () => {
    it('should return translations for English', () => {
      setLanguage('en')
      const translations = t()
      expect(translations.common.yes).toBe('Yes')
      expect(translations.common.no).toBe('No')
      expect(translations.common.cancelled).toBe('Operation cancelled')
    })

    it('should return translations for Chinese', () => {
      setLanguage('zh-CN')
      const translations = t()
      expect(translations.common.yes).toBe('是')
      expect(translations.common.no).toBe('否')
      expect(translations.common.cancelled).toBe('操作已取消')
    })

    it('should have nested translation objects', () => {
      setLanguage('en')
      const translations = t()
      expect(translations.menu).toBeDefined()
      expect(translations.menu.menuOptions).toBeDefined()
      expect(translations.menu.menuOptions.fullInit).toBe('Full initialization')
      expect(translations.menu.menuDescriptions).toBeDefined()
      expect(translations.menu.menuDescriptions.fullInit).toBe('Install Claude Code + Import workflow + Configure API or CCR proxy + Configure MCP services')
    })

    it('should switch between languages', () => {
      setLanguage('en')
      let translations = t()
      expect(translations.common.yes).toBe('Yes')

      setLanguage('zh-CN')
      translations = t()
      expect(translations.common.yes).toBe('是')
    })

    it('should have all required keys', () => {
      setLanguage('en')
      const translations = t()
      expect(translations.menu.selectFunction).toBeDefined()
      expect(translations.api.configureApi).toBeDefined()
      expect(translations.mcp.configureMcp).toBeDefined()
    })
  })

  describe('format function', () => {
    it('should replace placeholders', () => {
      const template = 'Hello {name}, you have {count} messages'
      const result = format(template, { name: 'John', count: '5' })
      expect(result).toBe('Hello John, you have 5 messages')
    })

    it('should handle missing placeholders', () => {
      const template = 'Hello {name}'
      const result = format(template, {})
      expect(result).toBe('Hello {name}')
    })

    it('should handle multiple occurrences of same placeholder', () => {
      const template = '{name} is {name}'
      const result = format(template, { name: 'John' })
      expect(result).toBe('John is John')
    })

    it('should handle special characters in values', () => {
      const template = 'Path: {path}'
      const result = format(template, { path: 'C:\\Users\\Test\\Claude' })
      expect(result).toBe('Path: C:\\Users\\Test\\Claude')
    })

    it('should handle empty template', () => {
      const result = format('', { test: 'value' })
      expect(result).toBe('')
    })
  })

  describe('setLanguage and getLanguage functions', () => {
    it('should set and get language correctly', () => {
      setLanguage('en')
      expect(getLanguage()).toBe('en')

      setLanguage('zh-CN')
      expect(getLanguage()).toBe('zh-CN')
    })

    it('should affect t() output', () => {
      setLanguage('en')
      let translations = t()
      expect(translations.common.yes).toBe('Yes')

      setLanguage('zh-CN')
      translations = t()
      expect(translations.common.yes).toBe('是')
    })

    it('should maintain language state', () => {
      setLanguage('zh-CN')
      expect(getLanguage()).toBe('zh-CN')

      // Call t() doesn't change language
      t()
      expect(getLanguage()).toBe('zh-CN')
    })
  })

  describe('workflow translations', () => {
    it('should have workflow options in Chinese', () => {
      setLanguage('zh-CN')
      const translations = t()
      expect(translations.workflow).toBeDefined()
      expect(translations.workflow.workflowOption).toBeDefined()
      expect(translations.workflow.workflowOption.sixStepsWorkflow).toBe('六步工作流 (workflow)')
      expect(translations.workflow.workflowOption.featPlanUx).toBe('功能规划和 UX 设计 (feat + planner + ui-ux-designer)')
      expect(translations.workflow.workflowOption.bmadWorkflow).toBe('BMAD-Method 扩展安装器 (支持敏捷开发工作流)')
    })

    it('should have workflow options in English', () => {
      setLanguage('en')
      const translations = t()
      expect(translations.workflow).toBeDefined()
      expect(translations.workflow.workflowOption).toBeDefined()
      expect(translations.workflow.workflowOption.sixStepsWorkflow).toBe('Six Steps Workflow (workflow)')
      expect(translations.workflow.workflowOption.featPlanUx).toBe('Feature Planning and UX Design (feat + planner + ui-ux-designer)')
      expect(translations.workflow.workflowOption.bmadWorkflow).toBe('BMAD-Method Extension Installer (Agile Development Workflow)')
    })

    it('should have workflow install success messages', () => {
      setLanguage('en')
      const translations = t()
      expect(translations.workflow.workflowInstallSuccess).toBeDefined()
      expect(translations.workflow.workflowInstallError).toBeDefined()
    })
  })

  describe('menu translations', () => {
    it('should have menu options', () => {
      setLanguage('en')
      const translations = t()
      expect(translations.menu.menuOptions).toBeDefined()
      expect(translations.menu.menuOptions.fullInit).toBe('Full initialization')
      expect(translations.menu.menuOptions.importWorkflow).toBe('Import workflow')
      expect(translations.menu.menuOptions.configureApiOrCcr).toBe('Configure API / CCR proxy')
      expect(translations.menu.menuOptions.configureMcp).toBe('Configure MCP')
    })

    it('should have menu descriptions', () => {
      setLanguage('zh-CN')
      const translations = t()
      expect(translations.menu.menuDescriptions).toBeDefined()
      expect(translations.menu.menuDescriptions.fullInit).toBe('安装 Claude Code + 导入工作流 + 配置 API 或 CCR 代理 + 配置 MCP 服务')
      expect(translations.menu.menuDescriptions.importWorkflow).toBe('仅导入/更新工作流相关文件')
    })
  })

  describe('aPI configuration translations', () => {
    it('should have API related translations', () => {
      setLanguage('en')
      const translations = t()
      expect(translations.api.configureApi).toBe('Select API authentication method')
      expect(translations.api.useApiKey).toBe('Use API Key (Key authentication)')
      expect(translations.api.useAuthToken).toBe('Use Auth Token (OAuth authentication)')
      expect(translations.api.enterApiKey).toBe('Enter API Key')
    })

    it('should have API validation messages', () => {
      setLanguage('zh-CN')
      const translations = t()
      expect(translations.api.apiKeyValidation).toBeDefined()
      expect(translations.api.apiKeyValidation.empty).toBe('API Key 不能为空')
      expect(translations.api.apiKeyValidation.example).toBe('示例格式: sk-abcdef123456_789xyz')
    })
  })
})
