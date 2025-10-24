/**
 * Code Comment Language Detection Module
 *
 * This module provides functionality to detect the predominant language
 * used in existing code comments and configure AI to generate matching comments.
 */

import type { SupportedLang } from '../i18n'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

export interface CodeLanguageDetectionOptions {
  /** Directory to scan for code files */
  scanDir?: string
  /** Maximum number of files to analyze */
  maxFiles?: number
  /** File extensions to consider */
  extensions?: string[]
  /** Whether to analyze git commit history */
  includeGitHistory?: boolean
}

export interface CodeLanguageDetectionResult {
  /** Detected language ('en', 'zh-CN', or 'mixed') */
  detectedLanguage: SupportedLang | 'mixed'
  /** Confidence score (0-1) */
  confidence: number
  /** Analysis details */
  analysis: {
    filesScanned: number
    commentSamples: {
      language: SupportedLang
      count: number
      examples: string[]
    }[]
    gitHistoryLanguage?: SupportedLang
    reasoning: string
  }
}

/**
 * Default file extensions to scan for code comments
 */
const DEFAULT_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.vue',
  '.svelte',
  '.py',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.go',
  '.rs',
  '.php',
  '.rb',
  '.swift',
  '.kt',
  '.scala',
  '.cs',
  '.dart',
]

/**
 * Chinese character detection regex
 */
const CHINESE_REGEX = /[\u4E00-\u9FFF]/

/**
 * Comment detection patterns for different languages
 */
const COMMENT_PATTERNS = [
  // Single line comments
  /\/\/.*$/gm,
  /#.*$/gm,
  /--.*$/gm,
  /'.*$/gm,
  /--\[\[.*?\]\]/gs,
  // Multi-line comments
  /\/\*[\s\S]*?\*\//g,
  /\[\[ [\s\S]*? \]\]/g,
  /<!--[\s\S]*?-->/g,
  /"""[\s\S]*?"""/g,
  /'''[\s\S]*?'''/g,
]

/**
 * Detect if a text contains Chinese characters
 */
function containsChinese(text: string): boolean {
  return CHINESE_REGEX.test(text)
}

/**
 * Detect the primary language of a comment text
 */
function detectCommentLanguage(comment: string): SupportedLang {
  const trimmed = comment.trim()
  if (!trimmed || trimmed.length < 2) {
    return 'en' // Default to English for very short comments
  }

  // Count Chinese vs non-Chinese characters (excluding punctuation)
  const chineseChars = (trimmed.match(CHINESE_REGEX) || []).length
  const totalChars = trimmed.replace(/[^\w\u4E00-\u9FFF]/g, '').length

  if (totalChars === 0) {
    return 'en' // Default for comments with only punctuation
  }

  const chineseRatio = chineseChars / totalChars

  // If more than 30% of characters are Chinese, consider it Chinese
  return chineseRatio > 0.3 ? 'zh-CN' : 'en'
}

/**
 * Extract comments from source code content
 */
function extractComments(content: string): string[] {
  const comments: string[] = []

  for (const pattern of COMMENT_PATTERNS) {
    const matches = content.match(pattern)
    if (matches) {
      comments.push(...matches)
    }
  }

  return comments
}

/**
 * Analyze git commit history for language patterns
 */
function analyzeGitHistory(dir: string): SupportedLang | null {
  try {
    if (!existsSync(join(dir, '.git'))) {
      return null
    }

    // Get recent commit messages
    const commitMessages = execSync('git log -n 50 --pretty=%s', {
      cwd: dir,
      encoding: 'utf8',
    }).split('\n').filter(Boolean)

    if (commitMessages.length === 0) {
      return null
    }

    let chineseCount = 0
    const samples: { lang: SupportedLang, msg: string }[] = []

    for (const msg of commitMessages.slice(0, 20)) { // Analyze last 20 commits
      const lang = containsChinese(msg) ? 'zh-CN' : 'en'
      if (lang === 'zh-CN')
        chineseCount++

      if (samples.length < 5) {
        samples.push({ lang, msg })
      }
    }

    const chineseRatio = chineseCount / Math.min(commitMessages.length, 20)

    console.log(`Git history analysis: ${chineseCount}/${Math.min(commitMessages.length, 20)} commits are Chinese`)
    samples.forEach(({ lang, msg }) => {
      console.log(`  ${lang}: ${msg.substring(0, 50)}...`)
    })

    return chineseRatio > 0.5 ? 'zh-CN' : 'en'
  }
  catch (error) {
    console.warn('Failed to analyze git history:', error)
    return null
  }
}

/**
 * Recursively find code files in directory
 */
