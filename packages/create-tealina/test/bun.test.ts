import path from 'node:path'
import prompts from 'prompts'
import { test } from 'vitest'
import { createScaffold } from '../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from './helper.js'

const server = 'express'
const tempDir = path.join(TEMP_ROOT, `bun-${server}`)
cleanDir(tempDir)
test('create Express restful', async () => {
  process.argv = ['', '']
  prompts.inject([tempDir, server, 'react-ts'])
  await createScaffold('bun')
  return validate(tempDir)
})
