#!/usr/bin/env node

// import chalk from 'chalk'
import { cli } from './dist/command/index.js'

cli.parse(process.argv, { run: false })

const p = cli.runMatchedCommand()

if (p instanceof Promise) {
  p.catch(e => {
    console.log(e)
    // console.log(chalk.red(String(e)))
  })
}
