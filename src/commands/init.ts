import ansis from 'ansis';
import inquirer from 'inquirer';
import { existsSync } from 'node:fs';
import { version } from '../../package.json';
import { WORKFLOW_CONFIGS } from '../config/workflows';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N, LANG_LABELS, MCP_SERVICES, SETTINGS_FILE, SUPPORTED_LANGS } from '../constants';
import type { McpServerConfig } from '../types';
import { configureAiPersonality } from '../utils/ai-personality';
import { displayBannerWithInfo } from '../utils/banner';
import { setupCcrConfiguration } from '../utils/ccr/config';
import { installCcr, isCcrInstalled } from '../utils/ccr/installer';
import { installCometixLine, isCometixLineInstalled } from '../utils/cometix/installer';
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
} from '../utils/config';
import { configureApiCompletely, modifyApiConfigPartially } from '../utils/config-operations';
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler';
import { installClaudeCode, isClaudeCodeInstalled } from '../utils/installer';
import {
  addCompletedOnboarding,
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  mergeMcpServers,
  readMcpConfig,
  writeMcpConfig,
} from '../utils/mcp';
import { selectMcpServices } from '../utils/mcp-selector';
import { isTermux, isWindows } from '../utils/platform';
import { addNumbersToChoices } from '../utils/prompt-helpers';
import { resolveAiOutputLanguage, selectScriptLanguage } from '../utils/prompts';
import { formatApiKeyDisplay } from '../utils/validator';
import { selectAndInstallWorkflows } from '../utils/workflow-installer';
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config';

export interface InitOptions {
  lang?: SupportedLang;
  configLang?: SupportedLang;
  aiOutputLang?: AiOutputLanguage | string;
  force?: boolean;
  skipBanner?: boolean;
  skipPrompt?: boolean;
  // Non-interactive parameters
  configAction?: 'new' | 'backup' | 'merge' | 'docs-only' | 'skip';
  apiType?: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip';
  apiKey?: string; // Used for both API key and auth token
  apiUrl?: string;
  mcpServices?: string[] | string | boolean;
  workflows?: string[] | string | boolean;
  aiPersonality?: string;
  allLang?: string; // New: unified language parameter
  installCometixLine?: string | boolean; // New: CCometixLine installation control
}

