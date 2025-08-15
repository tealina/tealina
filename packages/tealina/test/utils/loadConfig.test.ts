import path from 'node:path'
import { expect, test } from 'vitest'
import { loadConfigFromPath } from '../../src/utils/tool'
import mockConfig from './mock/mock.config'

test('load .ts config', async () => {
  const configPath = 'test/utils/mock/mock.config.ts'
  console.log(path.resolve(configPath))
  console.log(performance.now())
  const config = await loadConfigFromPath(path.resolve(configPath))
  console.log(performance.now())
  expect(JSON.stringify(config)).toEqual(JSON.stringify(mockConfig))
})
