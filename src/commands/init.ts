import inquirer from 'inquirer';
import ansis from 'ansis';
import { existsSync } from 'node:fs';
import { version } from '../../package.json';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { CLAUDE_DIR, I18N, LANG_LABELS, MCP_SERVICES, SETTINGS_FILE, SUPPORTED_LANGS } from '../constants';
import type { McpServerConfig } from '../types';
import { configureAiPersonality } from '../utils/ai-personality';
import { displayBannerWithInfo } from '../utils/banner';
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler';
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
} from '../utils/config';
import {
  configureApiCompletely,
  modifyApiConfigPartially,
} from '../utils/config-operations';
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
import { isWindows, isTermux } from '../utils/platform';
import { resolveAiOutputLanguage, selectScriptLanguage } from '../utils/prompts';
import { formatApiKeyDisplay } from '../utils/validator';
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config';
import { selectMcpServices } from '../utils/mcp-selector';
import { selectAndInstallWorkflows } from '../utils/workflow-installer';
import { isCcrInstalled, installCcr } from '../utils/ccr/installer';
import { setupCcrConfiguration } from '../utils/ccr/config';

export interface InitOptions {
  lang?: SupportedLang;
  configLang?: SupportedLang;
  aiOutputLang?: AiOutputLanguage | string;
  force?: boolean;
  skipBanner?: boolean;
}



