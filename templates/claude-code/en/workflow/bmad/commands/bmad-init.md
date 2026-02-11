# /bmad-init Command

This command initializes or updates BMad-Method (V6) in your project.

## When this command is invoked:

1. Check if `_bmad/` directory exists to determine if BMad V6 is already installed
2. Check for legacy V4 installations (`.bmad-core` or `.bmad-method` directories)
3. Fresh install executes: `npx bmad-method install --directory . --modules bmm --tools claude-code --communication-language English --document-output-language English --yes`
4. Existing install executes: `npx bmad-method install --directory . --action quick-update --yes`
5. Fix installer bug: rename `{output_folder}` to `_bmad-output` (Beta known issue)
6. Automatically update `.gitignore` (remove V4 entries, add V6 entries)
7. Display installation results and prompt user for next steps

## Implementation

```javascript
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

// Legacy entries to clean from .gitignore
const LEGACY_GITIGNORE_ENTRIES = [
  '.bmad-core',
  '.bmad-method',
  '.claude/commands/BMad',
  '{output_folder}',  // v6.0.0-Beta.8 bug artifact
]

// V6 .gitignore entries
const V6_GITIGNORE_ENTRIES = [
  '_bmad/',
  '_bmad-output/',
]

// Fix installer bug: {output_folder} not resolved to _bmad-output (v6.0.0-Beta.8)
function fixOutputFolderBug(cwd) {
  const buggyPath = path.join(cwd, '{output_folder}')
  const correctPath = path.join(cwd, '_bmad-output')

  if (!fs.existsSync(buggyPath)) return false

  if (!fs.existsSync(correctPath)) {
    // _bmad-output doesn't exist, simply rename
    fs.renameSync(buggyPath, correctPath)
    console.log('   ✅ {output_folder} → _bmad-output/ (renamed)')
  } else {
    // _bmad-output already exists, merge subdirectories then delete
    const entries = fs.readdirSync(buggyPath, { withFileTypes: true })
    for (const entry of entries) {
      const src = path.join(buggyPath, entry.name)
      const dest = path.join(correctPath, entry.name)
      if (!fs.existsSync(dest)) {
        fs.renameSync(src, dest)
        console.log(`   ✅ Moved ${entry.name} → _bmad-output/`)
      }
    }
    fs.rmSync(buggyPath, { recursive: true, force: true })
    console.log('   ✅ Removed redundant {output_folder}/')
  }
  return true
}

function updateGitignore(cwd) {
  const gitignorePath = path.join(cwd, '.gitignore')
  let content = ''
  let exists = false

  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8')
    exists = true
  }

  const lines = content.split('\n')
  let changed = false

  // Remove V4 legacy entries
  const filtered = lines.filter(line => {
    const trimmed = line.trim()
    const isLegacy = LEGACY_GITIGNORE_ENTRIES.some(entry =>
      trimmed === entry || trimmed === entry + '/' || trimmed === '/' + entry
    )
    if (isLegacy) {
      console.log(`   🗑️  Removing legacy entry: ${trimmed}`)
      changed = true
    }
    return !isLegacy
  })

  // Add V6 entries
  const newEntries = []
  for (const entry of V6_GITIGNORE_ENTRIES) {
    const entryBase = entry.replace(/\/$/, '')
    const alreadyExists = filtered.some(line => {
      const trimmed = line.trim()
      return trimmed === entry || trimmed === entryBase || trimmed === '/' + entryBase
    })
    if (!alreadyExists) {
      newEntries.push(entry)
      console.log(`   ✅ Adding new entry: ${entry}`)
      changed = true
    }
  }

  if (!changed) {
    console.log('   ℹ️  .gitignore is up to date, no changes needed')
    return
  }

  // Build new content
  let result = filtered.join('\n')

  if (newEntries.length > 0) {
    // Ensure trailing newline, then add BMad section
    if (result.length > 0 && !result.endsWith('\n')) {
      result += '\n'
    }
    result += '\n# BMad Method V6\n'
    result += newEntries.join('\n') + '\n'
  }

  fs.writeFileSync(gitignorePath, result, 'utf8')
  console.log(`   📝 .gitignore ${exists ? 'updated' : 'created'}`)
}

async function initBmad() {
  const cwd = process.cwd()
  const bmadV6Path = path.join(cwd, '_bmad')
  const legacyCorePath = path.join(cwd, '.bmad-core')
  const legacyMethodPath = path.join(cwd, '.bmad-method')

  // Check for legacy V4 installation
  const hasLegacyCore = fs.existsSync(legacyCorePath)
  const hasLegacyMethod = fs.existsSync(legacyMethodPath)

  if (hasLegacyCore || hasLegacyMethod) {
    console.log('⚠️  Legacy BMad V4 installation detected:')
    if (hasLegacyCore) console.log('   • .bmad-core/ (V4 core directory)')
    if (hasLegacyMethod) console.log('   • .bmad-method/ (V4 method directory)')
    console.log('')
    console.log('📌 The V6 installer will handle legacy migration automatically. Follow the prompts during installation.')
    console.log('   Details: https://bmad-code-org.github.io/BMAD-METHOD/docs/how-to/upgrade-to-v6')
    console.log('')
  }

  // Check if V6 is already installed
  const hasV6 = fs.existsSync(bmadV6Path)

  // Build non-interactive install command
  let installCmd
  if (hasV6) {
    console.log('🔄 Existing BMad V6 installation detected, performing quick update...')
    console.log('')
    installCmd = [
      'npx bmad-method install',
      '--directory .',
      '--action quick-update',
      '--yes',
    ].join(' ')
  } else {
    console.log('🚀 Initializing BMad-Method V6...')
    console.log('')
    installCmd = [
      'npx bmad-method install',
      '--directory .',
      '--modules bmm',
      '--tools claude-code',
      '--communication-language English',
      '--document-output-language English',
      '--yes',
    ].join(' ')
  }

  // Execute installation
  try {
    console.log(`📋 Executing: ${installCmd}`)
    console.log('')
    execSync(installCmd, {
      stdio: 'inherit',
      cwd: cwd,
      shell: true
    })

    console.log('')
    console.log('✅ BMad-Method V6 installation/update complete!')
    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('📌 IMPORTANT: Please restart your AI IDE to load BMad extensions')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('')
    // Fix {output_folder} bug (v6.0.0-Beta.8)
    console.log('🔧 Checking for known installer issues...')
    try {
      const fixed = fixOutputFolderBug(cwd)
      if (!fixed) console.log('   ℹ️  No fixes needed')
    } catch (err) {
      console.log(`   ⚠️  Failed to fix {output_folder}: ${err.message}`)
      console.log('   Please manually rename {output_folder}/ to _bmad-output/')
    }
    console.log('')

    console.log('📂 V6 Directory Structure:')
    console.log('   • _bmad/          — agents, workflows, tasks, and configuration')
    console.log('   • _bmad-output/   — generated artifact output directory')
    console.log('')

    // Automatically update .gitignore
    console.log('🔧 Updating .gitignore...')
    try {
      updateGitignore(cwd)
    } catch (err) {
      console.log('   ⚠️  Failed to automatically update .gitignore, please manually add _bmad/ and _bmad-output/')
    }
    console.log('')
    console.log('🚀 Quick Start:')
    console.log('   1. Restart your AI IDE')
    console.log('   2. Run /bmad-help for guidance and next step suggestions')
    console.log('   3. Type /bmad and use autocomplete to browse available commands')
    console.log('')
    console.log('💡 Common Workflows:')
    console.log('   • /bmad-help                      — Interactive help')
    console.log('   • /bmad-bmm-create-prd             — Create Product Requirements Document')
    console.log('   • /bmad-bmm-create-architecture     — Create Architecture Document')
    console.log('   • /bmad-bmm-create-epics-and-stories — Create Epics and User Stories')
    console.log('   • /bmad-bmm-sprint-planning         — Initialize Sprint Planning')
    console.log('   • /bmad-bmm-dev-story               — Implement User Story')

    // Legacy V4 IDE command cleanup reminder
    const legacyClaudeAgents = path.join(cwd, '.claude', 'commands', 'BMad', 'agents')
    const legacyClaudeTasks = path.join(cwd, '.claude', 'commands', 'BMad', 'tasks')
    if (fs.existsSync(legacyClaudeAgents) || fs.existsSync(legacyClaudeTasks)) {
      console.log('')
      console.log('⚠️  Legacy V4 IDE commands detected, consider removing manually:')
      if (fs.existsSync(legacyClaudeAgents)) console.log('   • .claude/commands/BMad/agents/')
      if (fs.existsSync(legacyClaudeTasks)) console.log('   • .claude/commands/BMad/tasks/')
      console.log('   New V6 commands are installed under .claude/commands/bmad/')
    }
  }
  catch (error) {
    console.error('❌ Installation failed:', error.message)
    console.log('')
    console.log('🛠️  Manual Installation Guide:')
    console.log('   1. Ensure Node.js 20+ is installed')
    console.log('   2. Non-interactive install:')
    console.log('      npx bmad-method install --directory . --modules bmm --tools claude-code --communication-language English --document-output-language English --yes')
    console.log('   3. Quick update existing installation:')
    console.log('      npx bmad-method install --directory . --action quick-update --yes')
    console.log('   4. Or interactive install:')
    console.log('      npx bmad-method install')
    console.log('')
    console.log('📖 Documentation:')
    console.log('   https://bmad-code-org.github.io/BMAD-METHOD/docs/how-to/install-bmad')
  }
}

// Execute initialization
initBmad()
```

## Usage

Simply type in Claude Code:

```
/bmad-init
```

This command will:

1. Detect current installation status (V6 / V4 legacy / not installed)
2. Fresh install: non-interactively execute `npx bmad-method install --directory . --modules bmm --tools claude-code --communication-language English --document-output-language English --yes`
3. Existing install: execute `npx bmad-method install --directory . --action quick-update --yes`
4. Fix `{output_folder}` → `_bmad-output` installer bug
5. Automatically update `.gitignore` (clean up legacy entries, add V6 entries)
6. Provide next step suggestions
