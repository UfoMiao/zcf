#!/usr/bin/env tsx

import type { Buffer } from 'node:buffer'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'
/**
 * Cross-platform ESLint hook for Claude Code
 * Reads tool input from stdin and runs ESLint fix on the edited file
 */

// TypeScript interfaces for type safety
interface ToolInput {
  file_path?: string
  [key: string]: unknown
}

interface HookData {
  tool_input?: ToolInput
  file_path?: string
  [key: string]: unknown
}

// Debug mode - set DEBUG_ESLINT_HOOK=1 to enable logging
const DEBUG = process.env.DEBUG_ESLINT_HOOK === '1'
function log(msg: string): void {
  if (DEBUG) {
    console.error(`[eslint-hook] ${msg}`)
  }
}

// Read from stdin with optimized handling
let inputData = ''
let processCompleted = false

function cleanup(): void {
  if (!processCompleted) {
    processCompleted = true
    process.exit(0)
  }
}

function processInput(): void {
  if (processCompleted)
    return

  try {
    // Parse JSON input with type assertion
    const data = JSON.parse(inputData) as HookData
    log(`Received data: ${JSON.stringify(data)}`)

    // Extract file path from tool_input
    const filePath = data.tool_input?.file_path ?? data.file_path

    if (!filePath) {
      log('No file path found in input')
      cleanup()
      return
    }

    // Verify file exists (optional check)
    if (!existsSync(filePath)) {
      log(`File does not exist: ${filePath}`)
      cleanup()
      return
    }

    // Get project root
    const projectRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim()

    log(`Project root: ${projectRoot}`)
    log(`Processing file: ${filePath}`)

    // Run ESLint fix
    // The eslint.hook.config.ts will handle which files to process/ignore
    try {
      execSync(
        `pnpm eslint --rule "unused-imports/no-unused-imports: off" --rule "unused-imports/no-unused-vars: warn" --fix "${filePath}"`,
        {
          cwd: projectRoot,
          stdio: DEBUG ? 'inherit' : 'ignore',
        },
      )
      log('ESLint completed successfully')
    }
    catch (eslintError) {
      // ESLint might exit with non-zero for various reasons
      // We ignore errors to not disrupt the editing flow
      if (eslintError instanceof Error) {
        log(`ESLint error (ignored): ${eslintError.message}`)
      }
    }
  }
  catch (error) {
    // Silently ignore all errors to avoid disrupting Claude Code
    // Common errors: JSON parse error, git not found, etc.
    if (error instanceof Error) {
      log(`General error (ignored): ${error.message}`)
    }
  }

  cleanup()
}

// Set up stdin handling
process.stdin.on('data', (chunk: Buffer) => {
  inputData += chunk.toString()
})

process.stdin.on('end', processInput)

// Safety timeout - only needed if stdin doesn't close properly
// In normal operation, 'end' event will fire immediately when Claude Code finishes sending data
// This is just a fallback to prevent hanging if something goes wrong
const SAFETY_TIMEOUT = 1000 // 1 second is plenty for a safety net
setTimeout(() => {
  log('Safety timeout reached, exiting')
  cleanup()
}, SAFETY_TIMEOUT)
