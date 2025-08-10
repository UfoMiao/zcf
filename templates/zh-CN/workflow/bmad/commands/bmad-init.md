# /bmad-init 命令

此命令在您的项目中初始化 BMad-Method。

## 当调用此命令时：

1. 检查 `.bmad-core/install-manifest.yaml` 文件是否存在，判断 BMad 是否已安装
2. 如果已安装，检查 manifest 中的版本号与最新版本对比
3. 如果未安装或版本过旧，执行：`npx bmad-method@latest install -f -d . -i claude-code`
4. 显示成功消息并提示用户重启 Claude Code

## 实现

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function initBmad() {
  // 检查是否已安装并获取版本
  const manifestPath = path.join(process.cwd(), '.bmad-core', 'install-manifest.yaml');
  let needsInstall = true;
  let currentVersion = null;
  
  if (fs.existsSync(manifestPath)) {
    try {
      // 简单版本检查 - 只检查文件是否存在
      // 完整的 YAML 解析需要 js-yaml 包
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const versionMatch = manifestContent.match(/version:\s*(.+)/);
      if (versionMatch) {
        currentVersion = versionMatch[1].trim();
      }
      
      // 从 npm 获取最新版本
      const latestVersion = execSync('npm view bmad-method version', { encoding: 'utf8' }).trim();
      
      if (currentVersion === latestVersion) {
        console.log(`✅ BMad-Method已是最新版本 (v${currentVersion})`);
        console.log('您可以使用 BMad 命令开始工作流');
        needsInstall = false;
      } else {
        console.log(`🔄 BMad-Method有更新可用：v${currentVersion} → v${latestVersion}`);
      }
    } catch (error) {
      console.log('⚠️  无法验证 BMad 版本，将重新安装');
    }
  }
  
  if (needsInstall === false) {
    return;
  }
  
  // 安装 BMad
  console.log('🚀 正在安装 BMad-Method...');
  try {
    execSync('echo -e "1\\n" | npx bmad-method@latest install -f -d . -i claude-code', {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true
    });
    
    console.log('✅ BMad-Method已成功安装！');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📌 重要提示：请重启 Claude Code 以加载 BMad 扩展');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📂 安装详情：');
    console.log('   • 所有代理和任务命令都已安装在：');
    console.log('     .claude/commands/BMad/ 目录中');
    console.log('');
    console.log('🔧 Git 配置建议（可选）：');
    console.log('   如果您不希望将 BMad 工作流文件提交到 Git，请将以下内容添加到 .gitignore：');
    console.log('     • .bmad-core');
    console.log('     • .claude/commands/BMad');
    console.log('     • docs/');
    console.log('');
    console.log('🚀 快速开始：');
    console.log('   1. 重启 Claude Code');
    console.log('   2. 首次使用推荐运行：');
    console.log('      /BMad:agents:bmad-orchestrator *help');
    console.log('      这将启动 BMad 工作流引导系统');
    console.log('');
    console.log('💡 提示：BMad Orchestrator 将帮助您选择合适的工作流程，');
    console.log('       并引导您完成整个开发过程。');
  } catch (error) {
    console.error('❌ 安装失败：', error.message);
    console.log('请手动运行：npx bmad-method@latest install -f -d . -i claude-code');
  }
}

// 执行初始化
initBmad();
```

## 用法

只需在 Claude Code 中键入：

```
/bmad-init
```

此命令将：

1. 在您的项目中安装 BMad-Method 框架
2. 设置所有必要的配置
3. 提供如何开始使用 BMad 工作流的指导