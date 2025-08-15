import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getWorkflowConfig, getOrderedWorkflows, WORKFLOW_CONFIGS } from '../../../src/config/workflows';
import type { WorkflowConfig } from '../../../src/types/workflow';

describe('workflows configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WORKFLOW_CONFIGS', () => {
    it('should include gitWorkflow configuration', () => {
      const gitWorkflow = WORKFLOW_CONFIGS.find((w) => w.id === 'gitWorkflow');
      expect(gitWorkflow).toBeDefined();
      expect(gitWorkflow).toMatchObject({
        id: 'gitWorkflow',
        nameKey: 'workflowOption.gitWorkflow',
        descriptionKey: 'workflowDescription.gitWorkflow',
        defaultSelected: true,
        order: 3,
        category: 'git',
        outputDir: 'git',
        autoInstallAgents: false,
      });
    });

    it('should have correct commands for gitWorkflow', () => {
      const gitWorkflow = WORKFLOW_CONFIGS.find((w) => w.id === 'gitWorkflow');
      expect(gitWorkflow?.commands).toEqual(['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md']);
    });

    it('should have no agents for gitWorkflow', () => {
      const gitWorkflow = WORKFLOW_CONFIGS.find((w) => w.id === 'gitWorkflow');
      expect(gitWorkflow?.agents).toEqual([]);
    });

    it('should have unique workflow ids', () => {
      const ids = WORKFLOW_CONFIGS.map((w) => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories = ['plan', 'sixStep', 'bmad', 'git'];
      WORKFLOW_CONFIGS.forEach((config) => {
        expect(validCategories).toContain(config.category);
      });
    });
  });

  describe('getWorkflowConfig', () => {
    it('should return gitWorkflow configuration when requested', () => {
      const config = getWorkflowConfig('gitWorkflow');
      expect(config).toBeDefined();
      expect(config?.id).toBe('gitWorkflow');
      expect(config?.category).toBe('git');
      expect(config?.commands).toContain('git-commit.md');
    });

    it('should return undefined for non-existent workflow', () => {
      const config = getWorkflowConfig('nonExistentWorkflow');
      expect(config).toBeUndefined();
    });

    it('should return correct config for all existing workflows', () => {
      const workflowIds = ['sixStepsWorkflow', 'featPlanUx', 'bmadWorkflow', 'gitWorkflow'];
      workflowIds.forEach((id) => {
        const config = getWorkflowConfig(id);
        expect(config).toBeDefined();
        expect(config?.id).toBe(id);
      });
    });

    it('should handle empty string', () => {
      const config = getWorkflowConfig('');
      expect(config).toBeUndefined();
    });

    it('should be case sensitive', () => {
      const config = getWorkflowConfig('GITWORKFLOW');
      expect(config).toBeUndefined();
    });
  });

  describe('getOrderedWorkflows', () => {
    it('should return workflows sorted by order', () => {
      const workflows = getOrderedWorkflows();

      for (let i = 1; i < workflows.length; i++) {
        expect(workflows[i].order).toBeGreaterThanOrEqual(workflows[i - 1].order);
      }
    });

    it('should include gitWorkflow in ordered list', () => {
      const workflows = getOrderedWorkflows();
      const gitWorkflow = workflows.find((w) => w.id === 'gitWorkflow');

      expect(gitWorkflow).toBeDefined();
      expect(gitWorkflow?.order).toBe(3);
    });

    it('should return all configured workflows', () => {
      const workflows = getOrderedWorkflows();
      expect(workflows.length).toBe(WORKFLOW_CONFIGS.length);

      WORKFLOW_CONFIGS.forEach((config) => {
        const found = workflows.find((w) => w.id === config.id);
        expect(found).toBeDefined();
      });
    });

    it('should maintain workflow properties after ordering', () => {
      const workflows = getOrderedWorkflows();
      const gitWorkflow = workflows.find((w) => w.id === 'gitWorkflow');

      expect(gitWorkflow).toMatchObject({
        id: 'gitWorkflow',
        commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
        agents: [],
        category: 'git',
      });
    });

    it('should return a new array instance', () => {
      const workflows1 = getOrderedWorkflows();
      const workflows2 = getOrderedWorkflows();

      expect(workflows1).not.toBe(workflows2);
      expect(workflows1).toEqual(workflows2);
    });
  });

  describe('workflow configuration integrity', () => {
    it('should have valid structure for all workflows', () => {
      WORKFLOW_CONFIGS.forEach((config) => {
        expect(config).toHaveProperty('id');
        expect(config).toHaveProperty('nameKey');
        expect(config).toHaveProperty('defaultSelected');
        expect(config).toHaveProperty('order');
        expect(config).toHaveProperty('commands');
        expect(config).toHaveProperty('agents');
        expect(config).toHaveProperty('autoInstallAgents');
        expect(config).toHaveProperty('category');
        expect(config).toHaveProperty('outputDir');

        expect(typeof config.id).toBe('string');
        expect(typeof config.defaultSelected).toBe('boolean');
        expect(typeof config.order).toBe('number');
        expect(Array.isArray(config.commands)).toBe(true);
        expect(Array.isArray(config.agents)).toBe(true);
      });
    });

    it('should have non-empty commands for all workflows', () => {
      WORKFLOW_CONFIGS.forEach((config) => {
        expect(config.commands.length).toBeGreaterThan(0);
      });
    });

    it('should have valid order values', () => {
      const orders = WORKFLOW_CONFIGS.map((w) => w.order);
      orders.forEach((order) => {
        expect(order).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(order)).toBe(true);
      });
    });

    it('should have matching outputDir and category for gitWorkflow', () => {
      const gitWorkflow = WORKFLOW_CONFIGS.find((w) => w.id === 'gitWorkflow');
      expect(gitWorkflow?.category).toBe('git');
      expect(gitWorkflow?.outputDir).toBe('git');
    });
  });
});
