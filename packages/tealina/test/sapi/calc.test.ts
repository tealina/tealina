import { expect, test } from 'vitest'
import { calcSnapshots } from '../../src/commands/sapi'

const restCtxMock = {
  commonOption: {
    apiDir: '',
    template: {} as any,
    testDir: '',
    tsconfigPath: '',
    typesDir: '',
  },
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

test('sync api in deep', () => {
  const result = calcSnapshots({
    kindIndexFiles: [
      {
        kind: 'post',
        content: [
          '//prettier-ignore',
          'export default {',
          "  'login': import('./user/login'),",
          "  'user/delete': import('./user/delete'),",
          '}',
        ].join('\n'),
        files: ['/user/login.ts', '/user/delete.ts'],
      },
    ],
    suffix: '',
    ...restCtxMock,
  })
  expect(result[0].code).eq(
    [
      '//prettier-ignore',
      'export default {',
      "  'user/delete': import('./user/delete'),",
      "  'user/login': import('./user/login'),",
      '}',
      '',
    ].join('\n'),
  )
})