export async function init(options: InitOptions = {}) {
  try {
    // Display banner
    if (!options.skipBanner) {
      displayBannerWithInfo();
    }

    // Step 1: Select ZCF display language
    const scriptLang = await selectScriptLanguage(options.lang);

    const i18n = I18N[scriptLang];
    
    // Show Termux environment info if detected
    if (isTermux()) {
      console.log(ansis.yellow(`\nℹ ${i18n.termuxDetected}`));
      console.log(ansis.gray(i18n.termuxEnvironmentInfo));
    }

    // Step 2: Select config language
    let configLang = options.configLang;
    if (!configLang) {
      const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
        type: 'list',
        name: 'lang',
        message: i18n.selectConfigLang,
        choices: SUPPORTED_LANGS.map((l) => ({
          name: `${LANG_LABELS[l]} - ${i18n.configLangHint[l]}`,
          value: l,
        })),
      });

      if (!lang) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }

      configLang = lang;
    }

    // Step 3: Select AI output language
    const zcfConfig = readZcfConfig();
    const aiOutputLang = await resolveAiOutputLanguage(scriptLang, options.aiOutputLang, zcfConfig);

    // Step 4: Check and install Claude Code
    const installed = await isClaudeCodeInstalled();
    if (!installed) {
      const { shouldInstall } = await inquirer.prompt<{ shouldInstall: boolean }>({
        type: 'confirm',
        name: 'shouldInstall',
        message: i18n.installPrompt,
        default: true,
      });

      if (shouldInstall === undefined) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }

      if (shouldInstall) {
        await installClaudeCode(scriptLang);
      } else {
        console.log(ansis.yellow(i18n.skip));
      }
    } else {
      console.log(ansis.green(`✔ ${i18n.installation.installSuccess}`));
    }

    // Step 5: Handle existing config
    ensureClaudeDir();
    let action = 'new'; // default action for new installation

    if (existsSync(SETTINGS_FILE) && !options.force) {
      const { action: userAction } = await inquirer.prompt<{ action: string }>({
        type: 'list',
        name: 'action',
        message: i18n.existingConfig,
        choices: [
          { name: i18n.backupAndOverwrite, value: 'backup' },
          { name: i18n.updateDocsOnly, value: 'docs-only' },
          { name: i18n.mergeConfig, value: 'merge' },
          { name: i18n.skip, value: 'skip' },
        ],
      });

      if (!userAction) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }

      action = userAction;

      // Handle special cases early
      if (action === 'skip') {
        console.log(ansis.yellow(i18n.skip));
        return;
      }
    }

    // Step 6: Configure API (skip if only updating docs)
    let apiConfig = null;
    const isNewInstall = !existsSync(SETTINGS_FILE);
    if (action !== 'docs-only' && (isNewInstall || ['backup', 'merge'].includes(action))) {
      // Check for existing API configuration
      const existingApiConfig = getExistingApiConfig();

      if (existingApiConfig) {
        // Display existing configuration
        console.log('\n' + ansis.blue(`ℹ ${i18n.existingApiConfig}`));
        console.log(ansis.gray(`  ${i18n.apiConfigUrl}: ${existingApiConfig.url || i18n.notConfigured}`));
        console.log(
          ansis.gray(
            `  ${i18n.apiConfigKey}: ${
              existingApiConfig.key ? formatApiKeyDisplay(existingApiConfig.key) : i18n.notConfigured
            }`
          )
        );
        console.log(ansis.gray(`  ${i18n.apiConfigAuthType}: ${existingApiConfig.authType || i18n.notConfigured}\n`));

        // Ask user what to do with existing config
        const { action: apiAction } = await inquirer.prompt<{ action: string }>({
          type: 'list',
          name: 'action',
          message: i18n.selectApiAction,
          choices: [
            { name: i18n.keepExistingConfig, value: 'keep' },
            { name: i18n.modifyAllConfig, value: 'modify-all' },
            { name: i18n.modifyPartialConfig, value: 'modify-partial' },
            { name: i18n.useCcrProxy, value: 'use-ccr' },
            { name: i18n.skipApi, value: 'skip' },
          ],
        });

        if (!apiAction) {
          console.log(ansis.yellow(i18n.cancelled));
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
              console.error(ansis.red(i18n.failedToSetOnboarding), error);
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
          const ccrInstalled = await isCcrInstalled();
          if (!ccrInstalled) {
            console.log(ansis.yellow(`${i18n.installingCcr}`));
            await installCcr(scriptLang);
          } else {
            console.log(ansis.green(`✔ ${i18n.ccrAlreadyInstalled}`));
          }
          
          // Setup CCR configuration
          const ccrConfigured = await setupCcrConfiguration(scriptLang);
          if (ccrConfigured) {
            console.log(ansis.green(`✔ ${i18n.ccrSetupComplete}`));
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
          message: i18n.configureApi,
          choices: [
            {
              name: `${i18n.useAuthToken} - ${ansis.gray(i18n.authTokenDesc)}`,
              value: 'auth_token',
              short: i18n.useAuthToken,
            },
            {
              name: `${i18n.useApiKey} - ${ansis.gray(i18n.apiKeyDesc)}`,
              value: 'api_key',
              short: i18n.useApiKey,
            },
            {
              name: `${i18n.useCcrProxy} - ${ansis.gray(i18n.ccrProxyDesc)}`,
              value: 'ccr_proxy',
              short: i18n.useCcrProxy,
            },
            {
              name: i18n.skipApi,
              value: 'skip',
            },
          ],
        });

        if (!apiChoice) {
          console.log(ansis.yellow(i18n.cancelled));
          process.exit(0);
        }

        if (apiChoice === 'ccr_proxy') {
          // Handle CCR proxy configuration
          const ccrInstalled = await isCcrInstalled();
          if (!ccrInstalled) {
            await installCcr(scriptLang);
          } else {
            console.log(ansis.green(`✔ ${i18n.ccrAlreadyInstalled}`));
          }
          
          // Setup CCR configuration
          const ccrConfigured = await setupCcrConfiguration(scriptLang);
          if (ccrConfigured) {
            console.log(ansis.green(`✔ ${i18n.ccrSetupComplete}`));
            // CCR configuration already sets up the proxy in settings.json
            // addCompletedOnboarding is already called inside setupCcrConfiguration
            apiConfig = null; // No need for traditional API config
          }
        } else if (apiChoice !== 'skip') {
          apiConfig = await configureApiCompletely(i18n, scriptLang, apiChoice as 'auth_token' | 'api_key');
        }
      }
    }

    // Step 7: Execute the chosen action
    if (['backup', 'docs-only', 'merge'].includes(action)) {
      const backupDir = backupExistingConfig();
      if (backupDir) {
        console.log(ansis.gray(`✔ ${i18n.backupSuccess}: ${backupDir}`));
      }
    }

    if (action === 'docs-only') {
      // Only copy base config files without agents/commands
      copyConfigFiles(configLang, true);
      // Select and install workflows
      await selectAndInstallWorkflows(configLang, scriptLang);
    } else if (['backup', 'merge', 'new'].includes(action)) {
      // Copy all base config files
      copyConfigFiles(configLang, false);
      // Select and install workflows
      await selectAndInstallWorkflows(configLang, scriptLang);
    }

    // Step 8: Apply language directive to language.md
    applyAiLanguageDirective(aiOutputLang);
    // Step 8.5: Configure AI personality
    await configureAiPersonality(scriptLang);

    // Step 9: Apply API configuration (skip if only updating docs)
    if (apiConfig && action !== 'docs-only') {
      const configuredApi = configureApi(apiConfig);
      if (configuredApi) {
        console.log(ansis.green(`✔ ${i18n.apiConfigSuccess}`));
        console.log(ansis.gray(`  URL: ${configuredApi.url}`));
        console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`));
        // addCompletedOnboarding is now called inside configureApi
      }
    }

    // Step 10: Configure MCP services (skip if only updating docs)
    if (action !== 'docs-only') {
      const { shouldConfigureMcp } = await inquirer.prompt<{ shouldConfigureMcp: boolean }>({
        type: 'confirm',
        name: 'shouldConfigureMcp',
        message: i18n.configureMcp,
        default: true,
      });

      if (shouldConfigureMcp === undefined) {
        console.log(ansis.yellow(i18n.cancelled));
        process.exit(0);
      }

      if (shouldConfigureMcp) {
        // Show Windows-specific notice
        if (isWindows()) {
          console.log(ansis.blue(`ℹ ${I18N[scriptLang].windowsDetected}`));
        }

        // Use common MCP selector
        const selectedServices = await selectMcpServices(scriptLang);
        
        if (selectedServices === undefined) {
          process.exit(0);
        }

        if (selectedServices.length > 0) {
          // Backup existing MCP config if exists
          const mcpBackupPath = backupMcpConfig();
          if (mcpBackupPath) {
            console.log(ansis.gray(`✔ ${i18n.mcpBackupSuccess}: ${mcpBackupPath}`));
          }

          // Build MCP server configs
          const newServers: Record<string, McpServerConfig> = {};

          for (const serviceId of selectedServices) {
            const service = MCP_SERVICES.find((s) => s.id === serviceId);
            if (!service) continue;

            let config = service.config;

            // Handle services that require API key
            if (service.requiresApiKey) {
              const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
                type: 'input',
                name: 'apiKey',
                message: service.apiKeyPrompt![scriptLang],
                validate: (value) => !!value || i18n.keyRequired,
              });

              if (apiKey === undefined) {
                console.log(ansis.yellow(`${i18n.skip}: ${service.name[scriptLang]}`));
                continue;
              }

              if (apiKey) {
                config = buildMcpServerConfig(service.config, apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar);
              } else {
                // Skip this service if no API key provided
                continue;
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
            console.log(ansis.green(`✔ ${i18n.mcpConfigSuccess}`));
          } catch (error) {
            console.error(ansis.red(`${i18n.failedToWriteMcpConfig} ${error}`));
          }
        }
      }
    }

    // Step 12: Save zcf config
    updateZcfConfig({
      version,
      preferredLang: scriptLang,
      aiOutputLang: aiOutputLang,
    });

    // Step 13: Success message
    console.log(ansis.green(`✔ ${i18n.configSuccess} ${CLAUDE_DIR}`));
    console.log('\n' + ansis.cyan(i18n.complete));
  } catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error, options.lang);
    }
  }
}
