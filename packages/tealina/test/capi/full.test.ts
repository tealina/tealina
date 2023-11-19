import { map, pipe, unique } from 'fp-lite'
import { writeFileSync } from 'fs'
import fs from 'fs-extra'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { ensureWrite } from '../../src/utils/tool.js'
import { cleanDir, parseCommandArgs, tempDirFactory } from './helper.js'
import { getApiTypeFilePath } from '../../src/utils/withTypeFile.js'
import { Snapshot } from '../../src/utils/effectFiles.js'

const TEMP_ROOT = 'temp/capi'
const prepareTempDir = tempDirFactory('temp/capi')
describe('full test cai', () => {
  cleanDir(TEMP_ROOT)
  test('create by route', async () => {
    const dirInfo = prepareTempDir('by-route')
    const route = 'get/health'
    ensureWrite(path.join(dirInfo.apiDir, route), 'mock content')
    const { cli } = parseCommandArgs('get/health', dirInfo)
    await cli.runMatchedCommand()
  })

  test('create with alias', async () => {
    const name = 'user'
    const dirInfo = prepareTempDir('byalias')
    const alias = `cr`
    const seeds = [
      { name: '', method: 'post' },
      { name: '', method: 'get' },
    ]
    const { cli } = parseCommandArgs(`${name} ${alias}`, dirInfo)
    const result = await cli.runMatchedCommand()
    const fullResult = makeFullResult(name, seeds, dirInfo)
    expect(result).deep.eq(fullResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test('create with alias (post style)', async () => {
    const name = 'user'
    const alias = 'cr'
    const dirInfo = prepareTempDir('alias-post-style')
    const { cli } = parseCommandArgs(
      [name, alias].join(' '),
      dirInfo,
      'test/mock/config/tealina.fnconfig.ts',
    )
    const result = await cli.runMatchedCommand()
    const fullResult = makeFullResult(
      name,
      [
        { name: 'create', method: 'post' },
        { name: 'getList', method: 'post' },
      ],
      dirInfo,
    )
    expect(result).deep.eq(fullResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test('only pass name option', async () => {
    const route = 'fruit'
    const dirInfo = prepareTempDir('name-option')
    const { cli } = parseCommandArgs(route, dirInfo)
    const result = await cli.runMatchedCommand()
    const fullResult = makeFullResult(
      route,
      [{ name: '', method: 'post' }],
      dirInfo,
    )
    expect(result).deep.eq(fullResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test('defult is post', async () => {
    const route = 'book/getList'
    const dirInfo = prepareTempDir('default')
    const { cli } = parseCommandArgs(route, dirInfo)
    const result = await cli.runMatchedCommand()
    const fullResult = makeFullResult(
      route,
      [{ name: '', method: 'post' }],
      dirInfo,
    )
    expect(result).deep.eq(fullResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test('no thing change when duplicate run', async () => {
    const route = 'book/read'
    const dirInfo = prepareTempDir('nothing-change')
    const { cli } = parseCommandArgs(route, dirInfo)
    const result = await cli.runMatchedCommand()
    const result2 = await cli.runMatchedCommand()
    const fullResult = makeFullResult(
      route,
      [{ name: '', method: 'post' }],
      dirInfo,
    )
    expect(result).deep.eq(fullResult)
    expect(result2).is.empty
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test('begin with http method', async () => {
    const method = 'get'
    const name = 'health'
    const route = [method, name].join('/')
    const dirInfo = prepareTempDir('begin-http')
    const { cli } = parseCommandArgs(route, dirInfo)
    const result = await cli.runMatchedCommand()
    const fullResult = makeFullResult(name, [{ method, name: '' }], dirInfo)
    expect(result).deep.eq(fullResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test('with route params', async () => {
    const method = 'get'
    const name = 'user/[id]'
    const route = [method, name].join('/')
    const dirInfo = prepareTempDir('route-params')
    const { cli } = parseCommandArgs(route, dirInfo)
    const result = await cli.runMatchedCommand()
    const fullResult = makeFullResult(name, [{ method, name: '' }], dirInfo)
    expect(result).deep.eq(fullResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test.only('auto transform :id to [id]', async () => {
    const method = 'get'
    const name = 'user/:id'
    const route = [method, name].join('/')
    const dirInfo = prepareTempDir('route-params')
    const { cli } = parseCommandArgs(route, dirInfo)
    const result = await cli.runMatchedCommand()
    const fullResult = makeFullResult(
      'user/[id]',
      [{ method, name: '' }],
      dirInfo,
    )
    console.log(fullResult)
    expect(result).deep.eq(fullResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test('batch create by parse prisma schema', async () => {
    const alias = 'crud'
    const dirInfo = prepareTempDir('by-model')
    const mockModelNames = ['Student', 'Teacher']
    const schema = path.join(TEMP_ROOT, 'temp.prisma')
    writeFileSync(
      schema,
      mockModelNames
        .map(name => [`model ${name} {`, '   prop Type', '}'])
        .flat()
        .join('\n'),
    )
    const { cli } = parseCommandArgs(
      `--by-model -t ${alias} --schema ${schema}`,
      dirInfo,
    )
    const result = await cli.runMatchedCommand()
    //prettier-ignore
    const seeds = [
      { method: 'post', name: '',  },
      { method: 'get', name: '',  },
      { method: 'put', name: '[id]', },
      { method: 'delete', name: '[id]', },
    ]
    const fullResult = makeFullResult(
      mockModelNames.map(v => v.toLowerCase()),
      seeds,
      dirInfo,
    )
    expect(result).deep.eq(fullResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })

  test('not overwrite if api or test file exists', async () => {
    const method = 'get'
    const route = 'health'
    const dirInfo = prepareTempDir('not-overwrite')
    const { apiDir } = dirInfo
    const mockContent = 'handler'
    const target = path.join(apiDir, method, `${route}.ts`)
    ensureWrite(target, mockContent)
    const { cli } = parseCommandArgs([method, route].join('/'), dirInfo)
    const result = await cli.runMatchedCommand()
    const actual = fs.readFileSync(target).toString()
    expect(actual).eq(mockContent)
    const fullResult = makeFullResult(route, [{ method, name: '' }], dirInfo)
    const actualResult = fullResult.filter(
      v => !(v.group == 'api' && v.filePath == target),
    )
    expect(result).deep.eq(actualResult)
    fs.rmSync(dirInfo.apiDir, { recursive: true })
  })
})

function makeFullResult(
  route: string | string[],
  seeds: { method: string; name: string }[],
  dirInfo: ReturnType<typeof prepareTempDir>,
) {
  const { apiDir, typesDir, testDir } = dirInfo
  const topIndex: Snapshot = {
    group: 'api',
    action: 'create',
    filePath: path.join(apiDir, `index.ts`),
  }
  const indexList = pipe(
    seeds,
    map(v => v.method),
    unique,
    map(
      (method): Snapshot => ({
        group: 'api',
        action: 'create',
        filePath: path.join(apiDir, method, `index.ts`),
      }),
    ),
  )
  const preNames = [route].flat()
  const handlerList = preNames.map(preName =>
    seeds.map(
      (v): Snapshot => ({
        group: 'api',
        action: 'create',
        filePath: path.join(
          apiDir,
          v.method,
          v.name.length ? `${preName}/${v.name}.ts` : `${preName}.ts`,
        ),
      }),
    ),
  )
  const testList = preNames.map(preName =>
    seeds.map(
      (v): Snapshot => ({
        group: 'test',
        action: 'create',
        filePath: path.join(
          testDir,
          path.basename(apiDir),
          v.method,
          v.name.length ? `${preName}/${v.name}.test.ts` : `${preName}.test.ts`,
        ),
      }),
    ),
  )
  const typeFile: Snapshot = {
    group: 'types',
    action: 'create',
    filePath: path.join(getApiTypeFilePath({ typesDir, apiDir })),
    // filePath: path.join(apiTypesDir, `${path.basename(apiDir)}.ts`),
  }
  const testHelper: Snapshot = {
    group: 'test',
    action: 'create',
    filePath: path.join(testDir, path.basename(apiDir), 'helper.ts'),
  }
  const fullResult: Snapshot[] = [
    topIndex,
    ...indexList,
    ...handlerList.flat(),
    ...testList.flat(),
    testHelper,
    typeFile,
  ]
  return fullResult
}
