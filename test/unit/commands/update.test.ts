import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

vi.mock('ansis', () => ({
  default: {
    green: (text: string) => text,
    yellow: (text: string) => text,
    cyan: (text: string) => text,
    red: (text: string) => text,
    gray: (text: string) => text,
    blue: (text: string) => text,
    bold: (text: string) => text
  }
}));

vi.mock('../../../src/utils/fs-operations', () => ({
  copyFile: vi.fn(),
  ensureDir: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('../../../src/utils/config-operations', () => ({
  updatePromptOnly: vi.fn()
}));

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn()
}));

vi.mock('../../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn(),
  resolveAiOutputLanguage: vi.fn()
}));

vi.mock('../../../src/utils/platform', () => ({
  getConfigDir: vi.fn().mockReturnValue('/home/user/.config'),
  isWindows: vi.fn().mockReturnValue(false)
}));

describe('update command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  it('should load update module', async () => {
    const module = await import('../../../src/commands/update');
    expect(module).toBeDefined();
    expect(module.update).toBeDefined();
  });

  it('should export update function', async () => {
    const { update } = await import('../../../src/commands/update');
    expect(typeof update).toBe('function');
  });

  describe('update function', () => {
    it('should handle update with existing config', async () => {
      const { update } = await import('../../../src/commands/update');
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config');
      const { selectScriptLanguage, resolveAiOutputLanguage } = await import('../../../src/utils/prompts');
      const { updatePromptOnly } = await import('../../../src/utils/config-operations');
      
      vi.mocked(selectScriptLanguage).mockResolvedValue('zh-CN');
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any);
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'zh-CN' });
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('chinese-simplified');
      vi.mocked(updatePromptOnly).mockResolvedValue(undefined);
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined);
      
      await update({ skipBanner: true });
      
      expect(selectScriptLanguage).toHaveBeenCalled();
      expect(updatePromptOnly).toHaveBeenCalled();
    });

    it('should handle update without existing config', async () => {
      const { update } = await import('../../../src/commands/update');
      const { selectScriptLanguage, resolveAiOutputLanguage } = await import('../../../src/utils/prompts');
      const { updatePromptOnly } = await import('../../../src/utils/config-operations');
      const inquirer = await import('inquirer');
      
      vi.mocked(selectScriptLanguage).mockResolvedValue('en');
      vi.mocked(inquirer.default.prompt).mockResolvedValue({ lang: 'en' });
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('english');
      
      await update({ skipBanner: true });
      
      expect(selectScriptLanguage).toHaveBeenCalled();
      expect(updatePromptOnly).toHaveBeenCalled();
    });

    it('should handle cancel update', async () => {
      const { update } = await import('../../../src/commands/update');
      const { readZcfConfig } = await import('../../../src/utils/zcf-config');
      const { selectScriptLanguage } = await import('../../../src/utils/prompts');
      const { updatePromptOnly } = await import('../../../src/utils/config-operations');
      
      vi.mocked(selectScriptLanguage).mockResolvedValue('zh-CN');
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any);
      vi.mocked(inquirer.prompt).mockResolvedValue({});
      
      await update({ skipBanner: true });
      
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle options correctly', async () => {
      const { update } = await import('../../../src/commands/update');
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config');
      const { selectScriptLanguage, resolveAiOutputLanguage } = await import('../../../src/utils/prompts');
      const { updatePromptOnly } = await import('../../../src/utils/config-operations');
      
      vi.mocked(selectScriptLanguage).mockResolvedValue('zh-CN');
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any);
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('chinese-simplified');
      vi.mocked(updatePromptOnly).mockResolvedValue(undefined);
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined);
      // Mock workflow selection - user cancels
      vi.mocked(inquirer.prompt).mockResolvedValue({ selectedWorkflows: [] });
      
      await update({ configLang: 'en', aiOutputLang: 'chinese-simplified', skipBanner: true });
      
      expect(inquirer.prompt).toHaveBeenCalled(); // Now expects workflow selection
      expect(updatePromptOnly).toHaveBeenCalledWith('en', 'zh-CN', 'chinese-simplified');
    });

    it('should handle errors gracefully', async () => {
      const { update } = await import('../../../src/commands/update');
      const { selectScriptLanguage } = await import('../../../src/utils/prompts');
      const error = new Error('Test error');
      
      vi.mocked(selectScriptLanguage).mockImplementation(() => {
        throw error;
      });
      
      await update({ skipBanner: true });
      
      expect(console.error).toHaveBeenCalled();
    });
  });
});