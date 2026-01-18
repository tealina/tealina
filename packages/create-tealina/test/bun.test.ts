import path from 'node:path'
import prompts from 'prompts'
import { expect, test } from 'vitest'
import { createScaffold } from '../src/core.js'
import { TEMP_ROOT, cleanDir, validate } from './helper.js'
import { readFileSync } from 'node:fs'

const server = 'express'
const tempDir = path.join(TEMP_ROOT, `bun-${server}`)
cleanDir(tempDir)
test('create Express restful', async () => {
  process.argv = ['', '']
  prompts.inject([tempDir, server, 'react-ts'])
  await createScaffold('bun')
  await validate(tempDir)
  const serverDir = path.join(tempDir, 'packages/server')
  const serverPkg = JSON.parse(
    readFileSync(path.join(serverDir, 'package.json')).toString(),
  )
  expect(serverPkg.scripts.dev).eq('bun --watch src')
  expect(serverPkg.devDependencies.tsx).toBeUndefined()
})
