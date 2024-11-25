import { expect, test } from 'vitest'
import { createRPC } from '../src/createRPC'
import type { AxiosRequestConfig } from 'axios'
import type { MockApi } from './MockApi'

test('RPC client basic', async () => {
  // 使用示例
  let inside: Partial<Record<'payload' | 'config', unknown>> = {}
  const client = createRPC<MockApi, AxiosRequestConfig>((payload, config) => {
    inside = { payload, config }
    return Promise.resolve({ id: 'id_d', ...(payload.body as any) })
  })
  const body = { email: 'neo@tealina.dev', name: 'Neo Yeo' }
  const config: AxiosRequestConfig = { headers: { Authorization: 'token' } }
  const output = await client.post.user.create(
    {
      body,
    },
    config,
  )
  expect(output).toMatchObject(body)
  expect(inside.payload).deep.eq({
    body,
    method: 'post',
    url: 'user/create',
    params: void 0,
  })
  expect(inside.config).deep.eq(config)
})

test('Named params', async () => {
  // 使用示例
  let inside: Partial<Record<'payload' | 'config', unknown>> = {}
  const client = createRPC<MockApi, AxiosRequestConfig>((payload, config) => {
    inside = { payload, config }
    return Promise.resolve({ id: 'id_b', ...(payload.body as any) })
  })
  const body = { email: 'neo@tealina.dev', name: 'Neo Yeo' }
  const config: AxiosRequestConfig = { headers: { Authorization: 'token' } }
  const params = { id: 'id_b' }
  const output = await client.post.user[':id'].update(
    {
      params,
      body,
    },
    config,
  )
  expect(output).toMatchObject(body)
  expect(inside.payload).deep.eq({
    body,
    method: 'post',
    url: `user/${params.id}/create`,
    params: params,
  })
  expect(inside.config).deep.eq(config)
})
