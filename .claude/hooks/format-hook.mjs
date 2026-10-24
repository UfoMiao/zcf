// PostToolUse hook: lint-fix and format the file Claude just edited.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'

let input = ''
for await (const chunk of process.stdin) input += chunk

const file = JSON.parse(input || '{}').tool_input?.file_path
if (file && existsSync(file) && /\.(?:[cm]?[jt]s|json|jsonc|ya?ml)$/.test(file)) {
  const shell = process.platform === 'win32'
  if (/\.[cm]?[jt]s$/.test(file)) spawnSync('pnpm', ['exec', 'oxlint', '--fix', file], { stdio: 'inherit', shell })
  spawnSync('pnpm', ['exec', 'oxfmt', file], { stdio: 'inherit', shell })
}
