import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  kDefaultConfigPath,
  loadConfigFromPath,
  resolveConfigPath,
} from '../../src/utils/tool'
import mockConfig from './mock/mock.config'

test('load .ts config', async () => {
  const configPath = 'test/utils/mock/mock.config.ts'
  console.log(path.resolve(configPath))
  console.log(performance.now())
  const config = await loadConfigFromPath(path.resolve(configPath))
  console.log(performance.now())
  expect(JSON.stringify(config)).toEqual(JSON.stringify(mockConfig))
})

describe('probe for the config when --config-path was not given', () => {
  const dir = 'temp/config-probe'
  const inDir = (f: string) => path.join(dir, f)

  beforeAll(() => {
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
  })
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test('prefers the .ts that tealina has always used', () => {
    writeFileSync(inDir('tealina.config.ts'), 'export default {}\n')
    writeFileSync(inDir('tealina.config.js'), 'export default {}\n')
    expect(resolveConfigPath(kDefaultConfigPath, dir)).eq(kDefaultConfigPath)
    rmSync(inDir('tealina.config.ts'))
  })

  test('falls back to .js when a JS project has no .ts', () => {
    expect(resolveConfigPath(kDefaultConfigPath, dir)).eq('./tealina.config.js')
    rmSync(inDir('tealina.config.js'))
  })

  test('falls back to .mjs last', () => {
    writeFileSync(inDir('tealina.config.mjs'), 'export default {}\n')
    expect(resolveConfigPath(kDefaultConfigPath, dir)).eq(
      './tealina.config.mjs',
    )
    rmSync(inDir('tealina.config.mjs'))
  })

  test('falls back to the default string when nothing is there', () => {
    expect(resolveConfigPath(kDefaultConfigPath, dir)).eq(kDefaultConfigPath)
  })

  test('never second-guesses a path the caller named', () => {
    writeFileSync(inDir('tealina.config.js'), 'export default {}\n')
    expect(resolveConfigPath('./custom.config.ts', dir)).eq(
      './custom.config.ts',
    )
  })
})
