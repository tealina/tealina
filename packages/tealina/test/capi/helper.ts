import { notNull } from 'fp-lite'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll } from 'vitest'
import { cli } from '../../src/commands/index.js'
import { DirInfo } from '../../src/utils/withTypeFile.js'
import { ensureDirSync } from '../../src/utils/fs-extra.js'

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
  return (name: string): DirInfo => {
    const apiDir = path.join(root, name)
    const typesDir = path.join(root, 'types')
    const testDir = path.join(root, 'test')
    ensureDirSync(apiDir)
    ensureDirSync(typesDir)
    ensureDirSync(testDir)
    return { apiDir, typesDir, testDir }
  }
}

export function parseCommandArgs(
  command: string,
  dirInfo: DirInfo,
  configPath = 'test/mock/config/tealina.config.ts',
) {
  cli.option('--types-dir', '', { default: dirInfo.typesDir })
  cli.option('--test-dir', '', { default: dirInfo.testDir })
  cli.option('--tsconfig-path', '')
  const parsedResult = cli.parse(
    [
      '',
      'tealina',
      dirInfo.apiDir,
      ...command.split(' '),
      ...(command.includes('--no-with-test') ? [] : ['--with-test']),
      '--config-path',
      configPath,
    ],
    { run: false },
  )
  return {
    parsedResult,
    cli,
  }
}
