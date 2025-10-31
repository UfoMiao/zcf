# API 提供商预设

ZCF 在 `validateSkipPromptOptions` 与 Codex 相关代码中提供了统一的 API 提供商预设：

| 预设 | 说明 | 默认认证方式 |
| --- | --- | --- |
| `302ai` | 302.AI 企业级 API 服务 | `api_key` |
| `glm` | 智谱 GLM 服务 | `api_key` |
| `minimax` | MiniMax 服务 | `api_key` |
| `kimi` | Moonshot Kimi | `api_key` |
| `custom` | 自定义端点 | 需指定 `--api-type` |

## 使用方式

```bash
npx zcf i -s -p 302ai -k "sk-xxx"
```

- 预设会自动填充 baseUrl、认证方式与默认模型；仍可覆盖 `--api-model`、`--api-fast-model`。
- 若传入未知预设，ZCF 会抛出错误并列出有效值。

## 多配置场景

- `--api-configs` 支持混合预设与自定义：

```json
[
  {"provider": "302ai", "key": "sk-xxx"},
  {"name": "custom", "type": "api_key", "key": "sk-yyy", "url": "https://custom.example", "default": true}
]
```

- 默认配置将写入 `settings.json` 或 `config.toml` 的主模型条目，其余配置可通过命令或手动切换。
