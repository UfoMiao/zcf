import type { McpServerConfig, McpService } from '../types'
import { ensureI18nInitialized, i18n } from '../i18n'

// Pure business configuration without any i18n text
export interface McpServiceConfig {
  id: string
  requiresApiKey: boolean
  apiKeyEnvVar?: string
  config: McpServerConfig
}

export const MCP_SERVICE_CONFIGS: McpServiceConfig[] = [
  {
    id: 'context7',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp@latest'],
      env: {},
    },
  },
  {
    id: 'open-websearch',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'open-websearch@latest'],
      env: {
        MODE: 'stdio',
        DEFAULT_SEARCH_ENGINE: 'duckduckgo',
        ALLOWED_SEARCH_ENGINES: 'duckduckgo,bing,brave',
      },
    },
  },
  {
    id: 'spec-workflow',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@pimzino/spec-workflow-mcp@latest'],
      env: {},
    },
  },
  {
    id: 'mcp-deepwiki',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-deepwiki@latest'],
      env: {},
    },
  },
  {
    id: 'Playwright',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@playwright/mcp@latest'],
      env: {},
    },
  },
  {
    id: 'exa',
    requiresApiKey: true,
    apiKeyEnvVar: 'EXA_API_KEY',
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'exa-mcp-server@latest'],
      env: {
        EXA_API_KEY: 'YOUR_EXA_API_KEY',
      },
    },
  },
  {
    id: 'serena',
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'uvx',
      args: ['--from', 'git+https://github.com/oraios/serena', 'serena', 'start-mcp-server', '--context', 'ide-assistant', '--enable-web-dashboard', 'false'],
      env: {},
    },
  },
]

/**
 * Get complete MCP service list with translations
 */
export async function getMcpServices(): Promise<McpService[]> {
  ensureI18nInitialized()

  // Create static MCP service list for i18n-ally compatibility
  const mcpServiceList = [
    {
      id: 'context7',
      name: i18n.t('mcp:services.context7.name'),
      description: i18n.t('mcp:services.context7.description'),
    },
    {
      id: 'open-websearch',
      name: i18n.t('mcp:services.open-websearch.name'),
      description: i18n.t('mcp:services.open-websearch.description'),
    },
    {
      id: 'spec-workflow',
      name: i18n.t('mcp:services.spec-workflow.name'),
      description: i18n.t('mcp:services.spec-workflow.description'),
    },
    {
      id: 'mcp-deepwiki',
      name: i18n.t('mcp:services.mcp-deepwiki.name'),
      description: i18n.t('mcp:services.mcp-deepwiki.description'),
    },
    {
      id: 'Playwright',
      name: i18n.t('mcp:services.playwright.name'),
      description: i18n.t('mcp:services.playwright.description'),
    },
    {
      id: 'exa',
      name: i18n.t('mcp:services.exa.name'),
      description: i18n.t('mcp:services.exa.description'),
      apiKeyPrompt: i18n.t('mcp:services.exa.apiKeyPrompt'),
    },
    {
      id: 'serena',
      name: i18n.t('mcp:services.serena.name'),
      description: i18n.t('mcp:services.serena.description'),
    },
  ]

  return MCP_SERVICE_CONFIGS.map((config) => {
    const serviceInfo = mcpServiceList.find(s => s.id === config.id)
    const service: McpService = {
      id: config.id,
      name: serviceInfo?.name || config.id,
      description: serviceInfo?.description || '',
      requiresApiKey: config.requiresApiKey,
      config: config.config,
    }

    // Add API key related fields
    if (config.requiresApiKey && serviceInfo?.apiKeyPrompt) {
      if (serviceInfo.apiKeyPrompt !== `mcp.services.${config.id}.apiKeyPrompt`) {
        service.apiKeyPrompt = serviceInfo.apiKeyPrompt
      }
    }

    if (config.apiKeyEnvVar) {
      service.apiKeyEnvVar = config.apiKeyEnvVar
    }

    return service
  })
}

/**
 * Get specified MCP service by ID
 */
export async function getMcpService(id: string): Promise<McpService | undefined> {
  const services = await getMcpServices()
  return services.find(service => service.id === id)
}
