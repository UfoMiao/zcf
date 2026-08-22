import type { CodeToolType } from './definitions'
import type { CodeToolAdapter, CodeToolCapability } from './types'
import { i18n } from '../i18n'

export class CodeToolRegistry {
  private readonly adapterById = new Map<CodeToolType, CodeToolAdapter>()
  private readonly adapterByKey = new Map<string, CodeToolAdapter>()

  register(adapter: CodeToolAdapter): void {
    const id = this.normalize(adapter.definition.id)
    const keys = new Set([id, ...adapter.definition.aliases.map(alias => this.normalize(alias))])

    if (keys.size !== adapter.definition.aliases.length + 1)
      throw new Error(i18n.t('errors:duplicateCodeToolAlias', { id: adapter.definition.id }))

    for (const key of keys) {
      if (this.adapterByKey.has(key))
        throw new Error(i18n.t('errors:codeToolKeyAlreadyRegistered', { key }))
    }

    if (this.adapterById.has(adapter.definition.id))
      throw new Error(i18n.t('errors:codeToolAlreadyRegistered', { id: adapter.definition.id }))

    this.adapterById.set(adapter.definition.id, adapter)
    for (const key of keys)
      this.adapterByKey.set(key, adapter)
  }

  resolve(idOrAlias: string): CodeToolAdapter | undefined {
    return this.adapterByKey.get(this.normalize(idOrAlias))
  }

  get(idOrAlias: string): CodeToolAdapter {
    const adapter = this.resolve(idOrAlias)
    if (!adapter)
      throw new Error(i18n.t('errors:unknownCodeTool', { value: idOrAlias }))
    return adapter
  }

  list(): CodeToolAdapter[] {
    return [...this.adapterById.values()]
  }

  listIds(): CodeToolType[] {
    return [...this.adapterById.keys()]
  }

  has(idOrAlias: string): boolean {
    return this.resolve(idOrAlias) !== undefined
  }

  supports(idOrAlias: string, capability: CodeToolCapability): boolean {
    const adapter = this.resolve(idOrAlias)
    if (!adapter)
      return false

    switch (capability) {
      case 'init':
      case 'update':
      case 'uninstall':
        return typeof adapter[capability] === 'function'
      case 'backup':
        return adapter.backup !== undefined
      case 'configurations':
        return adapter.configurations !== undefined
      case 'providers':
        return adapter.providers !== undefined
      case 'tool-update':
        return adapter.updateTools !== undefined
      case 'menu':
        return adapter.menu !== undefined
    }
  }

  async detectInstalled(): Promise<CodeToolAdapter[]> {
    const results = await Promise.all(this.list().map(async (adapter) => {
      try {
        return await adapter.detectInstalled() ? adapter : null
      }
      catch {
        return null
      }
    }))
    return results.filter((adapter): adapter is CodeToolAdapter => adapter !== null)
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase()
  }
}
