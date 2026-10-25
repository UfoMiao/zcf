import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  deps: {
    // Everything is bundled, so installing zcf pulls no dependencies. Code that only some
    // commands need (such as the TOML editor) is imported lazily and lands in its own chunk.
    alwaysBundle: [/^@zcf\//],
    onlyBundle: [
      '@decimalturn/toml-patch',
      'ansis',
      'cac',
      'diff',
      'jsonc-parser',
      'pathe',
      'tinyexec',
      'valibot',
      'yaml',
      // The terminal UI: Ink, React and their dependencies, loaded only by `zcf tui`.
      'ink',
      'react',
      'react-reconciler',
      'scheduler',
      'yoga-layout',
      'es-toolkit',
      '@alcalzone/ansi-tokenize',
      'ansi-escapes',
      'ansi-regex',
      'ansi-styles',
      'auto-bind',
      'chalk',
      'cli-boxes',
      'cli-cursor',
      'cli-truncate',
      'code-excerpt',
      'convert-to-spaces',
      'environment',
      'escape-string-regexp',
      'get-east-asian-width',
      'indent-string',
      'is-fullwidth-code-point',
      'is-in-ci',
      'mimic-fn',
      'onetime',
      'patch-console',
      'quick-lru',
      'restore-cursor',
      'signal-exit',
      'slice-ansi',
      'stack-utils',
      'string-width',
      'strip-ansi',
      'terminal-size',
      'widest-line',
      'wrap-ansi',
    ],
    // Ink only loads React DevTools when it is installed and DEV is set.
    neverBundle: ['react-devtools-core'],
  },
  // Production builds of React: smaller and faster.
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // jsonc-parser's `main` is a UMD build that bundles badly; its `module` field is plain ESM.
  inputOptions: {
    resolve: {
      mainFields: ['module', 'main'],
    },
  },
  // The web UI, built first by `pnpm build`, ships as static files that `zcf ui` serves;
  // so do the built-in skill templates the `zcf` skills source installs from.
  copy: [
    { from: '../web/dist/*', to: 'dist/web' },
    { from: '../core/templates', to: 'dist' },
  ],
  minify: true,
  dts: false,
  clean: true,
})
