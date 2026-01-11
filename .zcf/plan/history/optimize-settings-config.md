# 优化 settings.json 配置结构

## 任务背景

发现 templates 目录下的 en 和 zh-CN 子目录中都包含了完全相同的 settings.json 文件，这违反了 DRY（Don't Repeat Yourself）原则。同时需要添加默认的隐私保护环境变量。

## 解决方案

采用基础模板模式，将共同配置提取到 `templates/settings.json`，并在其中添加默认环境变量。

## 具体实施

### 1. 创建基础配置文件
- 创建 `templates/settings.json` 作为基础配置
- 添加三个隐私保护环境变量：
  - `DISABLE_TELEMETRY`: 禁用遥测
  - `DISABLE_ERROR_REPORTING`: 禁用错误报告
  - `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`: 禁用非必要网络流量

### 2. 更新复制逻辑
- 修改 `src/utils/config.ts` 中的 `copyConfigFiles` 函数
- 在复制语言特定文件时跳过 settings.json
- 从基础模板目录复制 settings.json

### 3. 删除重复文件
- 删除 `templates/en/settings.json`
- 删除 `templates/zh-CN/settings.json`

## 技术改进

### DRY 原则应用
- 消除了两个完全相同的配置文件
- 集中管理共同配置，便于统一维护

### KISS 原则体现
- 保持了简单的文件结构
- 复制逻辑清晰明了

### 代码变更

1. **新增文件**：`templates/settings.json`
2. **修改文件**：`src/utils/config.ts`
3. **删除文件**：
   - `templates/en/settings.json`
   - `templates/zh-CN/settings.json`

## 成果

- ✅ 消除了配置文件重复
- ✅ 添加了默认隐私保护环境变量
- ✅ 提高了代码可维护性
- ✅ 保持了现有功能完整性