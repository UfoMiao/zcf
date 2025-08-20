import { describe, expect, it } from 'vitest'
import { workflow as enWorkflow } from '../../../src/i18n/locales/en/workflow'
import { workflow as zhWorkflow } from '../../../src/i18n/locales/zh-CN/workflow'

describe('translation Files - Workflow', () => {
  describe('chinese (zh-CN) Translation', () => {
    it('should include common tools workflow option translation', () => {
      expect(zhWorkflow.workflowOption).toHaveProperty('commonTools')
      expect(zhWorkflow.workflowOption.commonTools).toBe('通用工具 (层级目录初始化 + 通用agents)')
    })

    it('should include common tools workflow description', () => {
      expect(zhWorkflow).toHaveProperty('workflowDescription')
      expect(zhWorkflow.workflowDescription).toHaveProperty('commonTools')
      expect(zhWorkflow.workflowDescription.commonTools).toBe('提供项目初始化和架构分析工具，包含层级目录初始化命令和智能架构分析代理')
    })
  })

  describe('english (en) Translation', () => {
    it('should include common tools workflow option translation', () => {
      expect(enWorkflow.workflowOption).toHaveProperty('commonTools')
      expect(enWorkflow.workflowOption.commonTools).toBe('Common Tools (Hierarchical Directory Initialization + General-purpose agents)')
    })

    it('should include common tools workflow description', () => {
      expect(enWorkflow).toHaveProperty('workflowDescription')
      expect(enWorkflow.workflowDescription).toHaveProperty('commonTools')
      expect(enWorkflow.workflowDescription.commonTools).toBe('Provides project initialization and architecture analysis tools, including hierarchical directory initialization commands and intelligent architecture analysis agents')
    })
  })

  describe('translation Consistency', () => {
    it('should have consistent translation keys between zh-CN and en', () => {
      expect(Object.keys(zhWorkflow.workflowOption)).toEqual(Object.keys(enWorkflow.workflowOption))

      if (zhWorkflow.workflowDescription && enWorkflow.workflowDescription) {
        expect(Object.keys(zhWorkflow.workflowDescription)).toEqual(Object.keys(enWorkflow.workflowDescription))
      }
    })
  })
})
