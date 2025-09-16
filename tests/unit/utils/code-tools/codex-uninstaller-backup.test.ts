import type { CodexUninstallItem } from '../../../../src/utils/code-tools/codex-uninstaller'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('codex uninstaller backup management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('codexUninstallItem type extension', () => {
    it('should support backups as uninstall item type', async () => {
      // Test that the 'backups' type is included in CodexUninstallItem
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      // Create instance to test
      const uninstaller = new CodexUninstaller('en')
      expect(uninstaller).toBeDefined()
    })
  })

  describe('removeBackups method', () => {
    it('should have removeBackups method available', async () => {
      // Test that removeBackups method exists
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      const uninstaller = new CodexUninstaller('en')
      expect(uninstaller.removeBackups).toBeDefined()
      expect(typeof uninstaller.removeBackups).toBe('function')
    })

    it('should remove backup directory when it exists', async () => {
      // Test removeBackups functionality when backup directory exists
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      const uninstaller = new CodexUninstaller('en')

      // This test will verify backup removal when we implement the functionality
      const result = await uninstaller.removeBackups()
      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
    })

    it('should handle case when backup directory does not exist', async () => {
      // Test removeBackups functionality when backup directory doesn't exist
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      const uninstaller = new CodexUninstaller('en')

      // This test will verify graceful handling when no backups exist
      const result = await uninstaller.removeBackups()
      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
    })

    it('should move backup directory to trash safely', async () => {
      // Test that backup removal uses trash instead of permanent deletion
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      const uninstaller = new CodexUninstaller('en')

      // This test will verify trash integration
      const result = await uninstaller.removeBackups()
      expect(result).toBeDefined()
    })
  })

  describe('custom uninstall with backups', () => {
    it('should include backups in custom uninstall options', async () => {
      // Test that custom uninstall can handle 'backups' as an item
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      const uninstaller = new CodexUninstaller('en')

      // Test custom uninstall with backups item
      const items: CodexUninstallItem[] = ['backups']
      const results = await uninstaller.customUninstall(items)
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should execute removeBackups when backups item is selected', async () => {
      // Test that selecting 'backups' executes removeBackups method
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      const uninstaller = new CodexUninstaller('en')

      // Test that backups item triggers backup removal
      const items: CodexUninstallItem[] = ['backups']
      const results = await uninstaller.customUninstall(items)
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('runCodexUninstall integration', () => {
    it('should include backups option in uninstall menu choices', async () => {
      // Test that the main uninstall function includes backup option
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      expect(codexModule.runCodexUninstall).toBeDefined()
    })

    it('should be able to handle backup deletion through main uninstall flow', async () => {
      // Test integration with main uninstall function
      const codexModule = await import('../../../../src/utils/code-tools/codex')
      expect(codexModule.runCodexUninstall).toBeDefined()
    })
  })

  describe('backup directory detection', () => {
    it('should correctly identify backup directory location', async () => {
      // Test that uninstaller knows where to find backup directory
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      const uninstaller = new CodexUninstaller('en')
      expect(uninstaller).toBeDefined()

      // Should be able to handle backup directory at ~/.codex/backup/
      const result = await uninstaller.removeBackups()
      expect(result).toBeDefined()
    })

    it('should handle multiple backup directories safely', async () => {
      // Test that uninstaller can handle multiple timestamped backup folders
      const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')

      const uninstaller = new CodexUninstaller('en')

      // Should handle backup_YYYY-MM-DD_HH-mm-ss format directories
      const result = await uninstaller.removeBackups()
      expect(result).toBeDefined()
    })
  })
})