function validateSkipPromptOptions(options: InitOptions) {
  // Apply --all-lang logic first
  if (options.allLang) {
    if (options.allLang === 'zh-CN' || options.allLang === 'en') {
      // Use allLang for all three language parameters
      options.lang = options.allLang as SupportedLang;
      options.configLang = options.allLang as SupportedLang;
      options.aiOutputLang = options.allLang;
    } else {
      // Use en for lang/config-lang, allLang for ai-output-lang
      options.lang = 'en';
      options.configLang = 'en';
      options.aiOutputLang = options.allLang;
    }
  }

  // Set defaults
  if (!options.configAction) {
    options.configAction = 'backup';
  }
  if (!options.lang) {
    options.lang = 'en';
  }
  if (!options.configLang) {
    options.configLang = 'en';
  }
  if (!options.aiOutputLang) {
    options.aiOutputLang = 'en';
  }
  if (!options.aiPersonality) {
    options.aiPersonality = 'professional';
  }
  // Parse installCometixLine parameter
  if (typeof options.installCometixLine === 'string') {
    options.installCometixLine = options.installCometixLine.toLowerCase() === 'true';
  }
  if (options.installCometixLine === undefined) {
    options.installCometixLine = true;
  }

  // Validate configAction
  if (options.configAction && !['new', 'backup', 'merge', 'docs-only', 'skip'].includes(options.configAction)) {
    throw new Error(
      `Invalid configAction value: ${options.configAction}. Must be 'new', 'backup', 'merge', 'docs-only', or 'skip'`
    );
  }

  // Validate apiType
  if (options.apiType && !['auth_token', 'api_key', 'ccr_proxy', 'skip'].includes(options.apiType)) {
    throw new Error(
      `Invalid apiType value: ${options.apiType}. Must be 'auth_token', 'api_key', 'ccr_proxy', or 'skip'`
    );
  }

  // Validate required API parameters (both use apiKey now)
  if (options.apiType === 'api_key' && !options.apiKey) {
    throw new Error('API key is required when apiType is "api_key"');
  }

  if (options.apiType === 'auth_token' && !options.apiKey) {
    throw new Error('API key is required when apiType is "auth_token"');
  }

  // Parse and validate MCP services
  if (typeof options.mcpServices === 'string') {
    if (options.mcpServices === 'skip') {
      options.mcpServices = false;
    } else if (options.mcpServices === 'all') {
      options.mcpServices = MCP_SERVICES.filter(s => !s.requiresApiKey).map(s => s.id);
    } else {
      options.mcpServices = options.mcpServices.split(',').map((s) => s.trim());
    }
  }
  if (Array.isArray(options.mcpServices)) {
    const validServices = MCP_SERVICES.map((s) => s.id);
    for (const service of options.mcpServices) {
      if (!validServices.includes(service)) {
        throw new Error(`Invalid MCP service: ${service}. Available services: ${validServices.join(', ')}`);
      }
    }
  }

  // Parse and validate workflows
  if (typeof options.workflows === 'string') {
    if (options.workflows === 'skip') {
      options.workflows = false;
    } else if (options.workflows === 'all') {
      options.workflows = WORKFLOW_CONFIGS.map((w: any) => w.id);
    } else {
      options.workflows = options.workflows.split(',').map((s) => s.trim());
    }
  }
  if (Array.isArray(options.workflows)) {
    const validWorkflows = WORKFLOW_CONFIGS.map((w: any) => w.id);
    for (const workflow of options.workflows) {
      if (!validWorkflows.includes(workflow)) {
        throw new Error(`Invalid workflow: ${workflow}. Available workflows: ${validWorkflows.join(', ')}`);
      }
    }
  }

  // Set default MCP services (use "all" as explicit default)
  if (options.mcpServices === undefined) {
    options.mcpServices = 'all';
    // Convert "all" to actual service array
    options.mcpServices = MCP_SERVICES.filter(s => !s.requiresApiKey).map(s => s.id);
  }

  // Set default workflows (use "all" as explicit default)
  if (options.workflows === undefined) {
    options.workflows = 'all';
    // Convert "all" to actual workflow array
    options.workflows = WORKFLOW_CONFIGS.map((w: any) => w.id);
  }
}