function findCodeFiles(dir: string, extensions: string[], maxFiles: number): string[] {
  const files: string[] = []

  function scanDirectory(currentDir: string, depth = 0): void {
    if (depth > 5 || files.length >= maxFiles)
      return // Limit depth and total files

    try {
      const entries = readdirSync(currentDir)

      for (const entry of entries) {
        if (files.length >= maxFiles)
          break

        const fullPath = join(currentDir, entry)
        const statResult = statSync(fullPath)

        if (statResult.isDirectory()) {
          // Skip common directories that are unlikely to contain source code
          if (!['node_modules', '.git', 'dist', 'build', 'target', '__pycache__', '.next', '.nuxt'].includes(entry)) {
            scanDirectory(fullPath, depth + 1)
          }
        }
        else if (statResult.isFile()) {
          const ext = entry.toLowerCase().substring(entry.lastIndexOf('.'))
          if (extensions.includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    }
    catch {
      // Skip directories that can't be read
    }
  }

  scanDirectory(dir)
  return files
}

/**
 * Detect the predominant code comment language in a project
 */
export function detectCodeCommentLanguage(
  dir: string = process.cwd(),
  options: CodeLanguageDetectionOptions = {},
): CodeLanguageDetectionResult {
  const {
    maxFiles = 50,
    extensions = DEFAULT_EXTENSIONS,
    includeGitHistory = true,
  } = options

  console.log('Starting code comment language detection...')

  const files = findCodeFiles(dir, extensions, maxFiles)
  const commentSamples: { language: SupportedLang, count: number, examples: string[] }[] = [
    { language: 'en', count: 0, examples: [] },
    { language: 'zh-CN', count: 0, examples: [] },
  ]

  let totalComments = 0

  // Analyze comments in source files
  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf8')
      const comments = extractComments(content)

      for (const comment of comments) {
        const lang = detectCommentLanguage(comment)
        const sample = commentSamples.find(s => s.language === lang)

        if (sample) {
          sample.count++
          totalComments++

          // Keep up to 3 examples per language
          if (sample.examples.length < 3 && comment.trim().length > 10) {
            sample.examples.push(comment.trim().substring(0, 100))
          }
        }
      }
    }
    catch {
      // Skip files that can't be read
    }
  }

  // Analyze git history if requested
  let gitHistoryLanguage: SupportedLang | undefined
  if (includeGitHistory) {
    gitHistoryLanguage = analyzeGitHistory(dir) || undefined
  }

  // Determine predominant language
  const englishCount = commentSamples.find(s => s.language === 'en')?.count || 0
  const chineseCount = commentSamples.find(s => s.language === 'zh-CN')?.count || 0

  let detectedLanguage: SupportedLang | 'mixed'
  let confidence: number
  let reasoning: string

  if (totalComments === 0) {
    // No comments found, rely on git history or default to English
    if (gitHistoryLanguage) {
      detectedLanguage = gitHistoryLanguage
      confidence = 0.6
      reasoning = `No code comments found, using git commit history language (${gitHistoryLanguage})`
    }
    else {
      detectedLanguage = 'en'
      confidence = 0.3
      reasoning = 'No code comments or git history found, defaulting to English'
    }
  }
  else if (Math.max(englishCount, chineseCount) / totalComments > 0.7) {
    // Clear majority
    detectedLanguage = englishCount > chineseCount ? 'en' : 'zh-CN'
    confidence = Math.max(englishCount, chineseCount) / totalComments
    reasoning = `Strong majority of comments are ${detectedLanguage} (${Math.max(englishCount, chineseCount)}/${totalComments})`
  }
  else {
    // Mixed or unclear
    detectedLanguage = 'mixed'
    confidence = 0.5
    reasoning = `Mixed comment languages found (EN: ${englishCount}, ZH-CN: ${chineseCount})`

    // If git history shows clear preference, use that
    if (gitHistoryLanguage && ((gitHistoryLanguage === 'en' && englishCount > chineseCount)
      || (gitHistoryLanguage === 'zh-CN' && chineseCount > englishCount))) {
      detectedLanguage = gitHistoryLanguage
      confidence = 0.6
      reasoning += `, leaning towards git history preference (${gitHistoryLanguage})`
    }
  }

  const result: CodeLanguageDetectionResult = {
    detectedLanguage: detectedLanguage === 'mixed' ? 'en' : detectedLanguage,
    confidence,
    analysis: {
      filesScanned: files.length,
      commentSamples,
      gitHistoryLanguage,
      reasoning,
    },
  }

  console.log('Code comment language detection complete:')
  console.log(`  Files scanned: ${result.analysis.filesScanned}`)
  console.log(`  Total comments analyzed: ${totalComments}`)
  console.log(`  English comments: ${englishCount}`)
  console.log(`  Chinese comments: ${chineseCount}`)
  console.log(`  Git history language: ${gitHistoryLanguage || 'N/A'}`)
  console.log(`  Detected language: ${result.detectedLanguage} (confidence: ${Math.round(confidence * 100)}%)`)
  console.log(`  Reasoning: ${reasoning}`)

  return result
}

/**
 * Get appropriate comment language instruction for AI prompts
 */
export function getCommentLanguageInstruction(detectedLanguage: SupportedLang | 'mixed'): string {
  if (detectedLanguage === 'zh-CN') {
    return `IMPORTANT: Write all code comments and documentation in Chinese (中文) to match the existing codebase language.`
  }
  else if (detectedLanguage === 'mixed') {
    return `IMPORTANT: Write code comments in English to maintain consistency with international coding standards, unless the specific file or module already uses Chinese comments.`
  }
  else {
    return `IMPORTANT: Write all code comments and documentation in English to match the existing codebase language.`
  }
}
