import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/*/test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/*/src/**/*.{ts,tsx}'],
      // Process entry only branches between the fast `--version` path and the lazy main module.
      // The web UI runs in a browser; `pnpm build` and typecheck cover it in CI, and it is
      // checked by hand in a real browser against `zcf ui`.
      exclude: ['packages/cli/src/cli.ts', 'packages/web/**'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
})
