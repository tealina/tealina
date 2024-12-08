import { expect, test, vi } from 'vitest'
import { createAxiosClient } from '../../src/index'
import type { MockApi } from '../MockApi'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'

test('get request', async () => {
  const mockResponse = { status: 'fine' }
  const mockRequester = vi.fn().mockResolvedValue({ data: mockResponse })
  axios.request = mockRequester
  const req = createAxiosClient<MockApi, AxiosRequestConfig>(config =>
    axios.request(config).then(v => v.data),
  )
  const res = await req.get('health')
  expect(res).toMatchObject(mockResponse)
  expect(mockRequester).toHaveBeenCalledWith({ method: 'get', url: 'health' })
})

test('post request', async () => {
  const mockBody = { email: 'neo@tealina.dev', name: 'Neo' }
  const mockResponse = { ...mockBody, id: 1 }
  const mockRequester = vi.fn().mockResolvedValue({ data: mockResponse })
  axios.request = mockRequester
  const req = createAxiosClient<MockApi, AxiosRequestConfig>(config =>
    axios.request(config).then(v => v.data),
  )
  const res = await req.post('user/create', {
    body: mockBody,
  })
  expect(res).toMatchObject(mockResponse)
  expect(mockRequester).toHaveBeenCalledWith({
    method: 'post',
    url: 'user/create',
    data: mockBody,
  })
})

test('In route params case', async () => {
  const mockUser = { email: 'neo@tealina.dev', name: 'Neo', id: 'x1' }
  const mockUpdate = { name: 'Neo Yeo' }
  const updatedUser = { ...mockUser, ...mockUpdate }
  const mockRequester = vi.fn().mockResolvedValue({ data: updatedUser })
  axios.request = mockRequester
  const req = createAxiosClient<MockApi, AxiosRequestConfig>(config =>
    axios.request(config).then(v => v.data),
  )
  const res = await req.post('user/:id/update', {
    body: mockUpdate,
    params: { id: mockUser.id },
  })
  expect(res).toMatchObject(updatedUser)
  expect(mockRequester).toHaveBeenCalledWith({
    method: 'post',
    url: `user/${mockUser.id}/update`,
    data: mockUpdate,
  })
})

test('In query case', async () => {
  const mockUser = { email: 'neo@tealina.dev', name: 'Neo', id: 'x1' }
  const mockQuery = { name: 'neo' }
  const mockRequester = vi.fn().mockResolvedValue({ data: mockUser })
  axios.request = mockRequester
  const req = createAxiosClient<MockApi, AxiosRequestConfig>(config =>
    axios.request(config).then(v => v.data),
  )
  const res = await req.get('user', {
    query: mockQuery,
  })
  expect(res).toMatchObject(mockUser)
  expect(mockRequester).toHaveBeenCalledWith({
    method: 'get',
    url: `user?${new URLSearchParams(mockQuery)}`,
  })
})
