# 环境变量和权限配置功能实施计划

## 任务概述
在 ZCF 菜单中增加第7个选项"导入推荐环境变量和权限配置"，包含三个子菜单选项：
- 导入 ZCF 推荐环境变量：从模板导入隐私保护环境变量
- 导入 ZCF 推荐权限配置：从模板导入推荐的权限配置
- 打开 settings.json 手动配置：在系统编辑器中打开配置文件

## 实际实施（简化版）

### Step 1: 创建简化的配置导入功能
- 文件：`src/utils/simple-config.ts`
- 功能：
  - importRecommendedEnv(): 导入模板中的环境变量
  - importRecommendedPermissions(): 导入模板中的权限配置
  - openSettingsJson(): 在系统编辑器中打开 settings.json

### Step 2: 更新国际化文本
- 文件：`src/constants.ts`
- 添加菜单文本和描述：
  - 主菜单："导入推荐环境变量和权限配置"
  - 子菜单选项及描述

### Step 3: 更新功能模块
- 文件：`src/utils/features.ts`
- 添加 configureEnvPermissionFeature 函数
- 实现三个选项的处理逻辑

### Step 4: 集成到菜单系统
- 文件：`src/commands/menu.ts`
- 添加选项7的处理

## 功能特点
- 一键导入，无需复杂配置
- 自动合并现有配置
- 支持打开编辑器手动配置
- 跨平台支持（macOS、Windows、Linux）

## 模板配置内容
- 环境变量：
  - DISABLE_TELEMETRY: "1"
  - DISABLE_ERROR_REPORTING: "1"
  - CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1"
- 权限：几乎全部权限，危险操作由规则限制