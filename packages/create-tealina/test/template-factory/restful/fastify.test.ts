import { expect, test } from 'vitest'
import { createTemplates } from '../../../src/template-factory/create'

test('make fastify restful templates', async () => {
  const snpas = createTemplates({
    isRestful: true,
    framwork: 'fastify',
  })
  expect(snpas).toMatchSnapshot()
})
