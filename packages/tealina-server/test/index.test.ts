import { test } from 'vitest'
import { loadAPIs } from '../src/index.js'
test('load APIs', async () => {
  type Handler1 = (x: string) => string
  type Handler2 = (x: number) => number
  type MockHandler = Handler1 | Handler2
  loadAPIs<MockHandler>({
    get: {
      health: Promise.resolve({ default: (x: string): string => 'hello' }),
    },
    post: {
      'user/create': Promise.resolve({ default: (x: number) => 200 }),
    },
  })
})
