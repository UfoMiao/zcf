# docs-vitepress-migration

## 背景
- 现有 docs 基于 GitBook 结构（多语言目录、SUMMARY）
- 目标迁移为 VitePress，并参考 unocss/docs 的配置模式
- 必须包含国际化（默认 en、主内容 zh-CN、ja-JP 壳），支持搜索、暗色模式、GitHub 链接
- 部署方式需复制 unocss 的 GitHub Pages 脚本

## 执行计划
1. ✅ **整理 GitBook 导航**：读取 `docs/{en,zh-CN,ja}/SUMMARY.md`，抽取章节结构，记录成导航映射。
2. ✅ **分析 unocss 配置**：阅读 `/Users/miaoda/Documents/github/unocss/docs` 中 `config`、`vite.config.ts` 等，列出需要复制的模块与依赖。
3. ✅ **初始化 VitePress 目录**：在 `docs/.vitepress/` 下创建 `config.ts` 及相关 theme、locale 配置，移植 unocss 方案并裁剪。
4. ✅ **迁移导航与内容**：把步骤1的结构映射到 VitePress `locales`、`nav`、`sidebar`，调整 Markdown 路径确保 zh-CN 完整，en/ja-JP 占位。
5. ✅ **部署脚本同步**：复制并改写 unocss 文档的发布流程，新增 GitHub Pages 工作流 `.github/workflows/docs-deploy.yml`，使用 `pnpm docs:build` 产出静态站点并部署。
6. ✅ **验证**：运行 `pnpm docs:build` 构建通过。

> 计划将随执行进度更新。
