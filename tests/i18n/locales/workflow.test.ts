import { describe, expect, it } from 'vitest'
import enWorkflowData from '../../../src/i18n/locales/en/workflow.json'
import zhWorkflowData from '../../../src/i18n/locales/zh-CN/workflow.json'

describe('translation Files - Workflow', () => {
  describe('workflow Options (actually used keys)', () => {
    it('should include workflowOption.commonTools translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowOption.commonTools')
      expect(zhWorkflowData).toHaveProperty('workflowOption.commonTools')

      expect(enWorkflowData['workflowOption.commonTools']).toBe('Common Tools (Hierarchical Directory Initialization + General-purpose agents)')
      expect(zhWorkflowData['workflowOption.commonTools']).toBe('通用工具 (层级目录初始化 + 通用agents)')
    })

    it('should include workflowOption.sixStepsWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowOption.sixStepsWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowOption.sixStepsWorkflow')

      expect(enWorkflowData['workflowOption.sixStepsWorkflow']).toBe('Six Steps Workflow (workflow)')
      expect(zhWorkflowData['workflowOption.sixStepsWorkflow']).toBe('六步工作流 (workflow)')
    })

    it('should include workflowOption.gitWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowOption.gitWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowOption.gitWorkflow')

      expect(enWorkflowData['workflowOption.gitWorkflow']).toBe('Git Commands (commit + rollback + cleanBranches + worktree)')
      expect(zhWorkflowData['workflowOption.gitWorkflow']).toBe('Git 指令 (commit + rollback + cleanBranches + worktree)')
    })
  })

  describe('workflow Descriptions (actually used keys)', () => {
    it('should include workflowDescription.commonTools translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowDescription.commonTools')
      expect(zhWorkflowData).toHaveProperty('workflowDescription.commonTools')

      expect(enWorkflowData['workflowDescription.commonTools']).toBe('Provides project initialization and architecture analysis tools, including hierarchical directory initialization commands and intelligent architecture analysis agents')
      expect(zhWorkflowData['workflowDescription.commonTools']).toBe('提供项目初始化和架构分析工具，包含层级目录初始化命令和智能架构分析代理')
    })

    it('should include workflowDescription.sixStepsWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowDescription.sixStepsWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowDescription.sixStepsWorkflow')

      expect(enWorkflowData['workflowDescription.sixStepsWorkflow']).toBe('Professional development assistant structured six-step workflow')
      expect(zhWorkflowData['workflowDescription.sixStepsWorkflow']).toBe('专业开发助手的结构化六步工作流程')
    })

    it('should include workflowDescription.gitWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowDescription.gitWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowDescription.gitWorkflow')

      expect(enWorkflowData['workflowDescription.gitWorkflow']).toBe('Git version control related commands collection')
      expect(zhWorkflowData['workflowDescription.gitWorkflow']).toBe('Git 版本控制相关命令集合')
    })
  })

  describe('workflow Installation Messages', () => {
    it('should include common workflow installation messages', () => {
      expect(enWorkflowData).toHaveProperty('installingWorkflow')
      expect(zhWorkflowData).toHaveProperty('installingWorkflow')

      expect(enWorkflowData.installingWorkflow).toBe('Installing workflow')
      expect(zhWorkflowData.installingWorkflow).toBe('正在安装工作流')

      expect(enWorkflowData).toHaveProperty('workflowInstallSuccess')
      expect(zhWorkflowData).toHaveProperty('workflowInstallSuccess')

      expect(enWorkflowData.workflowInstallSuccess).toBe('workflow installed successfully')
      expect(zhWorkflowData.workflowInstallSuccess).toBe('工作流安装成功')
    })
  })

  describe('translation Key Consistency', () => {
    it('should have consistent translation keys between zh-CN and en', () => {
      const enKeys = Object.keys(enWorkflowData).sort()
      const zhKeys = Object.keys(zhWorkflowData).sort()

      expect(enKeys).toEqual(zhKeys)
    })
  })
})
