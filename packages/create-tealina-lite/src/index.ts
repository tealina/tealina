import chalk from 'chalk'
import minimist from 'minimist'
import { createScaffold } from './core.js'
import { InitAbort, runInit } from './init.js'

/**
 * Dispatched before `createScaffold` sees argv: it reads `argv._[0]` as a project name, so
 * without this branch `create-tealina-lite init` would scaffold a project called "init".
 */
const { _ } = minimist(process.argv.slice(2))
const run = _[0] === 'init' ? runInit : createScaffold

run().catch(e => {
  if (e === 'Canceled') {
    console.log('Canceled')
    process.exit(0)
  }
  // The message says what to fix, so the stack would only be noise.
  if (e instanceof InitAbort) {
    console.error(`\n${chalk.red('!')} ${e.message}`)
    process.exit(1)
  }
  console.error(e)
  process.exit(1)
})
