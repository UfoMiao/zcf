# /bmad-init Command

This command initializes BMad Method in your project.

## When this command is invoked:

1. Check if BMad is already installed by looking for `.bmad-core/install-manifest.yaml`
2. If installed, check version in manifest against latest version
3. If not installed or outdated, execute: `npx bmad-method@latest install -f -d . -i claude-code`
4. Display success message and prompt user to restart Claude Code

## Implementation

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function initBmad() {
  // Check if already installed and get version
  const manifestPath = path.join(process.cwd(), '.bmad-core', 'install-manifest.yaml');
  let needsInstall = true;
  let currentVersion = null;
  
  if (fs.existsSync(manifestPath)) {
    try {
      // Simple version check - just check if file exists
      // Full YAML parsing would require js-yaml package
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const versionMatch = manifestContent.match(/version:\s*(.+)/);
      if (versionMatch) {
        currentVersion = versionMatch[1].trim();
      }
      
      // Get latest version from npm
      const latestVersion = execSync('npm view bmad-method version', { encoding: 'utf8' }).trim();
      
      if (currentVersion === latestVersion) {
        console.log(`✅ BMad Method is up to date (v${currentVersion})`);
        console.log('You can use BMad commands to begin your workflow');
        needsInstall = false;
      } else {
        console.log(`🔄 BMad Method update available: v${currentVersion} → v${latestVersion}`);
      }
    } catch (error) {
      console.log('⚠️  Could not verify BMad version, will reinstall');
    }
  }
  
  if (needsInstall === false) {
    return;
  }
  
  // Install BMad
  console.log('🚀 Installing BMad Method...');
  try {
    execSync('echo -e "1\\n" | npx bmad-method@latest install -f -d . -i claude-code', {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true
    });
    
    console.log('✅ BMad Method installed successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📌 IMPORTANT: Please restart Claude Code to load BMad agents');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📂 Installation Details:');
    console.log('   • All agents and task commands are installed in:');
    console.log('     .claude/commands/BMad/');
    console.log('');
    console.log('🔧 Git Configuration (Optional):');
    console.log('   If you prefer not to commit BMad workflow files, add these to .gitignore:');
    console.log('     • .bmad-core');
    console.log('     • .claude/commands/BMad');
    console.log('     • docs/');
    console.log('');
    console.log('🚀 Getting Started:');
    console.log('   1. Restart Claude Code');
    console.log('   2. For first-time users, run:');
    console.log('      /BMad:agents:bmad-orchestrator *help');
    console.log('      This will start the BMad workflow guidance system');
    console.log('');
    console.log('💡 Tip: The BMad Orchestrator will help you choose the right workflow');
    console.log('       and guide you through the entire development process.');
    
  } catch (error) {
    console.error('❌ Failed to install BMad:', error.message);
    process.exit(1);
  }
}

// Execute
initBmad();
```

## Notes

- This command requires npm/npx to be available
- The installation will download the latest BMad Method package
- User must restart Claude Code after installation for agents to load properly
- BMad Method includes its own built-in state tracking system