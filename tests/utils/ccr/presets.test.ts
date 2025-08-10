import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchProviderPresets, getFallbackPresets } from '../../../src/utils/ccr/presets';
import type { ProviderPreset } from '../../../src/types/ccr';

// Mock global fetch
global.fetch = vi.fn();

describe('CCR presets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchProviderPresets', () => {
    it('should fetch and parse array format presets successfully', async () => {
      const mockData = [
        {
          name: 'provider1',
          api_base_url: 'https://api.provider1.com',
          api_key: '',
          models: ['model1', 'model2'],
          description: 'Provider 1',
          transformer: { use: ['tool1'] }
        },
        {
          name: 'provider2',
          baseURL: 'https://api.provider2.com',
          requiresApiKey: false,
          models: ['model3']
        }
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'provider1',
        provider: 'provider1',
        baseURL: 'https://api.provider1.com',
        requiresApiKey: true,
        models: ['model1', 'model2'],
        description: 'Provider 1',
        transformer: { use: ['tool1'] }
      });
      expect(result[1]).toEqual({
        name: 'provider2',
        provider: 'provider2',
        baseURL: 'https://api.provider2.com',
        requiresApiKey: false,
        models: ['model3'],
        description: 'provider2',
        transformer: undefined
      });
    });

    it('should handle object format presets', async () => {
      const mockData = {
        provider1: {
          name: 'Provider One',
          api_base_url: 'https://api.p1.com',
          api_key: 'required',
          models: ['m1'],
          description: 'First provider'
        },
        provider2: {
          baseURL: 'https://api.p2.com',
          models: ['m2']
        }
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'Provider One',
        provider: 'provider1',
        baseURL: 'https://api.p1.com',
        models: ['m1']
      });
      expect(result[1]).toMatchObject({
        name: 'provider2',
        provider: 'provider2',
        baseURL: 'https://api.p2.com',
        models: ['m2']
      });
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: vi.fn()
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      // Should return fallback presets
      expect(result).toEqual(getFallbackPresets());
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const result = await fetchProviderPresets();

      // Should return fallback presets
      expect(result).toEqual(getFallbackPresets());
    });

    it('should handle timeout', async () => {
      // Create an AbortController to simulate timeout
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      const result = await fetchProviderPresets();

      // Should return fallback due to abort
      expect(result).toEqual(getFallbackPresets());
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(null)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result).toEqual([]);
    });

    it('should handle malformed JSON', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      // Should return fallback presets
      expect(result).toEqual(getFallbackPresets());
    });

    it('should transform various provider data formats', async () => {
      const mockData = [
        {
          name: 'p1',
          url: 'https://url-field.com', // url field instead of baseURL
          api_key: null, // null means required
          models: ['m1']
        },
        {
          name: 'p2',
          api_base_url: 'https://api-base-url.com',
          api_key: '', // empty string means required
          models: []
        },
        {
          name: 'p3',
          // No URL field
          requiresApiKey: true,
          models: ['m3']
        }
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await fetchProviderPresets();

      expect(result[0].baseURL).toBe('https://url-field.com');
      expect(result[0].requiresApiKey).toBe(true);
      expect(result[1].baseURL).toBe('https://api-base-url.com');
      expect(result[1].requiresApiKey).toBe(true);
      expect(result[2].baseURL).toBeUndefined();
    });
  });

  describe('getFallbackPresets', () => {
    it('should return predefined fallback presets', () => {
      const presets = getFallbackPresets();

      expect(presets).toBeInstanceOf(Array);
      expect(presets.length).toBeGreaterThan(0);
      
      // Check structure of first preset
      const firstPreset = presets[0];
      expect(firstPreset).toHaveProperty('name');
      expect(firstPreset).toHaveProperty('provider');
      expect(firstPreset).toHaveProperty('baseURL');
      expect(firstPreset).toHaveProperty('requiresApiKey');
      expect(firstPreset).toHaveProperty('models');
      expect(firstPreset.models).toBeInstanceOf(Array);
    });

    it('should include dashscope preset', () => {
      const presets = getFallbackPresets();
      const dashscope = presets.find(p => p.name === 'dashscope');

      expect(dashscope).toBeDefined();
      expect(dashscope?.baseURL).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
      expect(dashscope?.requiresApiKey).toBe(true);
      expect(dashscope?.models).toContain('qwen3-coder-plus');
      expect(dashscope?.transformer).toBeDefined();
    });

    it('should include deepseek preset', () => {
      const presets = getFallbackPresets();
      const deepseek = presets.find(p => p.name === 'deepseek');

      expect(deepseek).toBeDefined();
      expect(deepseek?.baseURL).toBe('https://api.deepseek.com/chat/completions');
      expect(deepseek?.models).toContain('deepseek-chat');
      expect(deepseek?.models).toContain('deepseek-reasoner');
    });

    it('should include gemini preset', () => {
      const presets = getFallbackPresets();
      const gemini = presets.find(p => p.name === 'gemini');

      expect(gemini).toBeDefined();
      expect(gemini?.baseURL).toContain('generativelanguage.googleapis.com');
      expect(gemini?.models).toContain('gemini-2.5-flash');
      expect(gemini?.models).toContain('gemini-2.5-pro');
    });

    it('should include modelscope preset', () => {
      const presets = getFallbackPresets();
      const modelscope = presets.find(p => p.name === 'modelscope');

      expect(modelscope).toBeDefined();
      expect(modelscope?.models).toContain('Qwen/Qwen3-Coder-480B-A35B-Instruct');
      expect(modelscope?.transformer).toBeDefined();
    });

    it('should include openrouter preset', () => {
      const presets = getFallbackPresets();
      const openrouter = presets.find(p => p.name === 'openrouter');

      expect(openrouter).toBeDefined();
      expect(openrouter?.baseURL).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(openrouter?.models).toContain('google/gemini-2.5-pro-preview');
      expect(openrouter?.models).toContain('anthropic/claude-sonnet-4');
    });

    it('should include siliconflow preset', () => {
      const presets = getFallbackPresets();
      const siliconflow = presets.find(p => p.name === 'siliconflow');

      expect(siliconflow).toBeDefined();
      expect(siliconflow?.baseURL).toBe('https://api.siliconflow.cn/v1/chat/completions');
      expect(siliconflow?.models).toContain('moonshotai/Kimi-K2-Instruct');
    });

    it('should include volcengine preset', () => {
      const presets = getFallbackPresets();
      const volcengine = presets.find(p => p.name === 'volcengine');

      expect(volcengine).toBeDefined();
      expect(volcengine?.baseURL).toContain('volces.com');
      expect(volcengine?.models).toContain('deepseek-v3-250324');
      expect(volcengine?.models).toContain('deepseek-r1-250528');
    });

    it('should have valid structure for all presets', () => {
      const presets = getFallbackPresets();

      presets.forEach(preset => {
        expect(preset.name).toBeTruthy();
        expect(preset.provider).toBeTruthy();
        expect(typeof preset.requiresApiKey).toBe('boolean');
        expect(Array.isArray(preset.models)).toBe(true);
        expect(preset.models.length).toBeGreaterThan(0);
        
        if (preset.baseURL) {
          expect(preset.baseURL).toMatch(/^https?:\/\//);
        }
      });
    });
  });
});