export async function init(options: InitOptions = {}) {
  // Validate options if in skip-prompt mode (outside try-catch to allow errors to propagate in tests)
  if (options.skipPrompt) {
    validateSkipPromptOptions(options);
  }

  try {
    // Display banner
    if (!options.skipBanner) {
      displayBannerWithInfo();
    }

    // Step 1: Select ZCF display language
    const scriptLang = options.skipPrompt ? options.lang || 'en' : await selectScriptLanguage(options.lang);

    const i18n = I18N[scriptLang];

    // Show Termux environment info if detected
    if (isTermux()) {
      console.log(ansis.yellow(`\nℹ ${i18n.installation.termuxDetected}`));
      console.log(ansis.gray(i18n.installation.termuxEnvironmentInfo));
    }

    // Step 2: Select config language
    let configLang = options.configLang;
    if (!configLang && !options.skipPrompt) {
      const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
        type: 'list',
        name: 'lang',
        message: i18n.language.selectConfigLang,
        choices: addNumbersToChoices(
          SUPPORTED_LANGS.map((l) => ({
            name: `${LANG_LABELS[l]} - ${i18n.language.configLangHint[l]}`,
            value: l,
          }))
        ),
      });

      if (!lang) {
        console.log(ansis.yellow(i18n.common.cancelled));
        process.exit(0);
      }

      configLang = lang;
    } else if (!configLang && options.skipPrompt) {
      configLang = 'en'; // Default to English in skip-prompt mode
    }

    // Step 3: Select AI output language
    const zcfConfig = readZcfConfig();
    const aiOutputLang = options.skipPrompt
      ? options.aiOutputLang || 'en'
      : await resolveAiOutputLanguage(scriptLang, options.aiOutputLang, zcfConfig);

    // Step 4: Check and install Claude Code (auto-install in skip-prompt mode)
    const installed = await isClaudeCodeInstalled();
    if (!installed) {
      if (options.skipPrompt) {
        // In skip-prompt mode, auto-install Claude Code
        await installClaudeCode(scriptLang);
      } else {
        const { shouldInstall } = await inquirer.prompt<{ shouldInstall: boolean }>({
          type: 'confirm',
          name: 'shouldInstall',
          message: i18n.installation.installPrompt,
          default: true,
        });

        if (shouldInstall === undefined) {
          console.log(ansis.yellow(i18n.common.cancelled));
          process.exit(0);
        }

        if (shouldInstall) {
          await installClaudeCode(scriptLang);
        } else {
          console.log(ansis.yellow(i18n.common.skip));
        }
      }
    } else {
      console.log(ansis.green(`✔ ${i18n.installation.alreadyInstalled}`));
    }

    // Step 5: Handle existing config
    ensureClaudeDir();
    let action = 'new'; // default action for new installation

    if (existsSync(SETTINGS_FILE) && !options.force) {
      if (options.skipPrompt) {
        // In skip-prompt mode, use configAction option (default: backup)
        action = options.configAction || 'backup';
        if (action === 'skip') {
          console.log(ansis.yellow(i18n.common.skip));
          return;
        }
      } else {
        const { action: userAction } = await inquirer.prompt<{ action: string }>({
          type: 'list',
          name: 'action',
          message: i18n.configuration.existingConfig,
          choices: addNumbersToChoices([
            { name: i18n.configuration.backupAndOverwrite, value: 'backup' },
            { name: i18n.configuration.updateDocsOnly, value: 'docs-only' },
            { name: i18n.configuration.mergeConfig, value: 'merge' },
            { name: i18n.common.skip, value: 'skip' },
          ]),
        });

        if (!userAction) {
          console.log(ansis.yellow(i18n.common.cancelled));
          process.exit(0);
        }

        action = userAction;

        // Handle special cases early
        if (action === 'skip') {
          console.log(ansis.yellow(i18n.common.skip));
          return;
        }
      }
    } else if (options.skipPrompt && options.configAction) {
      action = options.configAction;
    }

    // Step 6: Configure API (skip if only updating docs)
    let apiConfig = null;
    const isNewInstall = !existsSync(SETTINGS_FILE);
    if (action !== 'docs-only' && (isNewInstall || ['backup', 'merge'].includes(action))) {
      // In skip-prompt mode, handle API configuration directly
      if (options.skipPrompt) {
        if (options.apiType === 'auth_token' && options.apiKey) {
          apiConfig = {
            authType: 'auth_token',
            key: options.apiKey,
            url: options.apiUrl || 'https://api.anthropic.com',
          };
        } else if (options.apiType === 'api_key' && options.apiKey) {
          apiConfig = {
            authType: 'api_key',
            key: options.apiKey,
            url: options.apiUrl || 'https://api.anthropic.com',
          };
        } else if (options.apiType === 'ccr_proxy') {
          // Handle CCR proxy configuration
          const ccrInstalled = await isCcrInstalled();
          if (!ccrInstalled) {
            await installCcr(scriptLang);
          }
          const ccrConfigured = await setupCcrConfiguration(scriptLang);
          if (ccrConfigured) {
            console.log(ansis.green(`✔ ${i18n.ccr.ccrSetupComplete}`));
            apiConfig = null; // CCR sets up its own proxy config
          }
        }
      } else {
        // Check for existing API configuration
        const existingApiConfig = getExistingApiConfig();

        if (existingApiConfig) {
          // Display existing configuration
          console.log('\n' + ansis.blue(`ℹ ${i18n.api.existingApiConfig}`));
          console.log(ansis.gray(`  ${i18n.api.apiConfigUrl}: ${existingApiConfig.url || i18n.common.notConfigured}`));
          console.log(
            ansis.gray(
              `  ${i18n.api.apiConfigKey}: ${
                existingApiConfig.key ? formatApiKeyDisplay(existingApiConfig.key) : i18n.common.notConfigured
              }`
            )
          );
          console.log(
            ansis.gray(`  ${i18n.api.apiConfigAuthType}: ${existingApiConfig.authType || i18n.common.notConfigured}\n`)
          );

          // Ask user what to do with existing config
          const { action: apiAction } = await inquirer.prompt<{ action: string }>({
            type: 'list',
            name: 'action',
            message: i18n.api.selectApiAction,
            choices: addNumbersToChoices([
              { name: i18n.api.keepExistingConfig, value: 'keep' },
              { name: i18n.api.modifyAllConfig, value: 'modify-all' },
              { name: i18n.api.modifyPartialConfig, value: 'modify-partial' },
              { name: i18n.api.useCcrProxy, value: 'use-ccr' },
              { name: i18n.api.skipApi, value: 'skip' },
            ]),
          });

          if (!apiAction) {
            console.log(ansis.yellow(i18n.common.cancelled));
            process.exit(0);
          }

          if (apiAction === 'keep' || apiAction === 'skip') {
            // Keep existing config, no changes needed
            apiConfig = null;
            // Ensure onboarding flag is set for existing API config
            if (apiAction === 'keep') {
              try {
                addCompletedOnboarding();
              } catch (error) {
                console.error(ansis.red(i18n.configuration.failedToSetOnboarding), error);
              }
            }
          } else if (apiAction === 'modify-partial') {
            // Handle partial modification
            await modifyApiConfigPartially(existingApiConfig, i18n, scriptLang);
            apiConfig = null; // No need to configure again
            // addCompletedOnboarding is already called inside modifyApiConfigPartially
          } else if (apiAction === 'modify-all') {
            // Proceed with full configuration
            apiConfig = await configureApiCompletely(i18n, scriptLang);
          } else if (apiAction === 'use-ccr') {
            // Handle CCR proxy configuration
            const ccrStatus = await isCcrInstalled();
            if (!ccrStatus.hasCorrectPackage) {
              await installCcr(scriptLang);
            } else {
              console.log(ansis.green(`✔ ${i18n.ccr.ccrAlreadyInstalled}`));
            }

            // Setup CCR configuration
            const ccrConfigured = await setupCcrConfiguration(scriptLang);
            if (ccrConfigured) {
              console.log(ansis.green(`✔ ${i18n.ccr.ccrSetupComplete}`));
              // CCR configuration already sets up the proxy in settings.json
              // addCompletedOnboarding is already called inside setupCcrConfiguration
              apiConfig = null; // No need for traditional API config
            }
          }
        } else {
          // No existing config, proceed with normal flow
          const { apiChoice } = await inquirer.prompt<{ apiChoice: string }>({
            type: 'list',
            name: 'apiChoice',
            message: i18n.api.configureApi,
            choices: [
              {
                name: `${i18n.api.useAuthToken} - ${ansis.gray(i18n.api.authTokenDesc)}`,
                value: 'auth_token',
                short: i18n.api.useAuthToken,
              },
              {
                name: `${i18n.api.useApiKey} - ${ansis.gray(i18n.api.apiKeyDesc)}`,
                value: 'api_key',
                short: i18n.api.useApiKey,
              },
              {
                name: `${i18n.api.useCcrProxy} - ${ansis.gray(i18n.api.ccrProxyDesc)}`,
                value: 'ccr_proxy',
                short: i18n.api.useCcrProxy,
              },
              {
                name: i18n.api.skipApi,
                value: 'skip',
              },
            ],
          });

          if (!apiChoice) {
            console.log(ansis.yellow(i18n.common.cancelled));
            process.exit(0);
          }

          if (apiChoice === 'ccr_proxy') {
            // Handle CCR proxy configuration
            const ccrStatus = await isCcrInstalled();
            if (!ccrStatus.hasCorrectPackage) {
              await installCcr(scriptLang);
            } else {
              console.log(ansis.green(`✔ ${i18n.ccr.ccrAlreadyInstalled}`));
            }

            // Setup CCR configuration
            const ccrConfigured = await setupCcrConfiguration(scriptLang);
            if (ccrConfigured) {
              console.log(ansis.green(`✔ ${i18n.ccr.ccrSetupComplete}`));
              // CCR configuration already sets up the proxy in settings.json
              // addCompletedOnboarding is already called inside setupCcrConfiguration
              apiConfig = null; // No need for traditional API config
            }
          } else if (apiChoice !== 'skip') {
            apiConfig = await configureApiCompletely(i18n, scriptLang, apiChoice as 'auth_token' | 'api_key');
          }
        }
      }
    }

    // Step 7: Execute the chosen action
    if (['backup', 'docs-only', 'merge'].includes(action)) {
      const backupDir = backupExistingConfig();
      if (backupDir) {
        console.log(ansis.gray(`✔ ${i18n.configuration.backupSuccess}: ${backupDir}`));
      }
    }

    if (action === 'docs-only') {
      // Only copy base config files without agents/commands
      copyConfigFiles(configLang!, true);
      // Select and install workflows
      if (options.skipPrompt) {
        // Use provided workflows or default to all workflows, skip if false
        if (options.workflows !== false) {
          await selectAndInstallWorkflows(configLang!, scriptLang, options.workflows as string[]);
        }
      } else {
        await selectAndInstallWorkflows(configLang!, scriptLang);
      }
    } else if (['backup', 'merge', 'new'].includes(action)) {
      // Copy all base config files
      copyConfigFiles(configLang!, false);
      // Select and install workflows
      if (options.skipPrompt) {
        // Use provided workflows or default to all workflows, skip if false
        if (options.workflows !== false) {
          await selectAndInstallWorkflows(configLang!, scriptLang, options.workflows as string[]);
        }
      } else {
        await selectAndInstallWorkflows(configLang!, scriptLang);
      }
    }

    // Step 8: Apply language directive to language.md
    applyAiLanguageDirective(aiOutputLang as AiOutputLanguage | string);
    // Step 8.5: Configure AI personality
    if (options.skipPrompt) {
      // Use provided personality or default to 'professional'
      await configureAiPersonality(scriptLang, options.aiPersonality!);
    } else {
      await configureAiPersonality(scriptLang);
    }

    // Step 9: Apply API configuration (skip if only updating docs)
    if (apiConfig && action !== 'docs-only') {
      const configuredApi = configureApi(apiConfig as any);
      if (configuredApi) {
        console.log(ansis.green(`✔ ${i18n.api.apiConfigSuccess}`));
        console.log(ansis.gray(`  URL: ${configuredApi.url}`));
        console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`));
        // addCompletedOnboarding is now called inside configureApi
      }
    }

    // Step 10: Configure MCP services (skip if only updating docs)
    if (action !== 'docs-only') {
      let shouldConfigureMcp = false;

      if (options.skipPrompt) {
        // In skip-prompt mode, configure MCP only if services are not explicitly disabled
        shouldConfigureMcp = options.mcpServices !== false;
      } else {
        const { shouldConfigureMcp: userChoice } = await inquirer.prompt<{ shouldConfigureMcp: boolean }>({
          type: 'confirm',
          name: 'shouldConfigureMcp',
          message: i18n.mcp.configureMcp,
          default: true,
        });

        if (userChoice === undefined) {
          console.log(ansis.yellow(i18n.common.cancelled));
          process.exit(0);
        }

        shouldConfigureMcp = userChoice;
      }

      if (shouldConfigureMcp) {
        // Show Windows-specific notice
        if (isWindows()) {
          console.log(ansis.blue(`ℹ ${i18n.installation.windowsDetected}`));
        }

        // Use common MCP selector or skip-prompt services
        let selectedServices: string[] | undefined;

        if (options.skipPrompt) {
          selectedServices = options.mcpServices as string[];
        } else {
          selectedServices = await selectMcpServices(scriptLang);
          if (selectedServices === undefined) {
            process.exit(0);
          }
        }

        if (selectedServices.length > 0) {
          // Backup existing MCP config if exists
          const mcpBackupPath = backupMcpConfig();
          if (mcpBackupPath) {
            console.log(ansis.gray(`✔ ${i18n.mcp.mcpBackupSuccess}: ${mcpBackupPath}`));
          }

          // Build MCP server configs
          const newServers: Record<string, McpServerConfig> = {};

          for (const serviceId of selectedServices) {
            const service = MCP_SERVICES.find((s) => s.id === serviceId);
            if (!service) continue;

            let config = service.config;

            // Handle services that require API key
            if (service.requiresApiKey) {
              if (options.skipPrompt) {
                // In skip-prompt mode, skip services that require API keys
                console.log(ansis.yellow(`${i18n.common.skip}: ${service.name[scriptLang]} (requires API key)`));
                continue;
              } else {
                const response = await inquirer.prompt<{ apiKey: string }>({
                  type: 'input',
                  name: 'apiKey',
                  message: service.apiKeyPrompt![scriptLang],
                  validate: (value) => !!value || i18n.api.keyRequired,
                });
                
                if (!response.apiKey) {
                  console.log(ansis.yellow(`${i18n.common.skip}: ${service.name[scriptLang]}`));
                  continue;
                }

                config = buildMcpServerConfig(service.config, response.apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar);
              }
            }

            newServers[service.id] = config;
          }

          // Merge with existing config
          const existingConfig = readMcpConfig();
          let mergedConfig = mergeMcpServers(existingConfig, newServers);

          // Fix Windows config if needed
          mergedConfig = fixWindowsMcpConfig(mergedConfig);

          // Write the config with error handling
          try {
            writeMcpConfig(mergedConfig);
            console.log(ansis.green(`✔ ${i18n.mcp.mcpConfigSuccess}`));
          } catch (error) {
            console.error(ansis.red(`${i18n.configuration.failedToWriteMcpConfig} ${error}`));
          }
        }
      }
    }

    // Step 11: CCometixLine installation
    const cometixInstalled = await isCometixLineInstalled();
    if (!cometixInstalled) {
      let shouldInstallCometix = false;

      if (options.skipPrompt) {
        // Use installCometixLine option or default to true
        shouldInstallCometix = options.installCometixLine !== false;
      } else {
        const { shouldInstallCometix: userChoice } = await inquirer.prompt<{ shouldInstallCometix: boolean }>({
          type: 'confirm',
          name: 'shouldInstallCometix',
          message: i18n.cometix.installCometixPrompt,
          default: true,
        });

        if (userChoice === undefined) {
          console.log(ansis.yellow(i18n.common.cancelled));
          process.exit(0);
        }

        shouldInstallCometix = userChoice;
      }

      if (shouldInstallCometix) {
        await installCometixLine(scriptLang);
      } else {
        console.log(ansis.yellow(i18n.cometix.cometixSkipped));
      }
    } else {
      console.log(ansis.green(`✔ ${i18n.cometix.cometixAlreadyInstalled}`));
    }

    // Step 12: Save zcf config
    updateZcfConfig({
      version,
      preferredLang: scriptLang,
      aiOutputLang: aiOutputLang as AiOutputLanguage | string,
    });

    // Step 13: Success message
    console.log(ansis.green(`✔ ${i18n.configuration.configSuccess} ${CLAUDE_DIR}`));
    console.log('\n' + ansis.cyan(i18n.common.complete));
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error, options.lang);
    }
  }
}
