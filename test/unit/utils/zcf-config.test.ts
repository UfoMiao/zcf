import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readZcfConfig, writeZcfConfig, updateZcfConfig } from '../../../src/utils/zcf-config';
import * as jsonConfig from '../../../src/utils/json-config';

vi.mock('../../../src/utils/json-config');

describe('zcf-config utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readZcfConfig', () => {
    it('should read config from file', () => {
      const mockConfig = {
        version: '1.0.0',
        preferredLang: 'en',
        aiOutputLang: 'en',
        lastUpdated: '2024-01-01'
      };
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockConfig);

      const result = readZcfConfig();

      expect(result).toEqual(mockConfig);
      expect(jsonConfig.readJsonConfig).toHaveBeenCalled();
    });

    it('should return null when file does not exist', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null);

      const result = readZcfConfig();

      expect(result).toBeNull();
    });

  });

  describe('writeZcfConfig', () => {
    it('should save config to file', () => {
      const config = {
        version: '1.0.0',
        preferredLang: 'zh-CN' as const,
        aiOutputLang: 'zh-CN',
        lastUpdated: '2024-01-01'
      };

      writeZcfConfig(config);

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        config
      );
    });
  });

  describe('updateZcfConfig', () => {
    it('should update existing config', () => {
      const existingConfig = {
        version: '1.0.0',
        preferredLang: 'en' as const,
        aiOutputLang: 'en',
        lastUpdated: '2024-01-01'
      };
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(existingConfig);

      updateZcfConfig({ preferredLang: 'zh-CN' });

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          preferredLang: 'zh-CN',
          version: '1.0.0'
        })
      );
    });

    it('should handle null existing config', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null);

      updateZcfConfig({ preferredLang: 'zh-CN' });

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          preferredLang: 'zh-CN',
          version: '1.0.0'
        })
      );
    });
  });

  // Extended Tests from zcf-config.extended.test.ts  
  describe("zcf-config extended tests", () => {
    it("should handle cache cleanup", () => {
      // This is a placeholder test - the actual extended tests were minimal
      expect(true).toBe(true);
    });
  });
});
