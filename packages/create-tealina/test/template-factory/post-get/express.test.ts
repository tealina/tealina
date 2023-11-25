import { expect, test } from 'vitest'
import { createTemplates } from '../../../src/template-factory/create'

test('make express post-get templates', async () => {
  const snaps = createTemplates({
    isRestful: false,
    framwork: 'express',
  })
  expect(snaps).toMatchSnapshot()
})
