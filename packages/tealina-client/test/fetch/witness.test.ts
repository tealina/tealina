import { expect, test, vi } from 'vitest'
import { createFetchClient, type ShapeWitness } from '../../src/index'
import type { MockApi } from '../MockApi'

// The witness is read as a type and never as a value: a JavaScript caller hands the
// factory a `ShapeWitness<ApiTypes>` that is `undefined` at runtime, purely to give
// the shape type parameter somewhere to be inferred from. This guards that half. The
// other half — that it really does pin the projection — can only be shown where a
// JavaScript tree is compiled against a server's exported types, which is what the
// generated `web` package in create-tealina-lite is for.
test('a shape witness is inert', async () => {
  const mockFetchFn = vi.fn()
  global.fetch = mockFetchFn
  mockFetchFn.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ status: 'fine' }),
  })

  const witness = undefined as ShapeWitness<MockApi>
  const req = createFetchClient<MockApi, RequestInit>(async (url, config) => {
    const response = await fetch(url, config)
    const data = await response.json()
    return data
  }, witness)

  const res = await req.get('health')
  expect(res).toMatchObject({ status: 'fine' })
  expect(mockFetchFn).toHaveBeenCalledWith('health', { method: 'get' })
})
