import { expect, test } from 'vitest'
import { loopParse } from '../../src/commands/gtype'

test('mongo database has composite type', async () => {
  const result = await loopParse('test/utils/mock/multiFiles', {
    typeRemap: t => (t == 'DateTime' ? 'number' : null),
    overwrite: {
      excludeProps: [
        {
          blockName: '*',
          keyword: 'model',
          kind: 'CreateInput',
          predicate: p => p.name == 'id',
        },
      ],
    },
  })
  expect(result).matchSnapshot()
})
