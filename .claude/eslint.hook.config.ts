import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  ignores: [
    '.bmad-core/**',
    '.claude/**',
    'templates/**',
    '**/**.md',
  ],
  rules: {
    'no-console': 'off',
    'unused-imports/no-unused-imports': 'off',
    'unused-imports/no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
  },
})