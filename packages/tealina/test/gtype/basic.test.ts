import { expect, test } from 'vitest'
import { workflow } from '../../src/commands/gtype'

test('relation database', async () => {
  const result = await workflow('test/utils/mock/mock.prisma', {
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
      isOptional: [
        {
          blockName: 'User',
          keyword: 'model',
          kind: 'CreateInput',
          predicate: p => p.name == 'email',
        },
      ],
    },
  })
  expect(result).matchSnapshot()
})
