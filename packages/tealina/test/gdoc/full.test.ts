import { existsSync, rmSync } from 'fs-extra'
import path from 'path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { cli } from '../../src/commands/index.js'

const mockDir = 'packages/tealina/test/gdoc/mock'
const apiDir = 'api-v1'
const outputDir = 'temp'

const output = path.join(`${outputDir}/${apiDir}.json`)
const cleanOutput = () => {
  if (existsSync(output)) {
    rmSync(path.join(output))
  }
}
beforeAll(cleanOutput)

afterAll(cleanOutput)

test('actual run gdoc', () => {
  const parsed = cli.parse(
    [
      '',
      'tealina',
      'gdoc',
      '--api-dir',
      apiDir,
      '--config-path',
      path.join(mockDir, 'tealina.config.mjs'),
      '--tsconfig-path',
      path.join(mockDir, 'tsconfig.json'),
      '--output-dir',
      outputDir,
    ],
    { run: false },
  )
  expect(cli.matchedCommandName).eq('gdoc')
  return cli.runMatchedCommand()
})
