import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import cac from 'cac';
import { version } from '../../package.json';
import {
  setupCommands,
  handleDefaultCommand,
  handleInitCommand,
  handleUpdateCommand,
  customizeHelp,
  type CliOptions,
} from '../../src/cli-setup';

// Mock commands
vi.mock('../../src/commands/init', () => ({
  init: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/commands/menu', () => ({
  showMainMenu: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/commands/update', () => ({
  update: vi.fn().mockResolvedValue(undefined),
}));

describe('cli-setup', () => {
  let mockInit: any;
  let mockShowMainMenu: any;
  let mockUpdate: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const initModule = await import('../../src/commands/init');
    const menuModule = await import('../../src/commands/menu');
    const updateModule = await import('../../src/commands/update');
    
    mockInit = initModule.init as any;
    mockShowMainMenu = menuModule.showMainMenu as any;
    mockUpdate = updateModule.update as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupCommands', () => {
    it('should setup all commands on cli instance', () => {
      const cli = cac('test');
      const commandSpy = vi.spyOn(cli, 'command');
      const helpSpy = vi.spyOn(cli, 'help');
      const versionSpy = vi.spyOn(cli, 'version');

      setupCommands(cli);

      // Check that commands were registered
      expect(commandSpy).toHaveBeenCalledWith('[lang]', 'Show interactive menu (default)');
      expect(commandSpy).toHaveBeenCalledWith('init', 'Initialize Claude Code configuration');
      expect(commandSpy).toHaveBeenCalledWith('update', 'Update Claude Code prompts only');

      // Check help and version were setup
      expect(helpSpy).toHaveBeenCalled();
      expect(versionSpy).toHaveBeenCalled();
    });
  });

  describe('handleDefaultCommand', () => {
    it('should call init when --init flag is provided', async () => {
      const options: CliOptions = {
        init: true,
        configLang: 'zh-CN',
        force: true,
      };

      await handleDefaultCommand('en', options);

      expect(mockInit).toHaveBeenCalledWith({
        lang: 'en',
        configLang: 'zh-CN',
        force: true,
      });
      expect(mockShowMainMenu).not.toHaveBeenCalled();
    });

    it('should use options.lang when lang parameter is not provided', async () => {
      const options: CliOptions = {
        init: true,
        lang: 'zh-CN',
      };

      await handleDefaultCommand(undefined, options);

      expect(mockInit).toHaveBeenCalledWith({
        lang: 'zh-CN',
        configLang: undefined,
        force: undefined,
      });
    });

    it('should show main menu when --init flag is not provided', async () => {
      const options: CliOptions = {};

      await handleDefaultCommand(undefined, options);

      expect(mockShowMainMenu).toHaveBeenCalled();
      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  describe('handleInitCommand', () => {
    it('should call init with all provided options', async () => {
      const options: CliOptions = {
        lang: 'zh-CN',
        configLang: 'en',
        aiOutputLang: 'zh-CN',
        force: true,
      };

      await handleInitCommand(options);

      expect(mockInit).toHaveBeenCalledWith({
        lang: 'zh-CN',
        configLang: 'en',
        aiOutputLang: 'zh-CN',
        force: true,
      });
    });

    it('should call init with partial options', async () => {
      const options: CliOptions = {
        lang: 'en',
      };

      await handleInitCommand(options);

      expect(mockInit).toHaveBeenCalledWith({
        lang: 'en',
        configLang: undefined,
        aiOutputLang: undefined,
        force: undefined,
      });
    });

    it('should handle empty options', async () => {
      const options: CliOptions = {};

      await handleInitCommand(options);

      expect(mockInit).toHaveBeenCalledWith({
        lang: undefined,
        configLang: undefined,
        aiOutputLang: undefined,
        force: undefined,
      });
    });
  });

  describe('handleUpdateCommand', () => {
    it('should call update with configLang option', async () => {
      const options = { configLang: 'zh-CN' };

      await handleUpdateCommand(options);

      expect(mockUpdate).toHaveBeenCalledWith({ configLang: 'zh-CN' });
    });

    it('should call update with empty options', async () => {
      const options = {};

      await handleUpdateCommand(options);

      expect(mockUpdate).toHaveBeenCalledWith({ configLang: undefined });
    });
  });

  describe('customizeHelp', () => {
    it('should add custom sections to help', () => {
      const sections: any[] = [];

      const result = customizeHelp(sections);

      // Should add header
      expect(result[0].body).toContain('ZCF - Zero-Config Claude-Code Flow');

      // Should add commands section
      const commandsSection = result.find((s) => s.title.includes('Commands'));
      expect(commandsSection).toBeDefined();
      expect(commandsSection.body).toContain('zcf init');
      expect(commandsSection.body).toContain('zcf update');

      // Should add options section
      const optionsSection = result.find((s) => s.title.includes('Options'));
      expect(optionsSection).toBeDefined();
      expect(optionsSection.body).toContain('--init');
      expect(optionsSection.body).toContain('--config-lang');
      expect(optionsSection.body).toContain('--force');

      // Should add examples section
      const examplesSection = result.find((s) => s.title.includes('Examples'));
      expect(examplesSection).toBeDefined();
      expect(examplesSection.body).toContain('npx zcf');
      expect(examplesSection.body).toContain('npx zcf init');
      expect(examplesSection.body).toContain('npx zcf u');
    });

    it('should maintain existing sections', () => {
      const existingSection = { title: 'Existing', body: 'test' };
      const sections = [existingSection];

      const result = customizeHelp(sections);

      // Existing section should be present
      expect(result).toContain(existingSection);
      // Should have header + existing + 3 new sections
      expect(result.length).toBe(5);
    });
  });

  describe('CLI integration', () => {
    it('should create a functional CLI setup', () => {
      const cli = cac('test');
      
      // Setup shouldn't throw
      expect(() => setupCommands(cli)).not.toThrow();
      
      // Check that commands are properly registered
      // cac stores commands in the commands array
      expect(cli.commands.length).toBeGreaterThan(0);
      
      // Verify version is set
      expect(cli.globalCommand.versionNumber).toBe(version);
    });
  });
});