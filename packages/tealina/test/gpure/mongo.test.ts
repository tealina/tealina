import { expect, test } from 'vitest'
import { workflow } from '../../src/commands/gpure'

test('mongo database has composite type', async () => {
  const result = await workflow('test/utils/mock/mongo.prisma', {
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
