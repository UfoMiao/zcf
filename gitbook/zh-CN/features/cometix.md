# CCometixLine 状态栏

CCometixLine 是高性能终端/IDE 状态栏插件，ZCF 支持全自动安装与更新。

## 安装流程

- `zcf init` 默认启用 `--install-cometix-line true`，若无需安装可显式传入 `false`。
- 安装过程中会检测平台，自动选择合适的构建方式。

## 功能亮点

- 显示 Git 分支、变更数量与远端同步状态。
- 实时展示 Claude Code / Codex 使用统计，与 `ccusage` 数据保持一致。
- 支持根据工作流状态显示阶段提示。

## 管理方式

- 在主菜单中输入 `L` 进入 CCometixLine 管理，可升级或卸载。
- 若需要在非交互模式禁用安装，可使用 `-x false`。
