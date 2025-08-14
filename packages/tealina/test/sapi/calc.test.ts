import { expect, test } from 'vitest'
import { calcSnapshots } from '../../src/commands/sapi'

const restCtxMock = {
  options: { apiDir: '', typesDir: '', testDir: '' },
  topIndexFile: {
    content: '',
    files: [],
    kind: '',
  },
  typeFileInfo: {
    filePath: '',
    isExists: true,
  },
}
test('top index', () => {
  const result = calcSnapshots({
    kindIndexFiles: [],
    ...restCtxMock,
    topIndexFile: {
      content: '',
      files: ['/post/index.ts', '/get/index.ts'],
      kind: '',
    },
    suffix: '.js',
  })
  const code =
    'export default {\n' +
    "  'get': import('./get/index.js'),\n" +
    "  'post': import('./post/index.js'),\n" +
    '}\n'
  expect(result[0].code).eq(code)
})

test('sync api in deep', () => {
  const result = calcSnapshots({
    kindIndexFiles: [
      {
        kind: 'post',
        content: [
          'export default {',
          "  '/login': import('./user/login.js'),",
          "  '/user/delete': import('./user/delete.js'),",
          '}',
        ].join('\n'),
        files: ['/user/login.ts', '/user/delete.ts'],
      },
    ],
    ...restCtxMock,
    suffix: '.js',
  })
  expect(result[0].code).eq(
    [
      'export default {',
      "  '/user/delete': import('./user/delete.js'),",
      "  '/user/login': import('./user/login.js'),",
      '}',
      '',
    ].join('\n'),
  )
})

test('sync api work other suffix, eg: tsx, mts', () => {
  const result = calcSnapshots({
    kindIndexFiles: [
      {
        kind: 'post',
        content: [
          'export default {',
          "  '/user/delete': import('./user/delete.js'),",
          "  '/user/login': import('./user/login.js'),",
          '}',
        ].join('\n'),
        files: ['/page/pdf.tsx', '/user/delete.mts'],
      },
    ],
    ...restCtxMock,
    suffix: '.js',
  })
  expect(result[0].code).eq(
    [
      'export default {',
      "  '/page/pdf': import('./page/pdf.js'),",
      "  '/user/delete': import('./user/delete.js'),",
      '}',
      '',
    ].join('\n'),
  )
})
