import prompts from 'prompts'
import { describe, test } from 'vitest'
import { createScaffold } from '../../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from '../helper.js'
import path from 'path'

describe('create Fastify restful', () => {
  const server = 'fastify'
  const apiStyle = 'restful'
  const tempDir = path.join(TEMP_ROOT, server, apiStyle)
  cleanDir(tempDir)
  test('create restful', async () => {
    process.argv = ['', '', '-d']
    prompts.inject([tempDir, server, apiStyle, 'none'])
    await createScaffold()
    await validate(tempDir)
  })
})
