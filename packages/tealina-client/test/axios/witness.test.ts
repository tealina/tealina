import { expect, test, vi } from 'vitest'
import { createAxiosReq, type ShapeWitness } from '../../src/index'
import type { MockApi } from '../MockApi'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'

// See test/fetch/witness.test.ts. The axios side builds its config through a
// different handler, so it gets its own guard.
test('a shape witness is inert', async () => {
  const mockResponse = { status: 'fine' }
  const mockRequester = vi.fn().mockResolvedValue({ data: mockResponse })
  axios.request = mockRequester

  const witness = undefined as ShapeWitness<MockApi>
  const req = createAxiosReq<MockApi, AxiosRequestConfig>(
    config => axios.request(config).then(v => v.data),
    witness,
  )

  const res = await req.get('health')
  expect(res).toMatchObject(mockResponse)
  expect(mockRequester).toHaveBeenCalledWith({ method: 'get', url: 'health' })
})
