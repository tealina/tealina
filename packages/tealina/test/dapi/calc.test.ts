import { describe, expect, test } from 'vitest'
import {
  Seeds,
  getApiFilePath,
  getTestFilePath,
  getTestHeplerPath,
  parseByAlias,
  parseByRoute,
} from '../../src/commands/capi.js'
import { calcSnapshots } from '../../src/commands/dapi.js'
import { DirInfo } from '../../src/utils/withTypeFile.js'
import { FuncTemplates } from '../mock/config/funcCRUD.js'
import { RestfulCRUD } from '../mock/config/restfulCRUD.js'
import { cli } from '../../src/commands/index.js'

describe('test dapi calculation part', function () {
  const dirInfo: DirInfo = {
    apiDir: '',
    testDir: '',
    typesDir: '',
  }
  const typeFileInfo = {
    filePath: '',
    isExists: true,
  }
  const restCtx = {
    testHelperInfo: {
      filePath: getTestHeplerPath(dirInfo),
      isExists: false,
    },
    testTemplate: {
      genHelper: (x: any) => 'test helper',
      genSuite: (x: any) => 'test suite',
    },
  }
  const withFileSummary = (v: Seeds) => ({
    ...v,
    apiFileSummary: { filePath: getApiFilePath(dirInfo, v), isExists: false },
    testFileSummary: { filePath: getTestFilePath(dirInfo, v), isExists: false },
  })

  test(': user crud, effect all relative files', () => {
    const seeds = parseByAlias(['user'], RestfulCRUD, 'crud').map(
      withFileSummary,
    )
    const snapshots = calcSnapshots({
      seeds,
      kindIndexContentMap: new Map([]),
      topIndexContent: [
        "  'post': import('./post/index.js'),",
        "  'get': import('./get/index.js'),",
        "  'put': import('./put/index.js'),",
        "  'delete': import('./delete/index.js'),",
      ],
      typeFileInfo,
      commonOption: { ...dirInfo, withTest: true } as any,
      ...restCtx,
    })
    const newFiles = [
      'index.ts',
      'post/index.ts',
      'get/index.ts',
      'put/index.ts',
      'delete/index.ts',

      'post/user.ts',
      'get/user.ts',
      'put/user/[id].ts',
      'delete/user/[id].ts',

      'post/user.test.ts',
      'get/user.test.ts',
      'put/user/[id].test.ts',
      'delete/user/[id].test.ts',
    ]
    expect(snapshots.length).eq(newFiles.length)
    const [topIndex] = snapshots
    expect(topIndex.action).eq('updated')
    const allMatched = newFiles.every(n => snapshots.some(s => s.filePath == n))
    expect(allMatched, 'should delete all files when api dir is empty').true
  })

  test(': role cr, remove partial', () => {
    const snapshots = calcSnapshots({
      seeds: parseByAlias(['role'], FuncTemplates, 'cr').map(withFileSummary),
      kindIndexContentMap: new Map([
        [
          'post',
          [
            "  'role/create': import('./role/create.js'),",
            "  'role/getList': import('./role/getList.js'),",
            "  'other/action': import('./other/action.js'),",
          ],
        ],
      ]),
      topIndexContent: [],
      typeFileInfo,
      commonOption: dirInfo as any,
      ...restCtx,
    })
    const [postIndex, ...deletions] = snapshots
    expect(postIndex.action).eq('updated')
    const allActionIsDeleted = deletions.every(s => s.action == 'deleted')
    expect(allActionIsDeleted).true
  })

  test(': student -t crud, with expicity -t option', () => {
    const snapshots = calcSnapshots({
      seeds: parseByAlias(['student'], FuncTemplates, 'crud').map(
        withFileSummary,
      ),
      kindIndexContentMap: new Map([]),
      topIndexContent: [],
      typeFileInfo,
      commonOption: { ...dirInfo, withTest: true } as any,
      ...restCtx,
    })
    const newFiles = [
      'index.ts',
      'post/index.ts',
      'post/student/create.ts',
      'post/student/getList.ts',
      'post/student/update.ts',
      'post/student/delete.ts',

      'post/student/create.test.ts',
      'post/student/getList.test.ts',
      'post/student/update.test.ts',
      'post/student/delete.test.ts',
    ]
    expect(snapshots.length).eq(newFiles.length)
    const [topIndexSnapshot, ...deletions] = snapshots
    expect(topIndexSnapshot.action).eq('updated')
    const allActionIsDeleted = deletions.every(s => s.action == 'deleted')
    expect(allActionIsDeleted).true
  })

  test(': put/user/[id], remove last one in "put" dir', () => {
    const route = 'put/user/[id]'
    const snapshots = calcSnapshots({
      seeds: [parseByRoute(route, RestfulCRUD)].map(withFileSummary),
      kindIndexContentMap: new Map([
        ['get', ["  'user': import('./user.js'),"]],
        ['put', ["  'user/:id/': import('./user/[id].js'),"]],
        ['post', ["  'user': import('./user.js'),"]],
      ]),
      topIndexContent: [
        "  'get': import('./get/index.js'),",
        "  'put': import('./put/index.js'),",
        "  'post': import('./post/index.js'),",
      ],
      typeFileInfo,
      commonOption: { ...dirInfo, withTest: true } as any,
      ...restCtx,
    })
    const [apiIndex, putIndex, apiHandler] = snapshots
    expect(snapshots.some(v => v.group == 'test')).true
    expect(apiIndex.action).eq('updated')
    expect(putIndex.action).eq('deleted')
    expect(apiHandler.action).eq('deleted')
    expect(apiHandler.filePath).eq('put/user/[id].ts')
  })

  test('mean to skip test', () => {
    const withOtherFileSummary = (v: Seeds) => ({
      ...v,
      apiFileSummary: {
        filePath: getApiFilePath(dirInfo, v),
        isExists: false,
      },
      testFileSummary: {
        filePath: getTestFilePath(dirInfo, v),
        isExists: true,
      },
    })
    const route = 'put/user/[id]'
    const snapshots = calcSnapshots({
      seeds: [parseByRoute(route, RestfulCRUD)].map(withOtherFileSummary),
      kindIndexContentMap: new Map([
        ['get', ["  'user': import('./user.js'),"]],
        ['put', ["  'user/:id/': import('./user/[id].js'),"]],
        ['post', ["  'user': import('./user.js'),"]],
      ]),
      topIndexContent: [
        "  'get': import('./get/index.js'),",
        "  'put': import('./put/index.js'),",
        "  'post': import('./post/index.js'),",
      ],
      typeFileInfo,
      commonOption: { ...dirInfo, withTest: false } as any,
      ...restCtx,
    })
    expect(snapshots.some(v => v.group == 'test')).false
    const [apiIndex, putIndex, apiHandler] = snapshots
    expect(apiIndex.action).eq('updated')
    expect(putIndex.action).eq('deleted')
    expect(apiHandler.action).eq('deleted')
    expect(apiHandler.filePath).eq('put/user/[id].ts')
  })
})

test('--by-model not acceptable', () => {
  cli.parse(['', 'tealina', 'dapi', '--by-model'], {
    run: false,
  })
  let hasErr = false
  try {
    cli.runMatchedCommand()
  } catch (error) {
    hasErr = true
    expect(String(error)).includes('Unknown option `--byModel`')
  }
  expect(hasErr).true
})
