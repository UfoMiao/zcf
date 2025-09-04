#!/usr/bin/env node
import cac from 'cac'
import { setupCommands } from './cli-setup'

async function main(): Promise<void> {
  // Setup and run CLI
  const cli = cac('zcf')
  await setupCommands(cli)
  cli.parse()
}

main().catch(console.error)
