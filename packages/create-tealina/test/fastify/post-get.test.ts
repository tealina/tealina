import prompts from 'prompts'
import { describe, test } from 'vitest'
import { createScaffold } from '../../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from '../helper.js'
import path from 'path'

describe('create Fastify post-get', () => {
  const server = 'fastify'
  const apiStyle = 'post-get'
  const tempDir = path.join(TEMP_ROOT, server, apiStyle)
  cleanDir(tempDir)
  test('create post-get', async () => {
    process.argv = ['', '', '-d']
    prompts.inject([tempDir, server, apiStyle, 'none'])
    await createScaffold()
    await validate(tempDir)
  })
})
