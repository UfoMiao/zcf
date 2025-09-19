# Repository Guidelines

## Project Structure & Module Organization
Source code lives in `src/`, with the CLI entry point in `src/cli.ts` and features split into `commands/`, `config/`, `utils/`, and `types/`. Shared assets (banners, locale files, templates) are under `src/assets/`, `src/i18n/`, and top-level `templates/`. Generated bundles reside in `dist/`; avoid editing them directly. Tests mirror the runtime tree inside `tests/` (`unit/`, `integration/`, and helper fixtures), and documentation resides in `docs/` plus localized READMEs.

## Build, Test, and Development Commands
- `pnpm install` — sync dependencies defined by the workspace catalogs.
- `pnpm dev` — run the CLI in watch mode via `tsx` for rapid iteration.
- `pnpm build` — produce the distributable with `unbuild`.
- `pnpm typecheck` — validate TypeScript types without emitting files.
- `pnpm lint` / `pnpm lint:fix` — run ESLint with the shared @antfu config.
- `pnpm test` / `pnpm test:run` — execute Vitest suites; add `:coverage` for V8 coverage reports.

## Coding Style & Naming Conventions
Stick to TypeScript ESM modules with 2-space indentation and single quotes, matching the existing files. Use `camelCase` for functions and variables, `PascalCase` for types and classes, and `kebab-case` for new filenames in CLI modules. Prefer named exports from feature modules and keep side effects in entry points only. ESLint (via `eslint.config.ts`) and lint-staged enforce formatting—run them locally before pushing.

## Testing Guidelines
Vitest powers both unit and integration coverage. Place fast, isolated checks in `tests/unit/*.test.ts` and cross-module flows in `tests/integration/`. Reuse helpers from `tests/helpers/` and fixtures in `tests/fixtures/` to reduce duplication. When adding tests, assert CLI behavior via snapshot-safe strings and ensure `pnpm test:coverage` stays above existing thresholds (current reports live in `coverage/`).

## Commit & Pull Request Guidelines
Commits follow Conventional Commits (`feat:`, `fix:`, etc.) with ≤100-character subject lines; scopes are optional but descriptive scopes (for example `feat(config): ...`) help reviewers. Start bodies with a blank line when explaining rationale. For pull requests, include a succinct summary, reproduction or validation steps (e.g., `pnpm test` output), any screenshots of CLI prompts when UX changes, and link related issues or changesets. Ensure the branch passes lint, typecheck, and tests before requesting review.

## Localization & Template Notes
Whenever work touches `src/i18n/` or `templates/`, update parallel resources in `docs/` and localized READMEs to keep instructions aligned. Provide English defaults first, then synchronize translated strings through the existing namespace files to avoid breaking the setup wizard.
