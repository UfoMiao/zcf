import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMcpConfigPath,
  readMcpConfig,
  writeMcpConfig,
  backupMcpConfig,
  mergeMcpServers,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
} from '../../../src/utils/mcp';
import * as jsonConfig from '../../../src/utils/json-config';
import * as platform from '../../../src/utils/platform';
import * as objectUtils from '../../../src/utils/object-utils';
import { ClAUDE_CONFIG_FILE, CLAUDE_DIR } from '../../../src/constants';

vi.mock('../../../src/utils/json-config');
vi.mock('../../../src/utils/platform');
vi.mock('../../../src/utils/object-utils');
vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn().mockReturnValue({ preferredLang: 'en' })
}));

describe('mcp utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMcpConfigPath', () => {
    it('should return Claude config file path', () => {
      const result = getMcpConfigPath();
      expect(result).toBe(ClAUDE_CONFIG_FILE);
    });
  });

  describe('readMcpConfig', () => {
    it('should read MCP configuration', () => {
      const mockConfig = { mcpServers: { test: {} } };
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockConfig);

      const result = readMcpConfig();

      expect(result).toEqual(mockConfig);
      expect(jsonConfig.readJsonConfig).toHaveBeenCalledWith(ClAUDE_CONFIG_FILE);
    });

    it('should return null when no config exists', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null);

      const result = readMcpConfig();

      expect(result).toBeNull();
    });
  });

  describe('writeMcpConfig', () => {
    it('should write MCP configuration', () => {
      const config = { mcpServers: { test: { type: 'stdio' } } };

      writeMcpConfig(config as any);

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(ClAUDE_CONFIG_FILE, config);
    });
  });

  describe('backupMcpConfig', () => {
    it('should backup MCP configuration', () => {
      vi.mocked(jsonConfig.backupJsonConfig).mockReturnValue('/backup/path');

      const result = backupMcpConfig();

      expect(result).toBe('/backup/path');
      expect(jsonConfig.backupJsonConfig).toHaveBeenCalledWith(
        ClAUDE_CONFIG_FILE,
        expect.stringContaining('backup')
      );
    });
  });

  describe('mergeMcpServers', () => {
    it('should merge new servers into existing config', () => {
      const existing = {
        mcpServers: {
          server1: { type: 'stdio' as const, command: 'npx', args: ['server1'] }
        }
      };
      const newServers = {
        server2: { type: 'stdio' as const, command: 'npx', args: ['server2'] }
      };

      const result = mergeMcpServers(existing, newServers);

      expect(result.mcpServers).toEqual({
        server1: { type: 'stdio', command: 'npx', args: ['server1'] },
        server2: { type: 'stdio', command: 'npx', args: ['server2'] }
      });
    });

    it('should create mcpServers if not exists', () => {
      const existing = {};
      const newServers = {
        server1: { type: 'stdio' as const, command: 'npx', args: ['server1'] }
      };

      const result = mergeMcpServers(existing as any, newServers);

      expect(result.mcpServers).toEqual(newServers);
    });

    it('should handle null existing config', () => {
      const newServers = {
        server1: { type: 'stdio' as const, command: 'npx', args: ['server1'] }
      };

      const result = mergeMcpServers(null, newServers);

      expect(result.mcpServers).toEqual(newServers);
    });
  });

  describe('buildMcpServerConfig', () => {
    it('should build config without API key', () => {
      const baseConfig = { type: 'stdio' as const, command: 'npx', args: ['test'] };
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig });
      vi.mocked(platform.isWindows).mockReturnValue(false);

      const result = buildMcpServerConfig(baseConfig);

      expect(result).toEqual(baseConfig);
    });

    it('should replace API key in args', () => {
      const baseConfig = { 
        type: 'stdio' as const,
        command: 'npx', 
        args: ['--api-key', 'YOUR_EXA_API_KEY'] 
      };
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig });
      vi.mocked(platform.isWindows).mockReturnValue(false);

      const result = buildMcpServerConfig(baseConfig, 'real-api-key');

      expect(result.args).toEqual(['--api-key', 'real-api-key']);
    });

    it('should replace API key in URL', () => {
      const baseConfig = { 
        type: 'stdio' as const,
        command: 'npx',
        url: 'https://api.example.com?key=YOUR_EXA_API_KEY'
      };
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig });
      vi.mocked(platform.isWindows).mockReturnValue(false);

      const result = buildMcpServerConfig(baseConfig, 'real-api-key');

      expect(result.url).toBe('https://api.example.com?key=real-api-key');
    });

    it('should apply Windows command transformation', () => {
      const baseConfig = { type: 'stdio' as const, command: 'npx', args: ['test'] };
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig });
      vi.mocked(platform.isWindows).mockReturnValue(true);
      vi.mocked(platform.getMcpCommand).mockReturnValue(['cmd', '/c', 'npx']);

      const result = buildMcpServerConfig(baseConfig);

      expect(result.command).toBe('cmd');
      expect(result.args).toEqual(['/c', 'npx', 'test']);
    });

    it('should use custom placeholder', () => {
      const baseConfig = { 
        type: 'stdio' as const,
        command: 'npx', 
        args: ['--key', 'CUSTOM_PLACEHOLDER'] 
      };
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig });
      vi.mocked(platform.isWindows).mockReturnValue(false);

      const result = buildMcpServerConfig(baseConfig, 'api-key', 'CUSTOM_PLACEHOLDER');

      expect(result.args).toEqual(['--key', 'api-key']);
    });
  });

  describe('fixWindowsMcpConfig', () => {
    it('should not modify config on non-Windows', () => {
      vi.mocked(platform.isWindows).mockReturnValue(false);
      const config = { mcpServers: { test: { type: 'stdio' as const, command: 'npx' } } };

      const result = fixWindowsMcpConfig(config as any);

      expect(result).toEqual(config);
    });

    it('should fix Windows npx commands', () => {
      vi.mocked(platform.isWindows).mockReturnValue(true);
      vi.mocked(platform.getMcpCommand).mockReturnValue(['cmd', '/c', 'npx']);
      vi.mocked(objectUtils.deepClone).mockImplementation(obj => JSON.parse(JSON.stringify(obj)));

      const config = { 
        mcpServers: { 
          test: { type: 'stdio' as const, command: 'npx', args: ['arg1'] } 
        } 
      };

      const result = fixWindowsMcpConfig(config as any);

      expect(result.mcpServers.test.command).toBe('cmd');
      expect(result.mcpServers.test.args).toEqual(['/c', 'npx', 'arg1']);
    });

    it('should return config without mcpServers unchanged', () => {
      vi.mocked(platform.isWindows).mockReturnValue(true);
      const config = {};

      const result = fixWindowsMcpConfig(config as any);

      expect(result).toEqual(config);
    });
  });

  // Extended Tests
});
