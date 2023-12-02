import path from 'node:path'
import prompts from 'prompts'
import { test } from 'vitest'
import { createScaffold } from '../../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from '../helper.js'
import { existsSync } from 'node:fs'
import { expect } from 'vitest'

const server = 'fastify'
const apiStyle = 'restful'
const tempDir = path.join(TEMP_ROOT, server, apiStyle)
cleanDir(tempDir)
test('create Fastify restful', async () => {
  process.argv = ['', '']
  prompts.inject([tempDir, server, apiStyle, 'none'])
  await createScaffold()
  const validateDir = existsSync(path.join(tempDir, 'src', 'validate'))
  expect(validateDir).true
  await validate(tempDir)
})
