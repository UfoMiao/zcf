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
import type { TranslationKeys, McpServicesTranslations } from '../../types';

export const zhCN: TranslationKeys = {
  ...common,
  ...language,
  ...installation,
  ...api,
  ...configuration,
  ...mcp,
  ...menu,
  ...workflow,
  ...cli,
  ...bmad,
  ...errors,
};

export const zhCNMcpServices: McpServicesTranslations = mcpServices;