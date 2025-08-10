export interface CcrProvider {
  name: string;
  api_base_url: string;
  api_key: string;
  models: string[];
  transformer?: {
    use?: any[];
    [key: string]: any;
  };
}

export interface CcrRouter {
  default: string;
  background?: string;
  think?: string;
  longContext?: string;
  longContextThreshold?: number;
  webSearch?: string;
}

export interface CcrConfig {
  LOG?: boolean;
  CLAUDE_PATH?: string;
  HOST?: string;
  PORT?: number;
  APIKEY?: string;
  API_TIMEOUT_MS?: string;
  PROXY_URL?: string;
  transformers?: any[];
  Providers: CcrProvider[];
  Router: CcrRouter;
}

export interface CcrPreset {
  id: string;
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyPlaceholder?: string;
  config: Partial<CcrConfig>;
}

export interface ProviderPreset {
  name: string;
  provider: string;
  baseURL?: string;
  requiresApiKey: boolean;
  models: string[];
  description?: string;
  transformer?: any;
}