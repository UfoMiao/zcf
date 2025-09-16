# /bmad-init Command

This command initializes BMad Method in your project.

## When this command is invoked:

1. Check if BMad is already installed by looking for `.bmad-core/install-manifest.yaml`
2. If installed, check version in manifest against latest version
3. If not installed or outdated, execute: `npx bmad-method@latest install -f -d . -i claude-code`
4. Display success message and prompt user to restart Claude Code

## Implementation

```javascript
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

// Check if expect tool is available
function checkExpectAvailability() {
  try {
    execSync('which expect', { stdio: 'ignore' })
    return true
  } catch (error) {
    return false
  }
}

// Use expect to automate interactive installation
function installWithExpect() {
  const expectScript = `
    spawn npx bmad-method@latest install -f -d . -i claude-code
    expect "What would you like to do?"
    send "1\\r"
    expect "How would you like to proceed?"
    send "1\\r"
    expect eof
  `
  
  execSync(`expect -c '${expectScript}'`, {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true
  })
}

// Fallback installation method
function fallbackInstallation() {
  console.log('⚠️  expect tool not found, using interactive installation')
  console.log('Please follow the installation prompts and select:')
  console.log('  1. Choose "Upgrade BMad core" when prompted')
  console.log('  2. Choose "Backup and overwrite modified files" when prompted')
  console.log('')
  
  execSync('npx bmad-method@latest install -f -d . -i claude-code', {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true
  })
}

async function initBmad() {
  // Check if already installed and get version
  const manifestPath = path.join(process.cwd(), '.bmad-core', 'install-manifest.yaml')
  let needsInstall = true
  let currentVersion = null

  if (fs.existsSync(manifestPath)) {
    try {
      // Simple version check - just check if file exists
      // Full YAML parsing would require js-yaml package
      const manifestContent = fs.readFileSync(manifestPath, 'utf8')
      const versionMatch = manifestContent.match(/version:\s*(.+)/)
      if (versionMatch) {
        currentVersion = versionMatch[1].trim()
      }

      // Get latest version from npm
      const latestVersion = execSync('npm view bmad-method version', { encoding: 'utf8' }).trim()

      if (currentVersion === latestVersion) {
        console.log(`✅ BMad Method is up to date (v${currentVersion})`)
        console.log('You can use BMad commands to begin your workflow')
        needsInstall = false
      }
      else {
        console.log(`🔄 BMad Method update available: v${currentVersion} → v${latestVersion}`)
      }
    }
    catch (error) {
      console.log('⚠️  Could not verify BMad version, will reinstall')
    }
  }

  if (needsInstall === false) {
    return
  }

  // Install BMad - Using expect-first approach
  console.log('🚀 Installing BMad Method...')
  
  try {
    const hasExpect = checkExpectAvailability()
    
    if (hasExpect) {
      console.log('📋 Using automated installation (expect tool available)')
      installWithExpect()
    } else {
      fallbackInstallation()
    }

    console.log('')
    console.log('✅ BMad Method installed successfully!')
    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('📌 IMPORTANT: Please restart Claude Code to load BMad agents')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('')
    console.log('📂 Installation Details:')
    console.log('   • All agents and task commands are installed in:')
    console.log('     .claude/commands/BMad/')
    console.log('')
    console.log('🔧 Git Configuration (Optional):')
    console.log('   If you prefer not to commit BMad workflow files, add these to .gitignore:')
    console.log('     • .bmad-core')
    console.log('     • .claude/commands/BMad')
    console.log('     • docs/')
    console.log('')
    console.log('🚀 Getting Started:')
    console.log('   1. Restart Claude Code')
    console.log('   2. For first-time users, run:')
    console.log('      /BMad:agents:bmad-orchestrator *help')
    console.log('      This will start the BMad workflow guidance system')
    console.log('')
    console.log('💡 Tip: The BMad Orchestrator will help you choose the right workflow')
    console.log('       and guide you through the entire development process.')
  }
  catch (error) {
    console.error('❌ Installation failed:', error.message)
    console.log('')
    console.log('🛠️  Manual Installation Guide:')
    console.log('Please run the following command and follow the prompts:')
    console.log('  npx bmad-method@latest install -f -d . -i claude-code')
    console.log('')
    console.log('Installation Tips:')
    console.log('  1. When asked "What would you like to do?", choose the first option')
    console.log('  2. When asked "How would you like to proceed?", choose "Backup and overwrite"')
    console.log('')
    console.log('💡 Tip: For automated installation, consider installing expect tool:')
    console.log('  • macOS: brew install expect')
    console.log('  • Ubuntu: sudo apt-get install expect')
    console.log('  • CentOS: sudo yum install expect')
  }
}

// Execute
initBmad()
```

## Notes

- This command requires npm/npx to be available
- The installation will download the latest BMad Method package
- User must restart Claude Code after installation for agents to load properly
- BMad Method includes its own built-in state tracking system
