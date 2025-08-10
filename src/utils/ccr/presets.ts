import type { ProviderPreset } from '../../types/ccr';

const PROVIDER_PRESETS_URL = 'https://pub-0dc3e1677e894f07bbea11b17a29e032.r2.dev/providers.json';

export async function fetchProviderPresets(): Promise<ProviderPreset[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(PROVIDER_PRESETS_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Transform the data to our ProviderPreset format
    const presets: ProviderPreset[] = [];

    // Parse the providers from the fetched data (it's an array)
    if (Array.isArray(data)) {
      for (const provider of data) {
        if (provider && typeof provider === 'object') {
          presets.push({
            name: provider.name || '',
            provider: provider.name || '',
            baseURL: provider.api_base_url || provider.baseURL || provider.url,
            requiresApiKey: provider.api_key === '' || provider.requiresApiKey !== false,
            models: provider.models || [],
            description: provider.description || provider.name || '',
            transformer: provider.transformer,
          });
        }
      }
    } else if (data && typeof data === 'object') {
      // Fallback for object format
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          const provider = value as any;
          presets.push({
            name: provider.name || key,
            provider: key,
            baseURL: provider.api_base_url || provider.baseURL || provider.url,
            requiresApiKey: provider.api_key === '' || provider.requiresApiKey !== false,
            models: provider.models || [],
            description: provider.description || '',
            transformer: provider.transformer,
          });
        }
      }
    }

    return presets;
  } catch (error) {
    // Silently fall back to local presets, don't show error to user
    // console.error('Failed to fetch provider presets:', error);
    return getFallbackPresets();
  }
}

export function getFallbackPresets(): ProviderPreset[] {
  return [
    {
      name: 'dashscope',
      provider: 'dashscope',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      requiresApiKey: true,
      models: ['qwen3-coder-plus'],
      description: 'Alibaba DashScope',
      transformer: {
        use: [['maxtoken', { max_tokens: 65536 }]],
        'qwen3-coder-plus': {
          use: ['enhancetool'],
        },
      },
    },
    {
      name: 'deepseek',
      provider: 'deepseek',
      baseURL: 'https://api.deepseek.com/chat/completions',
      requiresApiKey: true,
      models: ['deepseek-chat', 'deepseek-reasoner'],
      description: 'DeepSeek AI models',
      transformer: {
        use: ['deepseek'],
        'deepseek-chat': {
          use: ['tooluse'],
        },
      },
    },
    {
      name: 'gemini',
      provider: 'gemini',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/',
      requiresApiKey: true,
      models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
      description: 'Google Gemini models',
      transformer: {
        use: ['gemini'],
      },
    },
    {
      name: 'modelscope',
      provider: 'modelscope',
      baseURL: 'https://api-inference.modelscope.cn/v1/chat/completions',
      requiresApiKey: true,
      models: ['Qwen/Qwen3-Coder-480B-A35B-Instruct', 'Qwen/Qwen3-235B-A22B-Thinking-2507', 'ZhipuAI/GLM-4.5'],
      description: 'ModelScope AI models',
      transformer: {
        use: [['maxtoken', { max_tokens: 65536 }]],
        'Qwen/Qwen3-Coder-480B-A35B-Instruct': {
          use: ['enhancetool'],
        },
        'Qwen/Qwen3-235B-A22B-Thinking-2507': {
          use: ['reasoning'],
        },
      },
    },
    {
      name: 'openrouter',
      provider: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1/chat/completions',
      requiresApiKey: true,
      models: [
        'google/gemini-2.5-pro-preview',
        'anthropic/claude-sonnet-4',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3.7-sonnet:thinking',
      ],
      description: 'OpenRouter API',
      transformer: {
        use: ['openrouter'],
      },
    },
    {
      name: 'siliconflow',
      provider: 'siliconflow',
      baseURL: 'https://api.siliconflow.cn/v1/chat/completions',
      requiresApiKey: true,
      models: ['moonshotai/Kimi-K2-Instruct'],
      description: 'SiliconFlow AI',
      transformer: {
        use: [['maxtoken', { max_tokens: 16384 }]],
      },
    },
    {
      name: 'volcengine',
      provider: 'volcengine',
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      requiresApiKey: true,
      models: ['deepseek-v3-250324', 'deepseek-r1-250528'],
      description: 'Volcengine AI',
      transformer: {
        use: ['deepseek'],
      },
    },
  ];
}
