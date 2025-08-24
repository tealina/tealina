import path from 'node:path'
import prompts from 'prompts'
import { test } from 'vitest'
import { createScaffold } from '../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from './helper.js'

const server = 'fastify'
const apiStyle = 'restful'
const tempDir = path.join(TEMP_ROOT, server)
cleanDir(tempDir)
test('create Fastify restful', async () => {
  process.argv = ['', '']
  prompts.inject([tempDir, server, 'none'])
  await createScaffold()
  await validate(tempDir)
})
