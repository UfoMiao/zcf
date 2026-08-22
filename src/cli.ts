#!/usr/bin/env node
import process from 'node:process'
import cac from 'cac'
import { setupCommands } from './cli-setup'

async function main(): Promise<void> {
  const cli = cac('zcf')
  await setupCommands(cli)
  // cac.parse() invokes the matched action but does not await it; exiting here
  // would drop interactive menu work (uninstall/update) and swallow failures as 0.
  cli.parse(process.argv, { run: false })
  await cli.runMatchedCommand()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
