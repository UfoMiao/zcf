# /bmad-init 命令

此命令在您的项目中初始化或更新 BMad-Method (V6)。

## 当调用此命令时：

1. 检查 `_bmad/` 目录是否存在，判断 BMad V6 是否已安装
2. 检查是否存在旧版 V4 安装（`.bmad-core` 或 `.bmad-method` 目录）
3. 新安装执行：`npx bmad-method install --directory . --modules bmm --tools claude-code --communication-language Chinese --document-output-language Chinese --yes`
4. 已安装则执行：`npx bmad-method install --directory . --action quick-update --yes`
5. 修复安装器 bug：将 `{output_folder}` 重命名为 `_bmad-output`（Beta 已知问题）
6. 自动更新 `.gitignore`（移除 V4 条目，添加 V6 条目）
7. 显示安装结果并提示用户后续操作

## 实现

```javascript
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

// 需要从 .gitignore 清理的旧条目
const LEGACY_GITIGNORE_ENTRIES = [
  '.bmad-core',
  '.bmad-method',
  '.claude/commands/BMad',
  '{output_folder}',  // v6.0.0-Beta.8 bug 产物
]

// V6 新版 .gitignore 条目
const V6_GITIGNORE_ENTRIES = [
  '_bmad/',
  '_bmad-output/',
]

// 修复安装器 bug: {output_folder} 未解析为 _bmad-output (v6.0.0-Beta.8)
function fixOutputFolderBug(cwd) {
  const buggyPath = path.join(cwd, '{output_folder}')
  const correctPath = path.join(cwd, '_bmad-output')

  if (!fs.existsSync(buggyPath)) return false

  if (!fs.existsSync(correctPath)) {
    // _bmad-output 不存在，直接重命名
    fs.renameSync(buggyPath, correctPath)
    console.log('   ✅ {output_folder} → _bmad-output/ (重命名)')
  } else {
    // _bmad-output 已存在，合并子目录后删除
    const entries = fs.readdirSync(buggyPath, { withFileTypes: true })
    for (const entry of entries) {
      const src = path.join(buggyPath, entry.name)
      const dest = path.join(correctPath, entry.name)
      if (!fs.existsSync(dest)) {
        fs.renameSync(src, dest)
        console.log(`   ✅ 移动 ${entry.name} → _bmad-output/`)
      }
    }
    fs.rmSync(buggyPath, { recursive: true, force: true })
    console.log('   ✅ 已删除多余的 {output_folder}/')
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

  // 移除 V4 旧条目
  const filtered = lines.filter(line => {
    const trimmed = line.trim()
    const isLegacy = LEGACY_GITIGNORE_ENTRIES.some(entry =>
      trimmed === entry || trimmed === entry + '/' || trimmed === '/' + entry
    )
    if (isLegacy) {
      console.log(`   🗑️  移除旧条目: ${trimmed}`)
      changed = true
    }
    return !isLegacy
  })

  // 添加 V6 新条目
  const newEntries = []
  for (const entry of V6_GITIGNORE_ENTRIES) {
    const entryBase = entry.replace(/\/$/, '')
    const alreadyExists = filtered.some(line => {
      const trimmed = line.trim()
      return trimmed === entry || trimmed === entryBase || trimmed === '/' + entryBase
    })
    if (!alreadyExists) {
      newEntries.push(entry)
      console.log(`   ✅ 添加新条目: ${entry}`)
      changed = true
    }
  }

  if (!changed) {
    console.log('   ℹ️  .gitignore 已是最新，无需更新')
    return
  }

  // 构建新内容
  let result = filtered.join('\n')

  if (newEntries.length > 0) {
    // 确保末尾有换行，然后添加 BMad 区块
    if (result.length > 0 && !result.endsWith('\n')) {
      result += '\n'
    }
    result += '\n# BMad Method V6\n'
    result += newEntries.join('\n') + '\n'
  }

  fs.writeFileSync(gitignorePath, result, 'utf8')
  console.log(`   📝 .gitignore 已${exists ? '更新' : '创建'}`)
}

async function initBmad() {
  const cwd = process.cwd()
  const bmadV6Path = path.join(cwd, '_bmad')
  const legacyCorePath = path.join(cwd, '.bmad-core')
  const legacyMethodPath = path.join(cwd, '.bmad-method')

  // 检查旧版 V4 安装
  const hasLegacyCore = fs.existsSync(legacyCorePath)
  const hasLegacyMethod = fs.existsSync(legacyMethodPath)

  if (hasLegacyCore || hasLegacyMethod) {
    console.log('⚠️  检测到旧版 BMad V4 安装：')
    if (hasLegacyCore) console.log('   • .bmad-core/ (V4 核心目录)')
    if (hasLegacyMethod) console.log('   • .bmad-method/ (V4 方法目录)')
    console.log('')
    console.log('📌 V6 安装器会自动处理旧版迁移，请在安装过程中按提示操作。')
    console.log('   详情参考：https://bmad-code-org.github.io/BMAD-METHOD/docs/how-to/upgrade-to-v6')
    console.log('')
  }

  // 检查 V6 是否已安装
  const hasV6 = fs.existsSync(bmadV6Path)

  // 构建非交互式安装命令
  let installCmd
  if (hasV6) {
    console.log('🔄 检测到已有 BMad V6 安装，将执行快速更新...')
    console.log('')
    installCmd = [
      'npx bmad-method install',
      '--directory .',
      '--action quick-update',
      '--yes',
    ].join(' ')
  } else {
    console.log('🚀 正在初始化 BMad-Method V6...')
    console.log('')
    installCmd = [
      'npx bmad-method install',
      '--directory .',
      '--modules bmm',
      '--tools claude-code',
      '--communication-language Chinese',
      '--document-output-language Chinese',
      '--yes',
    ].join(' ')
  }

  // 执行安装
  try {
    console.log(`📋 执行: ${installCmd}`)
    console.log('')
    execSync(installCmd, {
      stdio: 'inherit',
      cwd: cwd,
      shell: true
    })

    console.log('')
    console.log('✅ BMad-Method V6 安装/更新完成！')
    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('📌 重要提示：请重启 AI IDE 以加载 BMad 扩展')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('')
    // 修复 {output_folder} bug (v6.0.0-Beta.8)
    console.log('🔧 检查安装器已知问题...')
    try {
      const fixed = fixOutputFolderBug(cwd)
      if (!fixed) console.log('   ℹ️  无需修复')
    } catch (err) {
      console.log(`   ⚠️  修复 {output_folder} 失败: ${err.message}`)
      console.log('   请手动将 {output_folder}/ 重命名为 _bmad-output/')
    }
    console.log('')

    console.log('📂 V6 目录结构：')
    console.log('   • _bmad/          — agents、workflows、tasks 和配置')
    console.log('   • _bmad-output/   — 生成的工件输出目录')
    console.log('')

    // 自动更新 .gitignore
    console.log('🔧 更新 .gitignore...')
    try {
      updateGitignore(cwd)
    } catch (err) {
      console.log('   ⚠️  自动更新 .gitignore 失败，请手动添加 _bmad/ 和 _bmad-output/')
    }
    console.log('')
    console.log('🚀 快速开始：')
    console.log('   1. 重启 AI IDE')
    console.log('   2. 运行 /bmad-help 获取引导和下一步建议')
    console.log('   3. 输入 /bmad 并使用自动补全浏览可用命令')
    console.log('')
    console.log('💡 常用工作流：')
    console.log('   • /bmad-help                      — 交互式帮助')
    console.log('   • /bmad-bmm-create-prd             — 创建产品需求文档')
    console.log('   • /bmad-bmm-create-architecture     — 创建架构文档')
    console.log('   • /bmad-bmm-create-epics-and-stories — 创建史诗和用户故事')
    console.log('   • /bmad-bmm-sprint-planning         — 初始化 Sprint 计划')
    console.log('   • /bmad-bmm-dev-story               — 实现用户故事')

    // 清理旧版 V4 IDE 命令提醒
    const legacyClaudeAgents = path.join(cwd, '.claude', 'commands', 'BMad', 'agents')
    const legacyClaudeTasks = path.join(cwd, '.claude', 'commands', 'BMad', 'tasks')
    if (fs.existsSync(legacyClaudeAgents) || fs.existsSync(legacyClaudeTasks)) {
      console.log('')
      console.log('⚠️  检测到旧版 V4 IDE 命令，建议手动删除：')
      if (fs.existsSync(legacyClaudeAgents)) console.log('   • .claude/commands/BMad/agents/')
      if (fs.existsSync(legacyClaudeTasks)) console.log('   • .claude/commands/BMad/tasks/')
      console.log('   新的 V6 命令已安装在 .claude/commands/bmad/ 下')
    }
  }
  catch (error) {
    console.error('❌ 安装失败：', error.message)
    console.log('')
    console.log('🛠️  手动安装指南：')
    console.log('   1. 确保已安装 Node.js 20+')
    console.log('   2. 非交互式安装：')
    console.log('      npx bmad-method install --directory . --modules bmm --tools claude-code --communication-language Chinese --document-output-language Chinese --yes')
    console.log('   3. 快速更新已有安装：')
    console.log('      npx bmad-method install --directory . --action quick-update --yes')
    console.log('   4. 或交互式安装：')
    console.log('      npx bmad-method install')
    console.log('')
    console.log('📖 详细文档：')
    console.log('   https://bmad-code-org.github.io/BMAD-METHOD/docs/how-to/install-bmad')
  }
}

// 执行初始化
initBmad()
```

## 用法

只需在 Claude Code 中键入：

```
/bmad-init
```

此命令将：

1. 检测现有安装状态（V6 / V4 旧版 / 未安装）
2. 新安装：`npx bmad-method install --directory . --modules bmm --tools claude-code --communication-language Chinese --document-output-language Chinese --yes`
3. 已安装：`npx bmad-method install --directory . --action quick-update --yes`
4. 修复 `{output_folder}` → `_bmad-output` 安装器 bug
5. 自动更新 `.gitignore`（清理旧条目，添加 V6 条目）
6. 提供后续步骤建议
