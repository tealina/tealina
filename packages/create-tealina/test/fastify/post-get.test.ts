import path from 'node:path'
import prompts from 'prompts'
import { test } from 'vitest'
import { createScaffold } from '../../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from '../helper.js'

const server = 'fastify'
const apiStyle = 'post-get'
const tempDir = path.join(TEMP_ROOT, server, apiStyle)
cleanDir(tempDir)
test('create Fastify post-get', async () => {
  process.argv = ['', '', '-d']
  prompts.inject([tempDir, server, apiStyle, 'none'])
  await createScaffold()
  await validate(tempDir)
})
