import inquirer from 'inquirer';
import ansis from 'ansis';
import type { SupportedLang } from '../constants';
import { I18N, MCP_SERVICES } from '../constants';

/**
 * Common function to select MCP services
 * @param scriptLang Current script language
 * @returns Array of selected service IDs, or undefined if cancelled
 */
export async function selectMcpServices(scriptLang: SupportedLang): Promise<string[] | undefined> {
  const i18n = I18N[scriptLang];
  
  // Build choices without ALL option
  const choices = MCP_SERVICES.map((service) => ({
    name: `${service.name[scriptLang]} - ${ansis.gray(service.description[scriptLang])}`,
    value: service.id,
    selected: false,
  }));

  const { services } = await inquirer.prompt<{ services: string[] }>({
    type: 'checkbox',
    name: 'services',
    message: `${i18n.selectMcpServices}${i18n.multiSelectHint}`,
    choices,
  });

  // Return undefined if cancelled (user pressed Ctrl+C or similar)
  if (services === undefined) {
    console.log(ansis.yellow(i18n.cancelled));
    return undefined;
  }

  // Return the selected services (could be empty array)
  return services;
}