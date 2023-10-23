import { test } from 'vitest'
import { workflow } from '../../src/commands/gpure'
const filePath = 'packages/tealina/test/utils/mock/mock.prisma'
test('new gpure', async () => {
  const result = await workflow({
    input: filePath,
    namespace: 'Pure',
    output: 'temp/pure.d.ts',
    typeRemap: t => (t == 'DateTime' ? 'number' : null),
    overwrite: {
      excludeProps: [
        {
          blockName: 'User',
          keyword: 'model',
          kind: 'CreateInput',
          predicate: p => p.name == 'role',
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
})
