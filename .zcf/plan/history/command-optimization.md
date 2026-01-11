# 命令优化任务记录

## 任务概述
优化 ZCF 工具的命令系统，添加缩写支持和快速更新功能

## 最新更新 (第二次迭代)
- 移除 `-u` 选项，保留 `zcf u` 命令
- 移除 `--update` 选项
- 为 `--config-lang` 添加缩写 `-c`
- update 命令简化流程，不再选择脚本语言
- update 命令改为双语输出（中英文同时显示）

## 实施内容

### 1. 命令缩写支持
- ✅ 为 `init` 命令添加别名 `i`
- ✅ 为 `update` 命令添加别名 `u`
- ✅ 支持 `npx zcf` 作为默认初始化命令
- ✅ 支持 `--update/-u` 选项快速更新

### 2. 新增 Update 命令
- ✅ 创建独立的 `update` 命令 (`src/commands/update.ts`)
- ✅ 抽取 `updatePromptOnly` 函数实现代码复用
- ✅ 仅更新 Prompt 文档，保留其他配置
- ✅ 自动备份旧配置

### 3. Help 优化
- ✅ 自定义 help 输出格式
- ✅ 显示命令和缩写对应关系
- ✅ 添加示例用法
- ✅ 彩色输出提升可读性

### 4. 文档更新
- ✅ 更新中文 README.md
- ✅ 更新英文 README_EN.md
- ✅ 添加命令速查表
- ✅ 添加使用示例

## 代码变更

### 修改的文件
1. `src/cli.ts` - 添加命令别名和优化 help
2. `src/commands/init.ts` - 抽取 updatePromptOnly 函数
3. `src/constants.ts` - 添加国际化文本

### 新增的文件
1. `src/commands/update.ts` - 新的 update 命令实现

## 使用方式

```bash
# 初始化（多种方式）
npx zcf              # 默认命令
npx zcf init         # 完整命令
npx zcf i            # 缩写命令

# 快速更新（多种方式）
npx zcf update       # 完整命令
npx zcf u            # 缩写命令
npx zcf --update     # 选项形式
npx zcf -u           # 缩写选项

# 查看帮助
npx zcf --help
npx zcf -h
```

## 优势
1. **更好的用户体验**：缩写命令减少输入
2. **职责分离**：update 和 init 功能独立
3. **代码复用**：共享 updatePromptOnly 逻辑
4. **向后兼容**：保留原有命令和选项
5. **清晰的帮助信息**：自定义格式展示所有选项