---
title: 参与贡献
---

# 参与贡献

ZCF 是一个 pnpm workspace，需要 Node.js 22 或更高版本。

```bash
git clone https://github.com/UfoMiao/zcf.git
cd zcf
pnpm install
pnpm dev plan --file ./my-zcf.json   # 从源码运行 CLI
```

`pnpm dev ui` 使用 `packages/web/dist` 中的网页界面，因此请先运行一次 `pnpm build`。

| 包 | 内容 |
|----|------|
| `packages/core` | 引擎：配置 schema、每个工具一个适配器、计划与应用，以及 JSON、TOML、YAML 和 `.env` 文件的编辑器。不含终端或界面代码。 |
| `packages/ui-kit` | 终端和网页界面共用的部分：草稿模型、页面与字段，以及 `ZcfService` 接口。 |
| `packages/cli` | `zcf` 命令、终端界面，以及 `zcf ui` 使用的本地服务器。 |
| `packages/web` | 浏览器界面。 |
| `presets/providers.json` | [供应商预设](./providers)，运行时加载。 |

## 检查

| 命令 | 用途 |
|------|------|
| `pnpm test:run` | 全部测试 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm lint` | oxlint 和 oxfmt（用 `pnpm lint:fix` 修复） |
| `pnpm build` | 打包 CLI |
| `pnpm bench` | 检查 `zcf --version` 能否在 60 ms 预算内启动 |
| `pnpm docs:dev` | 本文档站点 |

测试从不触碰你真实的主目录，也不运行真实的安装器。适配器接收主目录、平台、环境变量和命令执行器，测试中传入的都是模拟实现。

## 延伸阅读

- [`AGENTS.md`](https://github.com/UfoMiao/zcf/blob/main/AGENTS.md)：每次修改都要遵守的规则，对人和 AI agent 一样适用。
- [ADR 002](https://github.com/UfoMiao/zcf/blob/main/docs/adr/002-v5-architecture.md)：v5 架构及其背后的理由。

## 添加工具

一个工具就是 `packages/core/src/adapters` 中的一个适配器。它负责检测工具，规划安装、供应商、MCP 服务和技能，并规划更新。在 `packages/core/src/schema/config.ts` 中加入工具的 ID 和名称，并在 `packages/core/src/adapters/index.ts` 中注册适配器；CLI 和两个界面会自动识别。工具有自带命令时就用命令。用模拟执行器覆盖全新安装、已有配置和 Windows 路径三种情况。

Pull request 使用 Conventional Commits，描述遵循仓库的模板。
