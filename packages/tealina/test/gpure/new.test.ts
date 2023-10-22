import { test } from 'vitest'
import { workFlow } from '../../src/commands/gpure-new'
import { writeFile } from 'fs/promises'
const filePath = 'packages/tealina/test/utils/mock/mock.prisma'
test('new gpure', async () => {
  const result = await workFlow(filePath)
  await writeFile('temp/pure.d.ts', result)
})
