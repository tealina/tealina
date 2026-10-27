import { expect, test, vi } from 'vite-plus/test'
import { createFetchClient, type ShapeWitness } from '../../src/index'
import type { MockApi } from '../MockApi'

// The witness is read as a type and never as a value: a JavaScript caller hands the
// factory a `ShapeWitness<ApiTypes>` that is `undefined` at runtime, purely to give
// the shape type parameter somewhere to be inferred from. This guards that half. The
// other half — that it really does pin the projection — needs a JavaScript caller compiled
// against a server's exported types, which this package cannot produce on its own.
test('a shape witness is inert', async () => {
  const mockFetchFn = vi.fn()
  globalThis.fetch = mockFetchFn
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
  expect(mockFetchFn).toHaveBeenCalledWith('/health', { method: 'get' })
})
