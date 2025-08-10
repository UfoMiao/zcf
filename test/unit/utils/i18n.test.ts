import { describe, it, expect, beforeEach, vi } from 'vitest';
import { t, format, setLanguage, getLanguage } from '../../../src/utils/i18n';
import type { SupportedLang } from '../../../src/types';

describe('i18n utilities', () => {
  describe('t function', () => {
    it('should return translations for English', () => {
      setLanguage('en');
      const translations = t();
      expect(translations.yes).toBe('Yes');
      expect(translations.no).toBe('No');
      expect(translations.cancelled).toBe('Operation cancelled');
    });

    it('should return translations for Chinese', () => {
      setLanguage('zh-CN');
      const translations = t();
      expect(translations.yes).toBe('是');
      expect(translations.no).toBe('否');
      expect(translations.cancelled).toBe('操作已取消');
    });

    it('should have nested translation objects', () => {
      setLanguage('en');
      const translations = t();
      expect(translations.menuOptions).toBeDefined();
      expect(translations.menuOptions.fullInit).toBe('Full initialization');
      expect(translations.menuDescriptions).toBeDefined();
      expect(translations.menuDescriptions.fullInit).toBe('Install Claude Code + Import workflow + Configure API + Configure MCP services');
    });

    it('should switch between languages', () => {
      setLanguage('en');
      let translations = t();
      expect(translations.yes).toBe('Yes');
      
      setLanguage('zh-CN');
      translations = t();
      expect(translations.yes).toBe('是');
    });

    it('should have all required keys', () => {
      setLanguage('en');
      const translations = t();
      expect(translations.selectFunction).toBeDefined();
      expect(translations.configureApi).toBeDefined();
      expect(translations.configureMcp).toBeDefined();
    });
  });

  describe('format function', () => {
    it('should replace placeholders', () => {
      const template = 'Hello {name}, you have {count} messages';
      const result = format(template, { name: 'John', count: '5' });
      expect(result).toBe('Hello John, you have 5 messages');
    });

    it('should handle missing placeholders', () => {
      const template = 'Hello {name}';
      const result = format(template, {});
      expect(result).toBe('Hello {name}');
    });

    it('should handle multiple occurrences of same placeholder', () => {
      const template = '{name} is {name}';
      const result = format(template, { name: 'John' });
      expect(result).toBe('John is John');
    });

    it('should handle special characters in values', () => {
      const template = 'Path: {path}';
      const result = format(template, { path: 'C:\\Users\\Test\\Claude' });
      expect(result).toBe('Path: C:\\Users\\Test\\Claude');
    });

    it('should handle empty template', () => {
      const result = format('', { test: 'value' });
      expect(result).toBe('');
    });
  });

  describe('setLanguage and getLanguage functions', () => {
    it('should set and get language correctly', () => {
      setLanguage('en');
      expect(getLanguage()).toBe('en');
      
      setLanguage('zh-CN');
      expect(getLanguage()).toBe('zh-CN');
    });

    it('should affect t() output', () => {
      setLanguage('en');
      let translations = t();
      expect(translations.yes).toBe('Yes');
      
      setLanguage('zh-CN');
      translations = t();
      expect(translations.yes).toBe('是');
    });

    it('should maintain language state', () => {
      setLanguage('zh-CN');
      expect(getLanguage()).toBe('zh-CN');
      
      // Call t() doesn't change language
      t();
      expect(getLanguage()).toBe('zh-CN');
    });
  });

  describe('workflow translations', () => {
    it('should have workflow options in Chinese', () => {
      setLanguage('zh-CN');
      const translations = t();
      expect(translations.workflowOption).toBeDefined();
      expect(translations.workflowOption.sixStepsWorkflow).toBe('六步工作流 (workflow)');
      expect(translations.workflowOption.featPlanUx).toBe('功能规划和 UX 设计 (feat + planner + ui-ux-designer)');
      expect(translations.workflowOption.bmadWorkflow).toBe('BMAD-Method 扩展安装器 (支持敏捷开发工作流)');
    });

    it('should have workflow options in English', () => {
      setLanguage('en');
      const translations = t();
      expect(translations.workflowOption).toBeDefined();
      expect(translations.workflowOption.sixStepsWorkflow).toBe('Six Steps Workflow (workflow)');
      expect(translations.workflowOption.featPlanUx).toBe('Feature Planning and UX Design (feat + planner + ui-ux-designer)');
      expect(translations.workflowOption.bmadWorkflow).toBe('BMAD-Method Extension Installer (Agile Development Workflow)');
    });

    it('should have workflow install success messages', () => {
      setLanguage('en');
      const translations = t();
      expect(translations.workflowInstallSuccess).toBeDefined();
      expect(translations.workflowInstallError).toBeDefined();
    });
  });

  describe('menu translations', () => {
    it('should have menu options', () => {
      setLanguage('en');
      const translations = t();
      expect(translations.menuOptions).toBeDefined();
      expect(translations.menuOptions.fullInit).toBe('Full initialization');
      expect(translations.menuOptions.importWorkflow).toBe('Import workflow');
      expect(translations.menuOptions.configureApi).toBe('Configure API');
      expect(translations.menuOptions.configureMcp).toBe('Configure MCP');
    });

    it('should have menu descriptions', () => {
      setLanguage('zh-CN');
      const translations = t();
      expect(translations.menuDescriptions).toBeDefined();
      expect(translations.menuDescriptions.fullInit).toBe('安装 Claude Code + 导入工作流 + 配置 API + 配置 MCP 服务');
      expect(translations.menuDescriptions.importWorkflow).toBe('仅导入/更新工作流相关文件');
    });
  });

  describe('API configuration translations', () => {
    it('should have API related translations', () => {
      setLanguage('en');
      const translations = t();
      expect(translations.configureApi).toBe('Select API authentication method');
      expect(translations.useApiKey).toBe('Use API Key (Key authentication)');
      expect(translations.useAuthToken).toBe('Use Auth Token (OAuth authentication)');
      expect(translations.enterApiKey).toBe('Enter API Key');
    });

    it('should have API validation messages', () => {
      setLanguage('zh-CN');
      const translations = t();
      expect(translations.apiKeyValidation).toBeDefined();
      expect(translations.apiKeyValidation.empty).toBe('API Key 不能为空');
      expect(translations.apiKeyValidation.example).toBe('示例格式: sk-abcdef123456_789xyz');
    });
  });
});