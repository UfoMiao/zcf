---
title: 供应商预设
---

# 供应商预设

预设会为已知服务填好[供应商](./config#provider)：各协议的接口地址、密钥的传递方式以及模型。你只需要填入 API 密钥。

## 使用预设

在任一编辑器中打开“供应商”，选择“从预设开始”。每个预设都会列出它发送请求的主机，你可以在选择之前看清密钥会被发往哪里。命令行上，`zcf init --preset <id> --api-key <key>` 一次运行即可把这些字段填进配置。

选择预设后：

- 供应商的名称、接口地址和模型会替换为预设中的值；
- 只有当预设与当前供应商使用相同的主机时，API 密钥才会保留。主机不同时密钥会被清空，你需要填入新服务的密钥。比较的是主机而不是路径，两个服务共用一个主机时请检查接口地址；
- 只修改草稿。检查各字段后再保存。

[应用页](./ui)和 `zcf plan` 会在写入任何内容之前，准确显示每个工具将得到的配置。

## 预设从哪里来

预设是数据，不是代码。它们保存在 ZCF 仓库的 [`presets/providers.json`](https://github.com/UfoMiao/zcf/blob/main/presets/providers.json) 中，ZCF 在你打开预设列表时下载它。因此新增或修正的预设无需发布新版本就能送达。

- ZCF 同时请求 jsDelivr 和 raw GitHub，采用第一个有效的响应。使用 [`china` 镜像](./mirrors)时，还会加入 jsDelivr 在国内可用的节点。
- 列表保存在 `~/.ufomiao/zcf/cache/providers.json`，24 小时内重复使用。所有来源都无响应时，显示已保存的副本，并提示它可能不是最新的。
- jsDelivr 可能需要约 12 小时才会提供更新后的文件。
- 每个条目在使用前都会被校验：接口地址必须是 `https://` URL，预设中永远不会带有 API 密钥。有问题的条目会被跳过，不影响其他条目。

想使用自己的列表（例如放在 gist 中的文件），设置 `ZCF_PRESETS_URL`：

```bash
ZCF_PRESETS_URL=https://gist.githubusercontent.com/me/.../raw/providers.json npx zcf ui
```

该文件的格式与 `presets/providers.json` 相同。从一个来源保存的列表不会在另一个来源下显示。

## 添加预设

提交一个修改 `presets/providers.json` 的 pull request。每个条目形如：

```json
{
  "id": "example",
  "name": "Example",
  "description": { "en": "Example API", "zh-CN": "Example API 服务" },
  "website": "https://example.com",
  "anthropic": { "baseUrl": "https://api.example.com/anthropic", "authType": "auth_token" },
  "openai": { "baseUrl": "https://api.example.com/v1", "model": "example-large" },
  "models": { "default": "example-large", "haiku": "example-small" }
}
```

`id` 使用小写字母、数字和 `-`。其他字段与[配置文件](./config#provider)中供应商的字段相同，但没有 `apiKey`。测试会检查文件中的每个条目。
