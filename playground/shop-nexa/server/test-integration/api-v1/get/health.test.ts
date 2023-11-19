import { test, expect } from 'vitest'
import { req } from '../helper.js'

test('api health', async () => {
  const result = await req.get('health')
  expect(result.status).eq(200)
})
