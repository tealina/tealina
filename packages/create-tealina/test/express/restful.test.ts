import prompts from 'prompts'
import { createScaffold } from '../../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from '../helper.js'
import { describe, test } from 'vitest'
import path from 'path'

describe('create Express restful', () => {
  const server = 'express'
  const apiStyle = 'restful'
  const tempDir = path.join(TEMP_ROOT, server, apiStyle)
  cleanDir(tempDir)
  test('create restful', async () => {
    process.argv = ['', '', '-d']
    prompts.inject([tempDir, server, apiStyle, 'none'])
    await createScaffold()
    return validate(tempDir)
  })
})
