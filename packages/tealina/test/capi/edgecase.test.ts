import { describe, expect, test } from 'vitest'
import { BaseOption } from '../../src/core/capi.js'
import { Snapshot } from '../../src/utils/effectFiles.js'
import { cleanDir, parseCommandArgs, tempDirFactory } from './helper.js'

const TEMP_ROOT = 'temp/capi-edge'
const prepareTempDir = tempDirFactory(TEMP_ROOT)

describe('test capi edgecase', () => {
  cleanDir(TEMP_ROOT)

  test('no route input will fail', async () => {
    const dirInfo = prepareTempDir('no-route')
    const { cli } = parseCommandArgs('', dirInfo)

    await cli.runMatchedCommand().catch((e: any) => {
      expect(String(e)).includes('Route is required')
    })
  })

  test('use by-model flag without alias will fail', async () => {
    const dirInfo = prepareTempDir('by-model')
    const { cli } = parseCommandArgs('--by-model', dirInfo)
    await cli.runMatchedCommand().catch((e: any) => {
      expect(String(e)).includes('Missing template alias,')
    })
  })

  test('use default template when no fallback alias', async () => {
    const dirInfo = prepareTempDir('no-fallback-alias')
    const { cli } = parseCommandArgs(
      'get/health',
      dirInfo,
      'packages/tealina/test/mock/config/edgecase.config.ts',
    )
    const x = await cli.runMatchedCommand()
  })

  test('not use --with-test flag', async () => {
    const dirInfo = prepareTempDir('no-test')
    const { parsedResult, cli } = parseCommandArgs(
      'get/some --no-with-test',
      dirInfo,
    )
    expect((parsedResult.options as BaseOption).withTest).false
    const result: Snapshot[] = await cli.runMatchedCommand()
    expect(result.some(v => v.group == 'test')).false
  })

  test('error cache on real run', async () => {
    const dirInfo = prepareTempDir('miss-template')
    const { cli } = parseCommandArgs('--by-model', dirInfo)
    try {
      await cli.runMatchedCommand()
    } catch (error) {
      expect(String(error)).includes('Missing template alias')
    }
  })
})
