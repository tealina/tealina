import { notNull } from 'fp-lite'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll } from 'vite-plus/test'
import { cli } from '../../src/commands/index.js'
import { DirInfo } from '../../src/utils/withTypeFile.js'
import { ensureDirSync } from '../../src/utils/fs-extra.js'

export const cleanDir = (root: string) => {
  beforeAll(() => {
    if (!fs.existsSync(root)) return
    fs.rmSync(root, { recursive: true })
  })
  // vitest 4.1 moved the suite task from the 1st argument to the 2nd; the 1st is
  // now the fixtures context, and it has to be destructured even when unused.
  afterAll(({}, suite) => {
    if (
      suite.tasks
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
    // The contract file has one fixed name, so each case needs its own directory: a
    // shared one would make the second case see a file the first one created.
    const typesDir = path.join(root, `${name}-types`)
    const testDir = path.join(root, 'test')
    ensureDirSync(apiDir)
    ensureDirSync(typesDir)
    ensureDirSync(testDir)
    return { apiDir, typesDir, testDir }
  }
}

/**
 * The commands read `apiDir`, `typesDir` and `testDir` from the config, so a test that
 * wants a throwaway tree writes one. It sits beside the api directory and re-exports the
 * fixture config, which keeps `template` and `suffix` coming from the checked-in file.
 */
const writeTempConfig = (dirInfo: DirInfo, configPath: string) => {
  const dir = path.dirname(dirInfo.apiDir)
  const relativePath = path
    .relative(dir, path.resolve(configPath))
    .replace(/\.ts$/, '.js')
  const specifier = relativePath.startsWith('.')
    ? relativePath
    : `./${relativePath}`
  const filePath = path.join(dir, 'tealina.generated.config.ts')
  fs.writeFileSync(
    filePath,
    [
      `import base from '${specifier}'`,
      'export default {',
      '  ...base,',
      `  apiDir: ${JSON.stringify(dirInfo.apiDir)},`,
      `  typesDir: ${JSON.stringify(dirInfo.typesDir)},`,
      `  testDir: ${JSON.stringify(dirInfo.testDir)},`,
      '}',
    ].join('\n'),
  )
  return filePath
}

export function parseCommandArgs(
  command: string,
  dirInfo: DirInfo,
  configPath = 'test/mock/config/tealina.config.ts',
) {
  const generatedConfig = writeTempConfig(dirInfo, configPath)
  const parsedResult = cli.parse(
    [
      '',
      'tealina',
      'create',
      ...command.split(' '),
      ...(command.includes('--no-with-test') ? [] : ['--with-test']),
      '--config-path',
      generatedConfig,
    ],
    { run: false },
  )
  return {
    parsedResult,
    cli,
  }
}
