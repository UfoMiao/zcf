import type { AgentAdapter, AgentConfigFile, ConfigMergeStrategy, SkillPackage } from '../adapters/adapter-interface'
import { dirname, extname, join } from 'pathe'
import { copyFile, ensureDir, exists, isDirectory, isFile, readDir, readFile, writeFile } from '../utils/fs-operations'
import { readJsonConfig, writeJsonConfig } from '../utils/json-config'
import { parseToml, stringifyToml } from '../utils/toml-edit'

export interface RenderResult {
  source: string
  target: string
  strategy: ConfigMergeStrategy
  changed: boolean
}

export interface TemplateEngineOptions {
  /** Overwrite even when content is unchanged */
  force?: boolean
}

/**
 * Template engine for rendering agent configuration files and skill packages.
 *
 * Phase 0-2 (UFO-131) provides the five required strategies plus common-template
 * projection. Deep TOML merging and skill transforms will be hardened in
 * Phase 3-4 (UFO-132).
 */
export class TemplateEngine {
  constructor(private readonly options: TemplateEngineOptions = {}) {}

  /**
   * Render a single source file to a target path using the configured strategy.
   *
   * The caller is responsible for backup; use {@link renderConfigFile} or
   * {@link renderTemplate} for adapter-aware backup.
   */
  async renderFile(source: string, target: string, strategy: ConfigMergeStrategy): Promise<RenderResult> {
    // Skip must avoid any filesystem side effects, including creating the
    // target parent directory.
    if (strategy === 'skip') {
      return { source, target, strategy, changed: false }
    }

    ensureDir(dirname(target))

    switch (strategy) {
      case 'copy':
        return this.renderCopy(source, target)
      case 'overwrite':
        return this.renderOverwrite(source, target)
      case 'merge':
        return this.renderMerge(source, target)
      case 'append':
        return this.renderAppend(source, target)
      default:
        throw new Error(`Unsupported merge strategy: ${strategy}`)
    }
  }

  /**
   * Render an agent configuration file.
   *
   * The adapter's backup hook is invoked before any write when the target
   * already exists, satisfying the "backup before write" acceptance criteria.
   */
  async renderConfigFile(file: AgentConfigFile, adapter: AgentAdapter): Promise<RenderResult> {
    const target = file.path
    await this.backupBeforeWrite(file, adapter)
    return this.renderFile(this.resolveSourcePath(file, adapter), target, file.mergeStrategy)
  }

  /**
   * Render a template source for an agent.
   *
   * The target is resolved from the agent's template directory, and common
   * templates are projected into the agent's private template space before
   * being rendered to the agent's home directory.
   */
  async renderTemplate(source: string, adapter: AgentAdapter, strategy: ConfigMergeStrategy): Promise<RenderResult> {
    const target = this.resolveTemplateDestination(source, adapter)
    const configFile: AgentConfigFile = { id: target, path: target, format: this.inferFormat(target), mergeStrategy: strategy }
    await this.backupBeforeWrite(configFile, adapter)
    return this.renderFile(source, target, strategy)
  }

  /**
   * Project all files from a common template directory into the agent's
   * template directory and render them to the agent home.
   *
   * Returns the rendered results for every non-directory file under commonDir.
   */
  async renderCommon(commonDir: string, adapter: AgentAdapter): Promise<RenderResult[]> {
    const files = this.collectCommonFiles(commonDir)
    const results: RenderResult[] = []

    for (const source of files) {
      const projectedSource = this.projectCommonPath(source, commonDir, adapter.templateDir)
      const target = this.resolveTemplateDestination(projectedSource, adapter)
      const strategy = this.inferStrategy(projectedSource)
      const configFile: AgentConfigFile = { id: target, path: target, format: this.inferFormat(target), mergeStrategy: strategy }
      await this.backupBeforeWrite(configFile, adapter)
      results.push(await this.renderFile(source, target, strategy))
    }

    return results
  }

  /**
   * Render a skill package to its target directory.
   */
  async renderSkill(skill: SkillPackage): Promise<RenderResult> {
    const target = join(skill.targetPath, 'SKILL.md')
    ensureDir(dirname(target))

    const changed = this.writeIfChanged(target, skill.body)
    return {
      source: skill.sourcePath,
      target,
      strategy: 'copy',
      changed: changed || !!this.options.force,
    }
  }

  /**
   * Create a backup of a configuration file before it is written.
   */
  private async backupBeforeWrite(file: AgentConfigFile, adapter: AgentAdapter): Promise<string | null> {
    if (!exists(file.path)) {
      return null
    }
    return await adapter.backup(file)
  }

  /**
   * Resolve the source template path for an agent config file.
   */
  private resolveSourcePath(file: AgentConfigFile, adapter: AgentAdapter): string {
    return join(adapter.templateDir, file.id)
  }

