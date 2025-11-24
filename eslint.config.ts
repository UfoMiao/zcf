import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  formatters: true,
  pnpm: true,
  ignores: [
    '.bmad-core/**',
    '.claude/**',
    '**/**.md',
    '.cunzhi-memory/**',
  ],
  rules: {
    'no-console': 'off',
  },
})
