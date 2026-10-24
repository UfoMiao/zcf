// Measures how long `zcf --version` and `zcf --help` take from process start to exit.
// Fails when the median `--version` time is over ZCF_STARTUP_BUDGET_MS (default 60).
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const bin = fileURLToPath(new URL('../packages/cli/bin/zcf.mjs', import.meta.url))
const runs = Number(process.env.ZCF_STARTUP_RUNS) || 15
const budget = Number(process.env.ZCF_STARTUP_BUDGET_MS) || 60

function medianMs(args) {
  spawnSync(process.execPath, args) // warm the file cache
  const times = []
  for (let i = 0; i < runs; i++) {
    const start = performance.now()
    const result = spawnSync(process.execPath, args)
    times.push(performance.now() - start)
    if (result.status !== 0) throw new Error(`node ${args.join(' ')} exited with ${result.status}: ${result.stderr}`)
  }
  return times.toSorted((a, b) => a - b)[Math.floor(times.length / 2)]
}

const node = medianMs(['-e', '0'])
const version = medianMs([bin, '--version'])
const help = medianMs([bin, '--help'])

console.log(`node -e 0      ${node.toFixed(1)} ms (baseline)`)
console.log(`zcf --version  ${version.toFixed(1)} ms (budget ${budget} ms)`)
console.log(`zcf --help     ${help.toFixed(1)} ms`)

if (version > budget) {
  console.error(`zcf --version took ${version.toFixed(1)} ms, over the ${budget} ms budget`)
  process.exitCode = 1
}