  /**
   * Resolve the final destination for a template source.
   *
   * Common templates are first projected into the agent's template directory,
   * then the agent template prefix is replaced with the agent home directory.
   */
  private resolveTemplateDestination(source: string, adapter: AgentAdapter): string {
    const commonDir = 'templates/common'
    if (source.startsWith(commonDir)) {
      const projected = this.projectCommonPath(source, commonDir, adapter.templateDir)
      return projected.replace(adapter.templateDir, adapter.homeDir)
    }
    return source.replace(adapter.templateDir, adapter.homeDir)
  }

  /**
   * Project a common template path into an agent-specific template path.
   */
  private projectCommonPath(source: string, commonDir: string, agentTemplateDir: string): string {
    const relativePath = source.slice(commonDir.length).replace(/^\/+/, '')
    return join(agentTemplateDir, relativePath)
  }

  /**
   * Recursively collect all files under a common template directory.
   */
  private collectCommonFiles(dir: string): string[] {
    if (!exists(dir)) {
      return []
    }

    const entries = readDir(dir)
    const files: string[] = []

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      if (isDirectory(fullPath)) {
        files.push(...this.collectCommonFiles(fullPath))
      }
      else if (isFile(fullPath)) {
        files.push(fullPath)
      }
    }

    return files
  }

  private inferFormat(path: string): AgentConfigFile['format'] {
    const ext = extname(path).toLowerCase()
    if (ext === '.json')
      return 'json'
    if (ext === '.toml')
      return 'toml'
    if (ext === '.md')
      return 'markdown'
    if (ext === '.yaml' || ext === '.yml')
      return 'yaml'
    return 'markdown'
  }

  private inferStrategy(path: string): ConfigMergeStrategy {
    const ext = extname(path).toLowerCase()
    if (ext === '.json' || ext === '.toml')
      return 'merge'
    if (ext === '.md')
      return 'append'
    return 'copy'
  }

  private renderCopy(source: string, target: string): RenderResult {
    const changed = !exists(target) || readFile(source) !== readFile(target)
    if (changed || this.options.force) {
      copyFile(source, target)
    }
    return { source, target, strategy: 'copy', changed: changed || !!this.options.force }
  }

  private renderOverwrite(source: string, target: string): RenderResult {
    const content = readFile(source)
    const changed = this.writeIfChanged(target, content)
    return { source, target, strategy: 'overwrite', changed: changed || !!this.options.force }
  }

  private renderMerge(source: string, target: string): RenderResult {
    const sourceContent = readFile(source)
    const ext = this.detectExtension(source)

    if (ext === 'json') {
      return this.renderJsonMerge(source, target, sourceContent)
    }

    if (ext === 'toml') {
      return this.renderTomlMerge(source, target, sourceContent)
    }

    throw new Error(`Merge strategy is not supported for file extension: ${ext || 'unknown'}`)
  }

  private renderJsonMerge(source: string, target: string, sourceContent: string): RenderResult {
    const sourceData = JSON.parse(sourceContent) as Record<string, unknown>
    const existing = readJsonConfig<Record<string, unknown>>(target, { defaultValue: {} })
    const merged = { ...(existing || {}), ...sourceData }
    const changed = JSON.stringify(existing) !== JSON.stringify(merged)

    if (changed || this.options.force || !exists(target)) {
      writeJsonConfig(target, merged)
    }

    return { source, target, strategy: 'merge', changed: changed || !!this.options.force }
  }

  private renderTomlMerge(source: string, target: string, sourceContent: string): RenderResult {
    const sourceData = parseToml(sourceContent)
    const existingContent = exists(target) ? readFile(target) : ''
    const existing = existingContent ? parseToml(existingContent) : {}
    const merged = { ...(existing as Record<string, unknown>), ...(sourceData as Record<string, unknown>) }
    const changed = JSON.stringify(existing) !== JSON.stringify(merged)

    if (changed || this.options.force || !exists(target)) {
      writeFile(target, stringifyToml(merged))
    }

    return { source, target, strategy: 'merge', changed: changed || !!this.options.force }
  }

  private renderAppend(source: string, target: string): RenderResult {
    const content = readFile(source)
    const existing = exists(target) ? readFile(target) : ''

    if (existing.includes(content)) {
      return { source, target, strategy: 'append', changed: false }
    }

    const separator = existing.length && !existing.endsWith('\n') ? '\n' : ''
    writeFile(target, `${existing}${separator}${content}`)
    return { source, target, strategy: 'append', changed: true }
  }

  private writeIfChanged(target: string, content: string): boolean {
    if (!exists(target) || readFile(target) !== content) {
      writeFile(target, content)
      return true
    }
    return false
  }

  private detectExtension(path: string): string {
    return path.split('.').pop()?.toLowerCase() || ''
  }
}
