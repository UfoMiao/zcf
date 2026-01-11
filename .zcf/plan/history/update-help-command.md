# Update Help Command - 补充新功能说明

## 任务描述
在help指令里补全最近新增的功能：ccr、check等

## 实施方案
最小化更新方案，在现有help命令中增加缺失的check-updates命令说明，并优化ccr和ccu命令的描述。

## 执行内容

### 1. Commands部分更新 (src/cli-setup.ts:116-131)
- ✅ 优化ccr命令描述：`Configure Claude Code Router for model proxy / 配置模型路由代理`
- ✅ 优化ccu命令描述：`Claude Code usage statistics analysis / Claude Code 用量统计分析`  
- ✅ 新增check-updates命令：`Check and update to latest versions / 检查并更新到最新版本`
- ✅ 快捷方式新增：`zcf check - Quick check updates / 快速检查更新`

### 2. Examples部分更新 (src/cli-setup.ts:146-168)
- ✅ 新增ccr命令示例
- ✅ 新增check-updates命令示例及说明
- ✅ 添加check别名示例

## 修改文件
- `src/cli-setup.ts` - customizeHelp函数

## 验证步骤
1. 运行 `pnpm dev --help` 查看更新后的帮助信息
2. 确保中英文对齐和格式一致
3. 验证所有命令说明完整准确