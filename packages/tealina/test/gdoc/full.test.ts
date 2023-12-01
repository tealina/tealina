import { existsSync, rmSync } from 'fs-extra'
import path from 'node:path'
import { afterAll, beforeAll, test } from 'vitest'
import { cli } from '../../src/commands/index.js'

const mockDir = 'test/gdoc/mock'
const apiDir = 'api-v1'
const outputDir = 'temp'

const input = path.join(`${mockDir}/basic`)
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
      apiDir,
      'gdoc',
      '-i',
      input,
      '--output',
      outputDir,
      '--tsconfig-path',
      path.join(mockDir, 'tsconfig.json'),
      '--config-path',
      path.join(mockDir, 'tealina.config.mjs'),
    ],
    { run: false },
  )
  // console.log(cli.matchedCommand)
  // expect(cli.matchedCommandName).eq('gdoc')
  return cli.runMatchedCommand()
})
