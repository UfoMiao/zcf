# Exa MCP配置格式更新计划

## 任务背景
将exa MCP服务配置从URL参数方式改为环境变量方式，提高安全性和规范性。

## 目标配置格式
```json
{
  "exa": {
    "command": "npx",
    "args": ["-y", "exa-mcp-server"],
    "env": {
      "EXA_API_KEY": "your-api-key-here"
    }
  }
}
```

## 实施步骤

### 1. 修改MCP服务定义
- 文件：`src/constants.ts`
- 修改exa服务配置结构

### 2. 更新配置构建逻辑  
- 文件：`src/utils/mcp.ts`
- 增强buildMcpServerConfig函数支持环境变量

### 3. 更新类型定义
- 检查并确保类型正确

### 4. 测试验证
- 运行类型检查和测试
- 验证配置生成正确

## 执行时间
2025-08-08