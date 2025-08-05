import dayjs from 'dayjs';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'pathe';
import type { AiOutputLanguage, SupportedLang } from '../constants';
import { AI_OUTPUT_LANGUAGES, CLAUDE_DIR, CLAUDE_MD_FILE, SETTINGS_FILE } from '../constants';

export function ensureClaudeDir() {
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }
}

export function backupExistingConfig() {
  if (!existsSync(CLAUDE_DIR)) {
    return null;
  }

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
  const backupBaseDir = join(CLAUDE_DIR, 'backup');
  const backupDir = join(backupBaseDir, `backup_${timestamp}`);

  // Create backup directory
  mkdirSync(backupDir, { recursive: true });

  // Copy all files from CLAUDE_DIR to backup directory (excluding backup folder itself)
  const entries = readdirSync(CLAUDE_DIR);
  for (const entry of entries) {
    if (entry === 'backup') continue; // Skip backup directory itself
    const srcPath = join(CLAUDE_DIR, entry);
    const destPath = join(backupDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }

  return backupDir;
}

export function copyConfigFiles(lang: SupportedLang, onlyMd: boolean = false) {
  // Get the root directory of the package
  const currentFileUrl = new URL(import.meta.url);
  const currentFilePath = currentFileUrl.pathname;
  // Navigate from dist/shared/xxx.mjs to package root
  const distDir = dirname(dirname(currentFilePath));
  const rootDir = dirname(distDir);
  const sourceDir = join(rootDir, 'templates', lang);
  const baseTemplateDir = join(rootDir, 'templates');

  if (!existsSync(sourceDir)) {
    throw new Error(`Template directory not found: ${sourceDir}`);
  }

  if (onlyMd) {
    // Only copy .md files and maintain directory structure
    copyMdFiles(sourceDir, CLAUDE_DIR);
  } else {
    // Copy all files from language-specific directory
    copyDirectory(sourceDir, CLAUDE_DIR);

    // Copy base settings.json from templates root directory
    const baseSettingsPath = join(baseTemplateDir, 'settings.json');
    const destSettingsPath = join(CLAUDE_DIR, 'settings.json');
    if (existsSync(baseSettingsPath)) {
      copyFileSync(baseSettingsPath, destSettingsPath);
    }
  }
}

function copyMdFiles(src: string, dest: string) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      // Recursively copy directories to maintain structure
      copyMdFiles(srcPath, destPath);
    } else if (entry.endsWith('.md')) {
      // Only copy .md files
      copyFileSync(srcPath, destPath);
    }
  }
}

function copyDirectory(src: string, dest: string) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);

  for (const entry of entries) {
    // Skip settings.json in language-specific directories (will use base template)
    if (entry === 'settings.json') {
      continue;
    }

    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export interface ApiConfig {
  url: string;
  key: string;
  authType?: 'auth_token' | 'api_key';
}

/**
 * Read default settings.json configuration from template directory
 */
function getDefaultSettings(): any {
  try {
    // Get template directory path
    const currentFileUrl = new URL(import.meta.url);
    const currentFilePath = currentFileUrl.pathname;
    const distDir = dirname(dirname(currentFilePath));
    const rootDir = dirname(distDir);
    const templateSettingsPath = join(rootDir, 'templates', 'settings.json');

    if (existsSync(templateSettingsPath)) {
      const content = readFileSync(templateSettingsPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to read template settings.json:', error);
    return {};
  }
}

export function configureApi(apiConfig: ApiConfig | null): ApiConfig | null {
  if (!apiConfig) return null;

  // Get default configuration from template
  let settings = getDefaultSettings();

  // Merge with existing user configuration if available
  if (existsSync(SETTINGS_FILE)) {
    const content = readFileSync(SETTINGS_FILE, 'utf-8');
    try {
      const existingSettings = JSON.parse(content);
      // Use deepMerge for deep merge, preserving user's custom configuration
      settings = deepMerge(settings, existingSettings);
    } catch (error) {
      console.error('Failed to parse existing settings.json, using defaults:', error);
    }
  }

  // Update API configuration based on auth type
  if (apiConfig.authType === 'api_key') {
    settings.env.ANTHROPIC_API_KEY = apiConfig.key;
  } else {
    // Default to AUTH_TOKEN for backward compatibility
    settings.env.ANTHROPIC_AUTH_TOKEN = apiConfig.key;
  }
  settings.env.ANTHROPIC_BASE_URL = apiConfig.url;

  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return apiConfig;
}

export function mergeConfigs(sourceFile: string, targetFile: string) {
  if (!existsSync(sourceFile)) return;

  let target: any = {};
  if (existsSync(targetFile)) {
    const content = readFileSync(targetFile, 'utf-8');
    try {
      target = JSON.parse(content);
    } catch {
      target = {};
    }
  }

  const source = JSON.parse(readFileSync(sourceFile, 'utf-8'));

  // Deep merge logic
  const merged = deepMerge(target, source);

  writeFileSync(targetFile, JSON.stringify(merged, null, 2));
}

export function updateDefaultModel(model: 'opus' | 'sonnet') {
  let settings = getDefaultSettings();
  
  if (existsSync(SETTINGS_FILE)) {
    const content = readFileSync(SETTINGS_FILE, 'utf-8');
    try {
      settings = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse existing settings.json:', error);
    }
  }
  
  // Update model in settings
  settings.model = model;
  
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

export function applyAiLanguageDirective(aiOutputLang: AiOutputLanguage | string) {
  // Read the existing CLAUDE.md file
  if (!existsSync(CLAUDE_MD_FILE)) {
    return;
  }

  let content = readFileSync(CLAUDE_MD_FILE, 'utf-8');

  // Remove any existing language directive at the beginning
  const lines = content.split('\n');
  if (lines[0] && lines[0].startsWith('Always respond in')) {
    lines.shift(); // Remove the first line
    // Also remove empty line after it if exists
    if (lines[0] === '') {
      lines.shift();
    }
    content = lines.join('\n');
  }

  // Prepare the language directive
  let directive = '';
  if (aiOutputLang === 'custom') {
    // Custom language will be handled by the caller
    return;
  } else if (AI_OUTPUT_LANGUAGES[aiOutputLang as AiOutputLanguage]) {
    directive = AI_OUTPUT_LANGUAGES[aiOutputLang as AiOutputLanguage].directive;
  } else {
    // It's a custom language string
    directive = `Always respond in ${aiOutputLang}`;
  }

  // Add the new directive at the beginning
  const newContent = directive + '\n\n' + content;

  // Write back to the file
  writeFileSync(CLAUDE_MD_FILE, newContent, 'utf-8');
}
