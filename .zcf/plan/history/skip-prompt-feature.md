# Skip-prompt Feature Implementation Plan

## Context
为init命令增加 --skip-prompt 指令用于跳过所有交互式提示，相对应的就需要加更多参数用来快速配置每个选项。

## Implementation Steps

### 1. ✅ Analysis Phase
- 分析现有init命令的交互流程
- 识别所有需要用户输入的交互点
- 确定每个交互点对应的参数需求

### 2. ✅ Design Phase
设计了完整参数方案，新增以下参数：
- `--skip-prompt` - 跳过所有交互提示
- `--install-claude` - 是否安装Claude Code（yes/no/skip）
- `--config-action` - 配置处理方式（new/backup/merge/docs-only/skip）
- `--api-type` - API类型（auth_token/api_key/ccr_proxy/skip）
- `--api-key` - API密钥
- `--auth-token` - Auth Token
- `--api-url` - 自定义API URL
- `--mcp-services` - MCP服务列表（逗号分隔）
- `--mcp-api-keys` - MCP服务API密钥（JSON格式）
- `--workflows` - 工作流列表（逗号分隔）
- `--ai-personality` - AI个性化类型

### 3. ✅ TDD Implementation
- 编写完整的测试用例（18个测试）
- 测试覆盖所有参数验证和功能场景
- 使用mock确保测试独立性

### 4. ✅ Code Implementation
- 更新InitOptions接口添加新参数
- 实现validateSkipPromptOptions参数验证函数
- 修改init函数支持skip-prompt模式
- 更新selectAndInstallWorkflows支持预选参数
- 更新configureAiPersonality支持预选参数
- 更新CLI参数定义

### 5. ✅ Documentation
- 更新README.md添加非交互模式说明
- 提供完整的参数列表和使用示例
- 添加CI/CD场景的使用案例

## Technical Details

### Parameter Validation
- 在try-catch块外进行验证，确保错误正确传播
- 验证参数值的有效性
- 支持字符串到数组的转换（逗号分隔）
- 支持JSON字符串解析（mcp-api-keys）

### Backward Compatibility
- 保持现有交互式模式不变
- 所有新参数都是可选的
- 默认行为保持不变

### Error Handling
- 清晰的错误消息
- 列出有效选项
- 参数验证失败时立即退出

## Test Coverage
- 基本功能测试
- 参数验证测试
- 边界条件测试
- 错误场景测试

## Usage Examples

```bash
# 完整的非交互式初始化
npx zcf i --skip-prompt \
  --lang en \
  --config-lang en \
  --install-claude yes \
  --api-type api_key \
  --api-key "sk-ant-..." \
  --mcp-services "context7,mcp-deepwiki" \
  --workflows "sixStepsWorkflow,featPlanUx"

# CI/CD环境使用
npx zcf i --skip-prompt \
  --config-action new \
  --api-type ccr_proxy \
  --install-claude yes
```

## Deliverables
1. ✅ 完整的参数系统
2. ✅ 参数验证逻辑
3. ✅ 非交互式模式实现
4. ✅ 测试用例（100%通过）
5. ✅ 文档更新
6. ✅ 类型检查通过