import { common } from './common';
import { language } from './language';
import { installation } from './installation';
import { api } from './api';
import { configuration } from './configuration';
import { mcp, mcpServices } from './mcp';
import { menu } from './menu';
import { workflow } from './workflow';
import { cli } from './cli';
import { bmad } from './bmad';
import { errors } from './errors';
import { tools } from './tools';
import { ccrMessages } from './ccr';
import type { TranslationStructure, McpServicesTranslations } from '../../types';

// New structure with namespaces
export const en: TranslationStructure = {
  common,
  language,
  installation,
  api,
  configuration,
  mcp,
  menu,
  workflow,
  cli,
  bmad,
  errors,
  tools,
  ccr: ccrMessages,
};

export const enMcpServices: McpServicesTranslations = mcpServices;