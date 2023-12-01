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
    '//prettier-ignore\n' +
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
          '//prettier-ignore',
          'export default {',
          "  'login': import('./user/login.js'),",
          "  'user/delete': import('./user/delete.js'),",
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
      '//prettier-ignore',
      'export default {',
      "  'user/delete': import('./user/delete.js'),",
      "  'user/login': import('./user/login.js'),",
      '}',
      '',
    ].join('\n'),
  )
})
