import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';
import { showCcrMenu } from '../../../src/utils/tools/ccr-menu';
import * as ccrInstaller from '../../../src/utils/ccr/installer';
import * as ccrConfig from '../../../src/utils/ccr/config';
import * as ccrCommands from '../../../src/utils/ccr/commands';

vi.mock('inquirer');
vi.mock('../../../src/utils/ccr/installer');
vi.mock('../../../src/utils/ccr/config');
vi.mock('../../../src/utils/ccr/commands');

describe('CCR Menu', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should display CCR menu options', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '0' });

    await showCcrMenu('en');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCR - Claude Code Router Management'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Initialize CCR'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Start CCR UI'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Check CCR Status'));
  });

  it('should handle initialize CCR option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '1' })
      .mockResolvedValueOnce({ continueInCcr: false });
    vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(false);
    vi.mocked(ccrInstaller.installCcr).mockResolvedValue();
    vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

    await showCcrMenu('zh-CN');

    expect(ccrInstaller.isCcrInstalled).toHaveBeenCalled();
    expect(ccrInstaller.installCcr).toHaveBeenCalledWith('zh-CN');
    expect(ccrConfig.configureCcrFeature).toHaveBeenCalledWith('zh-CN');
  });

  it('should skip CCR installation if already installed', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '1' })
      .mockResolvedValueOnce({ continueInCcr: false });
    vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue(true);
    vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue();

    await showCcrMenu('en');

    expect(ccrInstaller.isCcrInstalled).toHaveBeenCalled();
    expect(ccrInstaller.installCcr).not.toHaveBeenCalled();
    expect(ccrConfig.configureCcrFeature).toHaveBeenCalledWith('en');
  });

  it('should handle start UI option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '2' })
      .mockResolvedValueOnce({ continueInCcr: false });
    vi.mocked(ccrCommands.runCcrUi).mockResolvedValue();

    await showCcrMenu('en');

    expect(ccrCommands.runCcrUi).toHaveBeenCalledWith('en');
  });

  it('should handle check status option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '3' })
      .mockResolvedValueOnce({ continueInCcr: false });
    vi.mocked(ccrCommands.runCcrStatus).mockResolvedValue();

    await showCcrMenu('zh-CN');

    expect(ccrCommands.runCcrStatus).toHaveBeenCalledWith('zh-CN');
  });

  it('should handle restart option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '4' })
      .mockResolvedValueOnce({ continueInCcr: false });
    vi.mocked(ccrCommands.runCcrRestart).mockResolvedValue();

    await showCcrMenu('en');

    expect(ccrCommands.runCcrRestart).toHaveBeenCalledWith('en');
  });

  it('should handle start option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '5' })
      .mockResolvedValueOnce({ continueInCcr: false });
    vi.mocked(ccrCommands.runCcrStart).mockResolvedValue();

    await showCcrMenu('en');

    expect(ccrCommands.runCcrStart).toHaveBeenCalledWith('en');
  });

  it('should handle stop option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '6' })
      .mockResolvedValueOnce({ continueInCcr: false });
    vi.mocked(ccrCommands.runCcrStop).mockResolvedValue();

    await showCcrMenu('en');

    expect(ccrCommands.runCcrStop).toHaveBeenCalledWith('en');
  });

  it('should return false when back option is selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '0' });

    const result = await showCcrMenu('en');

    expect(result).toBe(false);
  });

  it('should loop back to menu when continue is selected', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '3' })
      .mockResolvedValueOnce({ continueInCcr: true })
      .mockResolvedValueOnce({ choice: '0' });
    vi.mocked(ccrCommands.runCcrStatus).mockResolvedValue();

    await showCcrMenu('en');

    expect(ccrCommands.runCcrStatus).toHaveBeenCalledTimes(1);
    expect(inquirer.prompt).toHaveBeenCalledTimes(3);
  });
});