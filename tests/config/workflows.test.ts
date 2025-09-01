import { beforeAll, describe, expect, it } from 'vitest'
import { getOrderedWorkflows, WORKFLOW_CONFIG_BASE } from '../../src/config/workflows'
import { ensureI18nInitialized } from '../../src/i18n'

describe('workflow Configuration', () => {
  beforeAll(() => {
    ensureI18nInitialized()
  })

  describe('common Tools Workflow', () => {
    it('should have common tools as the first workflow option', () => {
      const orderedWorkflows = getOrderedWorkflows()

      expect(orderedWorkflows.length).toBeGreaterThan(0)
      expect(orderedWorkflows[0].id).toBe('commonTools')
      expect(orderedWorkflows[0].order).toBe(1)
    })

    it('should have correct configuration for common tools workflow', () => {
      const commonToolsWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'commonTools')

      expect(commonToolsWorkflow).toBeDefined()
      expect(commonToolsWorkflow).toMatchObject({
        id: 'commonTools',
        defaultSelected: true,
        order: 1,
        category: 'common',
        outputDir: 'common',
        autoInstallAgents: true,
      })
    })

    it('should include correct commands for common tools workflow', () => {
      const commonToolsWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'commonTools')

      expect(commonToolsWorkflow?.commands).toEqual(['init-project.md'])
    })

    it('should include correct agents for common tools workflow', () => {
      const commonToolsWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'commonTools')

      expect(commonToolsWorkflow?.agents).toEqual([
        { id: 'init-architect', filename: 'init-architect.md', required: true },
        { id: 'get-current-datetime', filename: 'get-current-datetime.md', required: true },
      ])
    })

    it('should shift other workflows order by 1', () => {
      const orderedWorkflows = getOrderedWorkflows()

      // Six steps workflow should now be order 2
      const sixStepsWorkflow = orderedWorkflows.find(w => w.id === 'sixStepsWorkflow')
      expect(sixStepsWorkflow?.order).toBe(2)

      // Feature planning should now be order 3
      const featPlanWorkflow = orderedWorkflows.find(w => w.id === 'featPlanUx')
      expect(featPlanWorkflow?.order).toBe(3)

      // Git workflow should now be order 4
      const gitWorkflow = orderedWorkflows.find(w => w.id === 'gitWorkflow')
      expect(gitWorkflow?.order).toBe(4)

      // BMAD workflow should now be order 5
      const bmadWorkflow = orderedWorkflows.find(w => w.id === 'bmadWorkflow')
      expect(bmadWorkflow?.order).toBe(5)
    })
  })
})
