import { expect, test } from 'vitest'
import { createTemplates } from '../../../src/template-factory/create'

test('make fastify post-get templates', async () => {
  const snaps = createTemplates({
    isRestful: false,
    framwork: 'fastify',
  })
  expect(snaps).toMatchSnapshot()
})
