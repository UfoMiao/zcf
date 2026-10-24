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
    onlyBundle: ['@decimalturn/toml-patch', 'ansis', 'cac', 'diff', 'jsonc-parser', 'pathe', 'tinyexec', 'valibot'],
  },
  // jsonc-parser's `main` is a UMD build that bundles badly; its `module` field is plain ESM.
  inputOptions: {
    resolve: {
      mainFields: ['module', 'main'],
    },
  },
  minify: true,
  dts: false,
  clean: true,
})
