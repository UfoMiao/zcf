import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies before importing the module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  copyFile: vi.fn(),
}))

vi.mock('node:url', () => ({
  fileURLToPath: vi.fn(),
}))

vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  copyDir: vi.fn(),
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
  readDefaultTomlConfig: vi.fn(),
  updateTomlConfig: vi.fn(),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

// Use real i18n system for better integration testing
vi.mock('../../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
  }
})

vi.mock('../../../../src/utils/prompts', () => ({
  resolveTemplateLanguage: vi.fn(),
  resolveSystemPromptStyle: vi.fn(),
}))

// Declare mock types
let mockFsOperations: any
let mockZcfConfig: any
let mockInquirer: any
let mockPrompts: any
let mockNodeFs: any
let mockNodeUrl: any

/**
 * Test suite for Codex shared templates (common directory usage)
 * This test file covers the refactoring work that consolidated templates
 * from codex-specific directories to shared common directories:
 * - templates/common/output-styles/ (for system prompts)
 * - templates/common/workflow/ (for workflows including git and sixStep)
 */
describe('codex - common templates usage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Initialize mocked modules
    mockFsOperations = vi.mocked(await import('../../../../src/utils/fs-operations'))
    mockZcfConfig = vi.mocked(await import('../../../../src/utils/zcf-config'))
    mockInquirer = vi.mocked(await import('inquirer'))
    mockPrompts = vi.mocked(await import('../../../../src/utils/prompts'))
    mockNodeFs = vi.mocked(await import('node:fs'))
    mockNodeUrl = vi.mocked(await import('node:url'))

    // Setup default mocks
    mockFsOperations.exists.mockReturnValue(true)
    mockFsOperations.readFile.mockReturnValue('Mock file content')
    mockFsOperations.writeFile.mockImplementation(() => {})
    mockFsOperations.ensureDir.mockImplementation(() => {})
    mockFsOperations.copyFile.mockImplementation(() => {})
    mockFsOperations.copyDir.mockImplementation(() => {})

    mockZcfConfig.readZcfConfig.mockReturnValue({
      templateLang: 'zh-CN',
      preferredLang: 'zh-CN',
    })
    mockZcfConfig.updateZcfConfig.mockImplementation(() => {})
    mockZcfConfig.readDefaultTomlConfig.mockReturnValue({})

    mockPrompts.resolveTemplateLanguage.mockResolvedValue('zh-CN')
    mockPrompts.resolveSystemPromptStyle.mockResolvedValue('engineer-professional')

    mockNodeFs.existsSync.mockReturnValue(true)
    mockNodeUrl.fileURLToPath.mockReturnValue('/project/dist/utils/code-tools/codex.js')

    // Initialize real i18n for test environment
    const { initI18n } = await import('../../../../src/i18n')
    await initI18n('zh-CN')
  })

  describe('runCodexSystemPromptSelection - common/output-styles path', () => {
    it('should use templates/common/output-styles/ path for system prompts', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      // Setup mocks
      let capturedReadPath: string | undefined
      mockFsOperations.readFile.mockImplementation((path: string) => {
        capturedReadPath = path
        return 'Mock system prompt content'
      })

      await codex.runCodexSystemPromptSelection()

      // Verify readFile was called with common/output-styles path
      expect(capturedReadPath).toBeDefined()
      expect(capturedReadPath).toMatch(/templates[/\\]common[/\\]output-styles[/\\]zh-CN/)
      // Verify it does NOT use old codex-specific path
      expect(capturedReadPath).not.toMatch(/templates[/\\]codex[/\\]zh-CN[/\\]system-prompt/)
    })

    it('should use templates/common/output-styles/ path with English locale', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      mockZcfConfig.readZcfConfig.mockReturnValue({
        templateLang: 'en',
        preferredLang: 'en',
      })
      mockPrompts.resolveTemplateLanguage.mockResolvedValue('en')

      let capturedReadPath: string | undefined
      mockFsOperations.readFile.mockImplementation((path: string) => {
        capturedReadPath = path
        return 'Mock system prompt content'
      })

      await codex.runCodexSystemPromptSelection()

      // Verify readFile was called with common/output-styles/en path
      expect(capturedReadPath).toBeDefined()
      expect(capturedReadPath).toMatch(/templates[/\\]common[/\\]output-styles[/\\]en/)
      // Verify it does NOT use old codex-specific path
      expect(capturedReadPath).not.toMatch(/templates[/\\]codex[/\\]en[/\\]system-prompt/)
    })

    it('should write to AGENTS.md after reading system prompt', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      let capturedWritePath: string | undefined
      mockFsOperations.writeFile.mockImplementation((path: string) => {
        capturedWritePath = path
      })

      await codex.runCodexSystemPromptSelection()

      // Verify writeFile was called for AGENTS.md
      expect(capturedWritePath).toBeDefined()
      expect(capturedWritePath).toContain('AGENTS.md')
    })
  })

  describe('runCodexWorkflowSelection - common/workflow path', () => {
    it('should use templates/common/workflow/ path for workflows', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      mockInquirer.default.prompt.mockResolvedValue({
        workflows: ['/project/templates/common/workflow/zh-CN/git/git-commit.md'],
      })

      const capturedReadPaths: string[] = []
      mockFsOperations.readFile.mockImplementation((path: string) => {
        capturedReadPaths.push(path)
        return 'Mock workflow content'
      })

      await codex.runCodexWorkflowSelection()

      // Should have read from common/workflow directory
      expect(capturedReadPaths.length).toBeGreaterThan(0)
      const gitWorkflowPath = capturedReadPaths.find(p => p.includes('git'))
      if (gitWorkflowPath) {
        expect(gitWorkflowPath).toMatch(/templates[/\\]common[/\\]workflow/)
        // Verify it does NOT use old codex-specific path
        expect(gitWorkflowPath).not.toMatch(/templates[/\\]codex[/\\]zh-CN[/\\]workflow[/\\]git[/\\]prompts/)
      }
    })

    it('should process template variables for sixStep workflow ($CONFIG_DIR -> .codex)', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      // Mock sixStep workflow selection
      mockInquirer.default.prompt.mockResolvedValue({
        workflows: ['/project/templates/common/workflow/zh-CN/sixStep/workflow.md'],
      })

      mockFsOperations.readFile.mockImplementation((path: string) => {
        if (path.includes('sixStep')) {
          return 'Use $CONFIG_DIR for config. Path: $CONFIG_DIR/file.md'
        }
        return 'Mock content'
      })

      const capturedWriteContent: string[] = []
      mockFsOperations.writeFile.mockImplementation((_path: string, content: string) => {
        capturedWriteContent.push(content)
      })

      await codex.runCodexWorkflowSelection()

      // Verify template variables were replaced
      const sixStepContent = capturedWriteContent.find(c => c.includes('.codex'))
      expect(sixStepContent).toBeDefined()
      expect(sixStepContent).toContain('.codex')
      expect(sixStepContent).not.toContain('$CONFIG_DIR')
      expect(sixStepContent).toBe('Use .codex for config. Path: .codex/file.md')
    })

    it('should ensure prompts directory exists before writing', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      mockInquirer.default.prompt.mockResolvedValue({
        workflows: ['/project/templates/common/workflow/zh-CN/git/git-commit.md'],
      })

      await codex.runCodexWorkflowSelection()

      // Verify ensureDir was called for prompts directory
      expect(mockFsOperations.ensureDir).toHaveBeenCalled()
      const ensureDirCalls = mockFsOperations.ensureDir.mock.calls
      const promptsDirCall = ensureDirCalls.some((call: any) => String(call[0]).includes('prompts'))
      expect(promptsDirCall).toBe(true)
    })
  })

  describe('getAllWorkflowFiles - shared templates detection', () => {
    it('should check for git workflows in common/workflow/git/', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      // Mock git workflow directory exists
      mockFsOperations.exists.mockImplementation((path: string) => {
        return String(path).includes('common/workflow')
      })

      mockInquirer.default.prompt.mockResolvedValue({
        workflows: [],
      })

      await codex.runCodexWorkflowSelection()

      // Verify exists was called to check for git workflows
      const existsCalls = mockFsOperations.exists.mock.calls
      const gitCheckCall = existsCalls.find((call: any) =>
        String(call[0]).includes('workflow') && !String(call[0]).includes('.codex'),
      )

      expect(gitCheckCall).toBeDefined()
    })

    it('should check for sixStep workflow in common/workflow/sixStep/', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      mockFsOperations.exists.mockImplementation((path: string) => {
        return String(path).includes('common/workflow')
      })

      mockInquirer.default.prompt.mockResolvedValue({
        workflows: [],
      })

      await codex.runCodexWorkflowSelection()

      // Verify exists was called to check workflow paths
      const existsCalls = mockFsOperations.exists.mock.calls
      const workflowCheckCall = existsCalls.find((call: any) =>
        String(call[0]).includes('workflow') && !String(call[0]).includes('.codex'),
      )

      expect(workflowCheckCall).toBeDefined()
    })
  })

  describe('getGitPromptFiles - shared git templates', () => {
    it('should read git workflow files from common/workflow/git/', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      mockInquirer.default.prompt.mockResolvedValue({
        workflows: ['__GIT_GROUP_SENTINEL__'], // Special marker for git group
      })

      const capturedReadPaths: string[] = []
      mockFsOperations.readFile.mockImplementation((path: string) => {
        capturedReadPaths.push(path)
        return 'Mock git workflow content'
      })

      await codex.runCodexWorkflowSelection()

      // Verify git workflow files were read from common directory
      const gitFilePaths = capturedReadPaths.filter(p =>
        p.includes('git-commit.md')
        || p.includes('git-rollback.md')
        || p.includes('git-cleanBranches.md')
        || p.includes('git-worktree.md'),
      )

      gitFilePaths.forEach((path) => {
        expect(path).toMatch(/templates[/\\]common[/\\]workflow[/\\]/)
        expect(path).not.toMatch(/templates[/\\]codex[/\\]/)
      })
    })

    it('should handle git workflow selection from common directory', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      // Provide actual git workflow paths instead of sentinel
      mockInquirer.default.prompt.mockResolvedValue({
        workflows: [
          '/project/templates/common/workflow/zh-CN/git/git-commit.md',
          '/project/templates/common/workflow/zh-CN/git/git-rollback.md',
        ],
      })

      const capturedReadPaths: string[] = []
      mockFsOperations.readFile.mockImplementation((path: string) => {
        capturedReadPaths.push(path)
        return 'Mock git workflow content'
      })

      await codex.runCodexWorkflowSelection()

      // Verify git workflow files were read from common directory
      const gitFiles = capturedReadPaths.filter(p =>
        p.includes('common/workflow/') && p.includes('git'),
      )

      expect(gitFiles.length).toBeGreaterThan(0)
      gitFiles.forEach((path) => {
        expect(path).toMatch(/templates[/\\]common[/\\]workflow[/\\]/)
      })
    })
  })

  describe('processTemplateVariables - Codex-specific replacement', () => {
    it('should replace $CONFIG_DIR with .codex (not .claude)', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      mockInquirer.default.prompt.mockResolvedValue({
        workflows: ['/project/templates/common/workflow/zh-CN/sixStep/workflow.md'],
      })

      mockFsOperations.readFile.mockImplementation((path: string) => {
        if (path.includes('sixStep')) {
          return 'Config dir: $CONFIG_DIR\nAnother: $CONFIG_DIR/agents'
        }
        return 'Mock content'
      })

      const capturedContent: string[] = []
      mockFsOperations.writeFile.mockImplementation((_path: string, content: string) => {
        capturedContent.push(content)
      })

      await codex.runCodexWorkflowSelection()

      // Verify all $CONFIG_DIR occurrences were replaced with .codex
      const processedContent = capturedContent.find(c => c.includes('.codex'))
      expect(processedContent).toBeDefined()
      expect(processedContent).toContain('.codex')
      expect(processedContent).not.toContain('.claude')
      expect(processedContent).not.toContain('$CONFIG_DIR')
      expect(processedContent).toBe('Config dir: .codex\nAnother: .codex/agents')
    })

    it('should only process sixStep workflows (not git workflows)', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      mockInquirer.default.prompt.mockResolvedValue({
        workflows: [
          '/project/templates/common/workflow/zh-CN/git/git-commit.md',
          '/project/templates/common/workflow/zh-CN/sixStep/workflow.md',
        ],
      })

      const fileContents: Record<string, string> = {
        'git-commit.md': 'Git content with $CONFIG_DIR',
        'workflow.md': 'SixStep content with $CONFIG_DIR',
      }

      mockFsOperations.readFile.mockImplementation((path: string) => {
        if (path.includes('git-commit')) {
          return fileContents['git-commit.md']
        }
        if (path.includes('workflow.md')) {
          return fileContents['workflow.md']
        }
        return 'Mock content'
      })

      const writeOperations: Array<{ path: string, content: string }> = []
      mockFsOperations.writeFile.mockImplementation((path: string, content: string) => {
        writeOperations.push({ path, content })
      })

      await codex.runCodexWorkflowSelection()

      // Git workflow should NOT have variables replaced
      const gitWrite = writeOperations.find(op => op.path.includes('git-commit'))
      if (gitWrite) {
        expect(gitWrite.content).toBe('Git content with $CONFIG_DIR')
      }

      // SixStep workflow SHOULD have variables replaced
      const sixStepWrite = writeOperations.find(op => op.path.includes('workflow.md'))
      if (sixStepWrite) {
        expect(sixStepWrite.content).toBe('SixStep content with .codex')
      }
    })
  })

  describe('skip-prompt mode compatibility', () => {
    it('should use common templates in skip-prompt mode', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      const capturedPaths: string[] = []
      mockFsOperations.readFile.mockImplementation((path: string) => {
        capturedPaths.push(path)
        return 'Mock content'
      })

      // Skip-prompt mode with workflows
      await codex.runCodexWorkflowSelection({
        workflows: ['Git Workflow'],
      })

      // Should still use common templates
      const commonTemplatePath = capturedPaths.find(p => p.includes('common/workflow'))
      expect(commonTemplatePath).toBeDefined()
    })

    it('should process sixStep variables in skip-prompt mode', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      mockFsOperations.readFile.mockImplementation((path: string) => {
        if (path.includes('sixStep')) {
          return '$CONFIG_DIR placeholder'
        }
        return 'Mock content'
      })

      const capturedContent: string[] = []
      mockFsOperations.writeFile.mockImplementation((_path: string, content: string) => {
        capturedContent.push(content)
      })

      await codex.runCodexWorkflowSelection({
        workflows: ['Six Steps Workflow'],
      })

      const processedContent = capturedContent.find(c => c.includes('.codex'))
      expect(processedContent).toBeDefined()
      expect(processedContent).toBe('.codex placeholder')
    })
  })
})
