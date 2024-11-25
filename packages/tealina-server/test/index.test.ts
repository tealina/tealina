import { expect, test } from 'vitest'
import { loadAPIs, transformToRouteOptions } from '../src/index.js'

test('load and transform APIs', async () => {
  type Handler1 = (x: string) => string
  type Handler2 = (x: number) => number
  type MockHandler = Handler1 | Handler2
  const getStutas = (x: string): string => 'fine'
  const createUer = (x: number) => 200
  const apiRecords = await loadAPIs({
    get: Promise.resolve({
      default: {
        status: Promise.resolve({ default: getStutas }),
      },
    }),
    post: Promise.resolve({
      default: {
        'user/create': Promise.resolve({ default: createUer }),
      },
    }),
  })

  expect(apiRecords).toMatchObject({
    get: { status: getStutas },
    post: { 'user/create': createUer },
  })
  const options = transformToRouteOptions<MockHandler>(apiRecords)
  expect(options).deep.eq([
    { method: 'get', url: 'status', handler: getStutas },
    { method: 'post', url: 'user/create', handler: createUer },
  ])
})

test('test smart reorder', async () => {
  type MockHandler = (x: string) => string
  const mockHandler = (x: string) => 'mock'
  const apiRecords = await loadAPIs({
    post: Promise.resolve({
      default: {
        'user/create': Promise.resolve({ default: mockHandler }),
        'user/:id/update': Promise.resolve({ default: mockHandler }),
        'user/:id/address/:phone': Promise.resolve({ default: mockHandler }),
        'user/self/changePassword': Promise.resolve({ default: mockHandler }),
      },
    }),
  })
  expect(apiRecords).toMatchObject({
    post: { 'user/create': mockHandler },
  })
  const options = transformToRouteOptions<MockHandler>(apiRecords)
  expect(options).deep.eq([
    { method: 'post', url: 'user/self/changePassword', handler: mockHandler }, //more slash first
    { method: 'post', url: 'user/create', handler: mockHandler }, //no params first
    { method: 'post', url: 'user/:id/address/:phone', handler: mockHandler },
    { method: 'post', url: 'user/:id/update', handler: mockHandler },
  ])
})
