import inquirer from 'inquirer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ansis from 'ansis';
import * as i18n from '../../../src/i18n';
import * as menuModule from '../../../src/utils/cometix/menu';
import * as commands from '../../../src/utils/cometix/commands';

// Don't destructure to allow proper mocking
const { showCometixMenu } = menuModule;

vi.mock('inquirer');
vi.mock('ansis', () => ({
  default: {
    cyan: vi.fn((text: string) => text),
    bold: { cyan: vi.fn((text: string) => text) },
    gray: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
    dim: vi.fn((text: string) => text),
  },
}));
vi.mock('../../../src/i18n');
vi.mock('../../../src/utils/cometix/commands');
vi.mock('../../../src/utils/error-handler', () => ({
  handleGeneralError: vi.fn(),
  handleExitPromptError: vi.fn(() => false),
}));

describe('CCometixLine menu', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.mocked(i18n.getTranslation).mockReturnValue({
      cometix: {
        cometixMenuTitle: 'CCometixLine - High-performance Claude Code statusline tool',
        cometixMenuOptions: {
          installOrUpdate: 'Install or Update',
          printConfig: 'Print Default Configuration',
          back: 'Back to Main Menu',
        },
        cometixMenuDescriptions: {
          installOrUpdate: 'Install or update CCometixLine using npm',
          printConfig: 'Display current CCometixLine configuration',
        },
      },
      common: {
        enterChoice: 'Enter your choice:',
        invalidChoice: 'Invalid choice, please try again',
        returnToMenu: 'Return to CCometixLine menu?',
      },
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('showCometixMenu', () => {
    it('should display CCometixLine menu options', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: '0' });

      await showCometixMenu('en');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCometixLine - High-performance Claude Code statusline tool'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1.'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Install or Update'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2.'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Print Default Configuration'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Back to Main Menu'));
    });

    it('should handle install or update option (choice 1)', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
        .mockResolvedValueOnce({ continueInCometix: false });
      
      vi.mocked(commands.runCometixInstallOrUpdate).mockResolvedValue();

      const result = await showCometixMenu('en');

      expect(commands.runCometixInstallOrUpdate).toHaveBeenCalledWith('en');
      expect(result).toBe(false);
    });

    it('should handle print config option (choice 2)', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '2' })
        .mockResolvedValueOnce({ continueInCometix: false });
      
      vi.mocked(commands.runCometixPrintConfig).mockResolvedValue();

      const result = await showCometixMenu('en');

      expect(commands.runCometixPrintConfig).toHaveBeenCalledWith('en');
      expect(result).toBe(false);
    });

    it('should handle back to main menu (choice 0)', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: '0' });

      const result = await showCometixMenu('en');

      expect(result).toBe(false);
    });

    it('should handle invalid choice validation', async () => {
      const mockPrompt = vi.mocked(inquirer.prompt);
      mockPrompt.mockResolvedValue({ choice: '0' });

      await showCometixMenu('en');

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'input',
        name: 'choice',
        message: 'Enter your choice:',
        validate: expect.any(Function),
      });

      // Test the validate function
      const promptCall = mockPrompt.mock.calls[0][0] as any;
      const validateFn = promptCall.validate;
      
      expect(validateFn('1')).toBe(true);
      expect(validateFn('2')).toBe(true);
      expect(validateFn('0')).toBe(true);
      expect(validateFn('3')).toBe('Invalid choice, please try again');
      expect(validateFn('invalid')).toBe('Invalid choice, please try again');
    });

    it('should handle continue in menu flow', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
        .mockResolvedValueOnce({ continueInCometix: true })
        .mockResolvedValueOnce({ choice: '0' });
      
      vi.mocked(commands.runCometixInstallOrUpdate).mockResolvedValue();

      await showCometixMenu('en');

      expect(inquirer.prompt).toHaveBeenCalledTimes(3);
      expect(commands.runCometixInstallOrUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      vi.mocked(inquirer.prompt).mockRejectedValue(error);

      const result = await showCometixMenu('en');

      expect(result).toBe(false);
    });
  });
});