import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  formatters: true,
  pnpm: true,
  ignores: [
    '.bmad-core/**',
    '.claude/**',
    '**/**.md',
  ],
  rules: {
    'no-console': 'off',
    'unused-imports/no-unused-imports': 'off',
    'unused-imports/no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
  },
})