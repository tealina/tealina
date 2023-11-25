import { expect, test } from 'vitest'
import { createTemplates } from '../../../src/template-factory/create'

test('make express restful templates', async () => {
  const snaps = createTemplates({
    isRestful: true,
    framwork: 'express',
  })
  expect(snaps).toMatchSnapshot()
})
