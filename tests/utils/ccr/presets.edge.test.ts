import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchProviderPresets, getFallbackPresets } from '../../../src/utils/ccr/presets';
import type { ProviderPreset } from '../../../src/types/ccr';

// Mock global fetch
global.fetch = vi.fn();

describe('CCR presets - edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchProviderPresets - edge cases', () => {
    it('should handle extremely large response', async () => {
      const largeData = Array(10000).fill({
        name: 'provider',
        api_base_url: 'https://api.example.com',
        models: Array(100).fill('model')
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(largeData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result).toHaveLength(10000);
      expect(result[0].models).toHaveLength(100);
    });

    it('should handle deeply nested provider objects', async () => {
      const mockData = [
        {
          name: 'nested',
          api_base_url: 'https://api.nested.com',
          models: ['model1'],
          transformer: {
            use: ['tool1'],
            nested: {
              deeply: {
                nested: {
                  value: 'test'
                }
              }
            }
          }
        }
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result[0].transformer).toEqual(mockData[0].transformer);
    });

    it('should handle mixed valid and invalid providers', async () => {
      const mockData = [
        {
          name: 'valid',
          api_base_url: 'https://api.valid.com',
          models: ['model1']
        },
        null, // Invalid
        undefined, // Invalid
        {}, // Invalid - no name
        {
          name: 'valid2',
          models: ['model2']
        },
        'string', // Invalid type
        123 // Invalid type
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      // Should only include valid providers
      expect(result).toHaveLength(3); // valid, empty object with fallback, valid2
    });

    it('should handle unicode and special characters in provider data', async () => {
      const mockData = [
        {
          name: '测试提供商 🚀',
          api_base_url: 'https://api.测试.com',
          api_key: '',
          models: ['模型1', 'मॉडल2', '🤖-model'],
          description: 'Unicode provider with émojis 😀'
        }
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result[0].name).toBe('测试提供商 🚀');
      expect(result[0].models).toContain('🤖-model');
      expect(result[0].description).toContain('😀');
    });

    it('should handle circular references gracefully', async () => {
      const circularData: any = {
        provider1: {
          name: 'Circular',
          models: ['model1']
        }
      };
      // Create circular reference
      circularData.provider1.circular = circularData;

      const mockResponse = {
        ok: true,
        json: vi.fn().mockImplementation(() => {
          // JSON.parse would throw on circular, simulate that
          throw new Error('Converting circular structure to JSON');
        })
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      // Should return fallback on JSON error
      expect(result).toEqual(getFallbackPresets());
    });

    it('should handle HTTP status codes correctly', async () => {
      const testCases = [
        { status: 400, ok: false },
        { status: 401, ok: false },
        { status: 403, ok: false },
        { status: 404, ok: false },
        { status: 500, ok: false },
        { status: 503, ok: false }
      ];

      for (const testCase of testCases) {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: testCase.ok,
          status: testCase.status,
          json: vi.fn()
        } as any);

        const result = await fetchProviderPresets();

        expect(result).toEqual(getFallbackPresets());
      }
    });

    it('should handle fetch abort correctly', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      const result = await fetchProviderPresets();

      // Should return fallback due to timeout/abort
      expect(result).toEqual(getFallbackPresets());
    });

    it('should handle providers with missing models array', async () => {
      const mockData = [
        {
          name: 'no-models',
          api_base_url: 'https://api.nomodels.com',
          // models array missing
        },
        {
          name: 'null-models',
          api_base_url: 'https://api.nullmodels.com',
          models: null
        },
        {
          name: 'string-models',
          api_base_url: 'https://api.stringmodels.com',
          models: 'not-an-array'
        }
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result[0].models).toEqual([]);
      expect(result[1].models).toEqual([]);
      expect(result[2].models).toEqual('not-an-array'); // Keep original value
    });

    it('should handle various URL field names', async () => {
      const mockData = [
        {
          name: 'p1',
          url: 'https://url.com'
        },
        {
          name: 'p2',
          baseURL: 'https://baseurl.com'
        },
        {
          name: 'p3',
          api_base_url: 'https://apibaseurl.com'
        },
        {
          name: 'p4',
          // No URL field at all
        }
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result[0].baseURL).toBe('https://url.com');
      expect(result[1].baseURL).toBe('https://baseurl.com');
      expect(result[2].baseURL).toBe('https://apibaseurl.com');
      expect(result[3].baseURL).toBeUndefined();
    });

    it('should handle requiresApiKey field variations', async () => {
      const mockData = [
        {
          name: 'p1',
          api_key: '' // Empty string = required
        },
        {
          name: 'p2',
          api_key: null // Null = required
        },
        {
          name: 'p3',
          api_key: 'preset-key' // Has value = not required
        },
        {
          name: 'p4',
          requiresApiKey: false // Explicit false
        },
        {
          name: 'p5',
          requiresApiKey: true // Explicit true
        },
        {
          name: 'p6'
          // No field = default to required
        }
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result[0].requiresApiKey).toBe(true);
      expect(result[1].requiresApiKey).toBe(true);
      expect(result[2].requiresApiKey).toBe(true); // Changed logic: any api_key means required
      expect(result[3].requiresApiKey).toBe(false);
      expect(result[4].requiresApiKey).toBe(true);
      expect(result[5].requiresApiKey).toBe(true);
    });

    it('should handle concurrent fetch calls', async () => {
      let callCount = 0;
      vi.mocked(global.fetch).mockImplementation(() => {
        const currentCount = ++callCount;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { name: `provider${currentCount}`, models: ['model'] }
          ])
        } as any);
      });

      const results = await Promise.all([
        fetchProviderPresets(),
        fetchProviderPresets(),
        fetchProviderPresets()
      ]);

      expect(callCount).toBe(3);
      // Each result should have one provider
      expect(results[0]).toHaveLength(1);
      expect(results[1]).toHaveLength(1);
      expect(results[2]).toHaveLength(1);
      
      // Collect all provider names
      const allNames = results.flatMap(r => r.map(p => p.name));
      expect(allNames).toContain('provider1');
      expect(allNames).toContain('provider2');
      expect(allNames).toContain('provider3');
    });
  });

  describe('getFallbackPresets - edge cases', () => {
    it('should return consistent results on multiple calls', () => {
      const result1 = getFallbackPresets();
      const result2 = getFallbackPresets();
      const result3 = getFallbackPresets();

      // Should return new arrays but with same content
      expect(result1).not.toBe(result2);
      expect(result2).not.toBe(result3);
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should not be affected by modifications to returned array', () => {
      const presets1 = getFallbackPresets();
      
      // Modify the returned array
      presets1.push({
        name: 'injected',
        provider: 'injected',
        baseURL: 'https://injected.com',
        requiresApiKey: false,
        models: ['injected-model']
      });
      presets1[0].name = 'modified';

      // Get fresh presets
      const presets2 = getFallbackPresets();

      // Should not be affected by modifications
      expect(presets2).not.toContain(
        expect.objectContaining({ name: 'injected' })
      );
      expect(presets2[0].name).not.toBe('modified');
    });

    it('should have unique provider names', () => {
      const presets = getFallbackPresets();
      const names = presets.map(p => p.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have valid transformer structures where present', () => {
      const presets = getFallbackPresets();

      presets.forEach(preset => {
        if (preset.transformer) {
          expect(typeof preset.transformer).toBe('object');
          
          if (preset.transformer.use) {
            expect(Array.isArray(preset.transformer.use)).toBe(true);
          }
        }
      });
    });

    it('should not have empty model arrays', () => {
      const presets = getFallbackPresets();

      presets.forEach(preset => {
        expect(preset.models.length).toBeGreaterThan(0);
      });
    });
  });

  describe('performance and memory', () => {
    it('should handle memory pressure with large responses', async () => {
      // Create a very large response to test memory handling
      const hugeArray = Array(1000).fill({
        name: 'x'.repeat(1000),
        api_base_url: 'https://' + 'x'.repeat(1000) + '.com',
        models: Array(100).fill('x'.repeat(100)),
        description: 'x'.repeat(10000),
        transformer: {
          use: Array(100).fill(['tool', { param: 'x'.repeat(1000) }])
        }
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(hugeArray)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result).toHaveLength(1000);
      // Verify structure is preserved despite size
      expect(result[0].name).toHaveLength(1000);
      expect(result[0].models).toHaveLength(100);
    });
  });
});