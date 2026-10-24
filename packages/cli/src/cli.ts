import process from 'node:process'

// Answer `--version` before loading anything else, so it stays instant.
const argv = process.argv.slice(2)
if (argv.length === 1 && (argv[0] === '--version' || argv[0] === '-v')) {
  const { version } = await import('../package.json')
  process.stdout.write(`zcf/${version}\n`)
} else {
  const { main } = await import('./main')
  process.exitCode = await main(argv)
}
