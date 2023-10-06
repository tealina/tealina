import prompts from 'prompts'
import { createScaffold } from '../../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from '../helper.js'
import { describe, test } from 'vitest'
import path from 'path'

describe('create Express post-get', () => {
  const server = 'express'
  const apiStyle = 'post-get'
  const tempDir = path.join(TEMP_ROOT, server, apiStyle)
  cleanDir(tempDir)
  test('create post-get', async () => {
    process.argv = ['', '', '-d']
    prompts.inject([tempDir, server, apiStyle, 'none'])
    await createScaffold()
    return validate(tempDir)
  })
})
