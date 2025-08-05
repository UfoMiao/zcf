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

    // Intelligently merge settings.json instead of copying
    const baseSettingsPath = join(baseTemplateDir, 'settings.json');
    const destSettingsPath = join(CLAUDE_DIR, 'settings.json');
    if (existsSync(baseSettingsPath)) {
      mergeSettingsFile(baseSettingsPath, destSettingsPath);
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

  // Ensure env object exists
  if (!settings.env) {
    settings.env = {};
  }

  // Update API configuration based on auth type
  if (apiConfig.authType === 'api_key') {
    settings.env.ANTHROPIC_API_KEY = apiConfig.key;
    // Remove auth token if switching to API key
    delete settings.env.ANTHROPIC_AUTH_TOKEN;
  } else if (apiConfig.authType === 'auth_token') {
    settings.env.ANTHROPIC_AUTH_TOKEN = apiConfig.key;
    // Remove API key if switching to auth token
    delete settings.env.ANTHROPIC_API_KEY;
  }
  
  // Always update URL if provided
  if (apiConfig.url) {
    settings.env.ANTHROPIC_BASE_URL = apiConfig.url;
  }

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

/**
 * Merge arrays with unique values
 */
function mergeArraysUnique(arr1: any[], arr2: any[]): any[] {
  const combined = [...(arr1 || []), ...(arr2 || [])];
  return [...new Set(combined)];
}

/**
 * Deep merge with options for array handling
 */
function deepMerge(target: any, source: any, options: { mergeArrays?: boolean } = {}): any {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key], options);
    } else if (Array.isArray(source[key]) && options.mergeArrays) {
      // Merge arrays if option is enabled
      result[key] = mergeArraysUnique(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Merge settings.json intelligently
 * Preserves user's environment variables and custom configurations
 */
export function mergeSettingsFile(templatePath: string, targetPath: string): void {
  try {
    // Read template settings
    const templateContent = readFileSync(templatePath, 'utf-8');
    const templateSettings = JSON.parse(templateContent);
    
    // If target doesn't exist, just copy template
    if (!existsSync(targetPath)) {
      writeFileSync(targetPath, JSON.stringify(templateSettings, null, 2));
      return;
    }
    
    // Read existing settings
    const existingContent = readFileSync(targetPath, 'utf-8');
    const existingSettings = JSON.parse(existingContent);
    
    // Special handling for env variables - preserve all user's env vars
    const mergedEnv = {
      ...templateSettings.env,  // Template env vars first
      ...existingSettings.env   // User's env vars override (preserving API keys, etc.)
    };
    
    // Merge settings with special handling for arrays
    const mergedSettings = deepMerge(templateSettings, existingSettings, { mergeArrays: true });
    
    // Ensure user's env vars are preserved
    mergedSettings.env = mergedEnv;
    
    // Handle permissions.allow array specially to avoid duplicates
    if (mergedSettings.permissions && mergedSettings.permissions.allow) {
      mergedSettings.permissions.allow = mergeArraysUnique(
        templateSettings.permissions?.allow || [],
        existingSettings.permissions?.allow || []
      );
    }
    
    // Write merged settings
    writeFileSync(targetPath, JSON.stringify(mergedSettings, null, 2));
  } catch (error) {
    console.error('Failed to merge settings.json:', error);
    // If merge fails, preserve existing file
    if (existsSync(targetPath)) {
      console.error('Preserving existing settings.json due to merge error');
    } else {
      // If no existing file and merge failed, copy template as fallback
      copyFileSync(templatePath, targetPath);
    }
  }
}

/**
 * Get existing API configuration from settings.json
 */
export function getExistingApiConfig(): ApiConfig | null {
  if (!existsSync(SETTINGS_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(content);
    
    if (!settings.env) {
      return null;
    }

    const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = settings.env;
    
    // Check if any API configuration exists
    if (!ANTHROPIC_BASE_URL && !ANTHROPIC_API_KEY && !ANTHROPIC_AUTH_TOKEN) {
      return null;
    }

    // Determine auth type based on which key is present
    let authType: 'auth_token' | 'api_key' | undefined;
    let key: string | undefined;
    
    if (ANTHROPIC_AUTH_TOKEN) {
      authType = 'auth_token';
      key = ANTHROPIC_AUTH_TOKEN;
    } else if (ANTHROPIC_API_KEY) {
      authType = 'api_key';
      key = ANTHROPIC_API_KEY;
    }

    return {
      url: ANTHROPIC_BASE_URL || '',
      key: key || '',
      authType
    };
  } catch (error) {
    console.error('Failed to read existing API config:', error);
    return null;
  }
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
