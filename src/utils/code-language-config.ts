/**
 * Code Comment Language Configuration Module
 *
 * This module provides functionality to manage code comment language settings,
 * including auto-detection and configuration persistence.
 */

import type { SupportedLang } from '../constants'
import type { GeneralConfig } from '../types/toml-config'
import process from 'node:process'
import { detectCodeCommentLanguage, getCommentLanguageInstruction } from './code-language-detector'

export interface CodeCommentLanguageConfig {
  /** Language for code comments ('en', 'zh-CN', or 'auto') */
  language: SupportedLang | 'auto'
  /** Last detected language (when language is 'auto') */
  detectedLanguage?: SupportedLang
  /** Detection timestamp */
  lastDetected?: string
  /** Confidence score from detection */
  detectionConfidence?: number
}

export interface CodeCommentLanguageResult {
  /** Final language to use for comments */
  finalLanguage: SupportedLang
  /** Whether auto-detection was used */
  autoDetected: boolean
  /** Instruction for AI prompts */
  instruction: string
  /** Detection details (if auto-detected) */
  detection?: {
    language: SupportedLang
    confidence: number
    reasoning: string
  }
}

/**
 * Get the effective code comment language based on configuration
 */
export function getEffectiveCodeCommentLanguage(
  config: GeneralConfig | undefined,
  projectPath: string = process.cwd(),
): CodeCommentLanguageResult {
  const configLanguage = config?.codeCommentLang || 'auto'

  if (configLanguage !== 'auto') {
    // Manual language setting
    return {
      finalLanguage: configLanguage,
      autoDetected: false,
      instruction: getCommentLanguageInstruction(configLanguage),
    }
  }

  // Auto-detection required
  console.log('Auto-detecting code comment language...')

  try {
    const detection = detectCodeCommentLanguage(projectPath, {
      maxFiles: 30,
      includeGitHistory: true,
    })

    const finalLanguage = detection.detectedLanguage === 'mixed' ? 'en' : detection.detectedLanguage

    return {
      finalLanguage,
      autoDetected: true,
      instruction: getCommentLanguageInstruction(detection.detectedLanguage),
      detection: {
        language: finalLanguage,
        confidence: detection.confidence,
        reasoning: detection.analysis.reasoning,
      },
    }
  }
  catch (error) {
    console.warn('Failed to auto-detect code comment language:', error)

    // Fallback to English
    return {
      finalLanguage: 'en',
      autoDetected: false,
      instruction: getCommentLanguageInstruction('en'),
    }
  }
}

/**
 * Update configuration with detected code comment language
 */
export function updateCodeCommentLanguageConfig(
  config: GeneralConfig,
  projectPath: string = process.cwd(),
  forceUpdate: boolean = false,
): GeneralConfig {
  const currentConfig = config.codeCommentLang || 'auto'

  // Only update if currently set to auto, or if forced
  if (currentConfig !== 'auto' && !forceUpdate) {
    return config
  }

  try {
    const detection = detectCodeCommentLanguage(projectPath, {
      maxFiles: 30,
      includeGitHistory: true,
    })

    // Only update if confidence is reasonable (> 0.5)
    if (detection.confidence > 0.5) {
      console.log(`Detected code comment language: ${detection.detectedLanguage} (confidence: ${Math.round(detection.confidence * 100)}%)`)

      // Keep as 'auto' but store the detected result for reference
      return {
        ...config,
        codeCommentLang: 'auto',
      }
    }
    else {
      console.log(`Low confidence detection (${Math.round(detection.confidence * 100)}%), keeping current setting`)
      return config
    }
  }
  catch (error) {
    console.warn('Failed to detect code comment language, keeping current setting:', error)
    return config
  }
}

/**
 * Generate a prompt section for code comment language instruction
 */
export function generateCodeCommentLanguagePrompt(
  config: GeneralConfig | undefined,
  projectPath?: string,
): string {
  const result = getEffectiveCodeCommentLanguage(config, projectPath)

  let prompt = '\n## Code Comment Language Requirements\n\n'

  if (result.autoDetected && result.detection) {
    prompt += `**Auto-detected code comment language:** ${result.detection.language} `
    prompt += `(confidence: ${Math.round(result.detection.confidence * 100)}%)\n`
    prompt += `**Reasoning:** ${result.detection.reasoning}\n\n`
  }
  else {
    prompt += `**Configured code comment language:** ${result.finalLanguage}\n\n`
  }

  prompt += `**Instruction:** ${result.instruction}\n`

  return prompt
}
