import { notNull } from 'fp-lite'
import fs from 'fs-extra'
import path from 'node:path'
import { afterAll, beforeAll } from 'vitest'
import { BaseOption } from '../../src/core/capi.js'
import { cli } from '../../src/command/index.js'

export const cleanDir = (root: string) => {
  beforeAll(() => {
    if (!fs.existsSync(root)) return
    fs.rmSync(root, { recursive: true })
  })
  afterAll(x => {
    if (
      x.tasks
        .map(v => v.result?.state)
        .filter(notNull)
        .every(v => v != 'fail')
    ) {
      fs.rmSync(root, { recursive: true })
    }
  })
}

export function tempDirFactory(root: string) {
  return (name: string) => {
    const apiDir = path.join(root, name)
    const apiTypesDir = path.join(root, 'types')
    const apiTestDir = path.join(root, 'test')
    fs.ensureDirSync(apiDir)
    fs.ensureDirSync(apiTypesDir)
    fs.ensureDirSync(apiTestDir)
    return { apiDir, apiTypesDir, apiTestDir }
  }
}

export function parseCommandArgsOld(
  command: string,
  dirInfo: Record<'apiDir' | 'apiTypesDir' | 'apiTestDir', string>,
  configPath = 'packages/tealina/test/mock/config/tealina.config.ts',
) {
  cli.option('--types-dir', '', { default: dirInfo.apiTypesDir })
  cli.option('--test-dir', '', { default: dirInfo.apiTestDir })
  const { args, options } = cli.parse(
    [
      '',
      'tealina',
      'capi',
      ...command.split(' '),
      ...(command.includes('--no-with-test') ? [] : ['--with-test']),
      '--api-dir',
      dirInfo.apiDir,
      '--config-path',
      configPath,
    ],
    { run: false },
  )
  return [...args, options] as
    | [string | undefined, string | undefined, BaseOption]
    | [string | undefined, BaseOption]
    | [BaseOption]
}
export function parseCommandArgs(
  command: string,
  dirInfo: Record<'apiDir' | 'apiTypesDir' | 'apiTestDir', string>,
  configPath = 'packages/tealina/test/mock/config/tealina.config.ts',
) {
  cli.option('--types-dir', '', { default: dirInfo.apiTypesDir })
  cli.option('--test-dir', '', { default: dirInfo.apiTestDir })
  const parsedResult = cli.parse(
    [
      '',
      'tealina',
      'capi',
      ...command.split(' '),
      ...(command.includes('--no-with-test') ? [] : ['--with-test']),
      '--api-dir',
      dirInfo.apiDir,
      '--config-path',
      configPath,
    ],
    { run: false },
  )
  return { parsedResult, cli }
}
