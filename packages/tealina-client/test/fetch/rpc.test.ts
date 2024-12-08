import { expect, test, vi } from 'vitest'
import { createFetchRPC } from '../../src/index'
import type { MockApi } from '../MockApi'

test('get request', async () => {
  const mockFetchFn = vi.fn()
  global.fetch = mockFetchFn
  const mockResponse = { status: 'fine' }
  mockFetchFn.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockResponse),
  })
  const req = createFetchRPC<MockApi, RequestInit>(async (url, config) => {
    const response = await fetch(url, config)
    const data = await response.json()
    return data
  })
  const res = await req.get.health()
  expect(res).toMatchObject(mockResponse)
  expect(mockFetchFn).toHaveBeenCalledWith('health', { method: 'get' })
})

test('post request', async () => {
  const mockFetchFn = vi.fn()
  global.fetch = mockFetchFn
  const mockBody = { email: 'neo@tealina.dev', name: 'Neo' }
  const mockResponse = { ...mockBody, id: 1 }
  mockFetchFn.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockResponse),
  })
  const req = createFetchRPC<MockApi, RequestInit>(async (url, config) => {
    const response = await fetch(url, config)
    const data = await response.json()
    return data
  })
  const res = await req.post.user.create({
    body: mockBody,
  })
  expect(res).toMatchObject(mockResponse)
  expect(mockFetchFn).toHaveBeenCalledWith('user/create', {
    method: 'post',
    body: JSON.stringify(mockBody),
  })
})

test('In route params case', async () => {
  const mockFetchFn = vi.fn()
  global.fetch = mockFetchFn
  const mockUser = { email: 'neo@tealina.dev', name: 'Neo', id: 'x1' }
  const mockUpdate = { name: 'Neo Yeo' }
  const updatedUser = { ...mockUser, ...mockUpdate }
  mockFetchFn.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(updatedUser),
  })
  const req = createFetchRPC<MockApi, RequestInit>(async (url, config) => {
    const response = await fetch(url, config)
    const data = await response.json()
    return data
  })
  const res = await req.post.user[':id'].update({
    body: mockUpdate,
    params: { id: mockUser.id },
  })
  expect(res).toMatchObject(updatedUser)
  expect(mockFetchFn).toHaveBeenCalledWith(`user/${mockUser.id}/update`, {
    method: 'post',
    body: JSON.stringify(mockUpdate),
  })
})

test('In query case', async () => {
  const mockFetchFn = vi.fn()
  global.fetch = mockFetchFn
  const mockUser = { email: 'neo@tealina.dev', name: 'Neo', id: 'x1' }
  const mockQuery = { name: 'neo' }
  mockFetchFn.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockUser),
  })
  const req = createFetchRPC<MockApi, RequestInit>(async (url, config) => {
    const response = await fetch(url, config)
    const data = await response.json()
    return data
  })
  const res = await req.get.user({
    query: mockQuery,
  })
  expect(res).toMatchObject(mockUser)
  expect(mockFetchFn).toHaveBeenCalledWith(
    `user?${new URLSearchParams(mockQuery)}`,
    {
      method: 'get',
    },
  )
})
