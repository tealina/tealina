#!/usr/bin/env node

import { catchError } from './dist/utils/catchError.mjs'
import { cli } from './dist/commands/index.mjs'
catchError

cli.parse(process.argv, { run: false })

catchError(() => cli.runMatchedCommand())
