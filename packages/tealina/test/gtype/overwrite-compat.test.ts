import { expect, test } from 'vite-plus/test'
import type { MatchForTypeTransform } from '../../src'
import { workflow } from '../../src/commands/gtype'

/**
 * `transofrmType` is the old spelling of `transformType`, read only for configuration files
 * written before the rename. Every other gtype test uses the new key, so nothing else here
 * would notice if the old one quietly stopped being read.
 *
 * The deprecation warning is deduplicated per process, so this asserts the output only:
 * counting warnings would make the test depend on which test ran first.
 */
test('the deprecated transofrmType key still transforms', async () => {
  const matches: MatchForTypeTransform[] = [
    {
      blockName: 'User',
      keyword: 'model',
      kind: 'CreateInput',
      transform: () => 'Date',
    },
  ]
  const withoutOverwrite = await workflow('test/utils/mock/mock.prisma', {})
  const oldKey = await workflow('test/utils/mock/mock.prisma', {
    overwrite: { transofrmType: matches },
  })
  const newKey = await workflow('test/utils/mock/mock.prisma', {
    overwrite: { transformType: matches },
  })
  // Without the first assertion, a key that was ignored altogether would pass the second.
  // Joined because `.eq` is identity: two distinct arrays would never be equal.
  const without = withoutOverwrite.join('\n')
  const withOld = oldKey.join('\n')
  expect(withOld).not.eq(without)
  expect(withOld).eq(newKey.join('\n'))
})
