import { expect, test, vi } from 'vitest'
import type { MockApi } from './MockApi'
import { createReq, createRPC } from '../src/core'

test('could not be enumerate', () => {
  const req = createReq<MockApi, Record<string, unknown>>(() =>
    Promise.resolve(),
  )
  const kvs = Object.entries(req)
  expect(kvs).toHaveLength(0)
  const walk = vi.fn()
  for (const kv in req) {
    walk(kv)
  }
  expect(walk).not.toBeCalled()
})

test('could not be config', () => {
  const req = createReq<MockApi, Record<string, unknown>>(() =>
    Promise.resolve(),
  )
  expect(() => {
    req.get = {} as any
  }).toThrow(TypeError)
})

test('RPC could not be enumerate', () => {
  const req = createRPC<MockApi, Record<string, unknown>>(() =>
    Promise.resolve(),
  )
  const kvs = Object.entries(req)
  expect(kvs).toHaveLength(0)
  const walk = vi.fn()
  for (const kv in req) {
    walk(kv)
  }
  expect(walk).not.toBeCalled()
})

test('RPC could not be config', () => {
  const req = createRPC<MockApi, Record<string, unknown>>(() =>
    Promise.resolve(),
  )
  expect(() => {
    req.get = {} as any
  }).toThrow(TypeError)
})
