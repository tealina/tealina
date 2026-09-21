import axios, { type AxiosRequestConfig } from 'axios'
import { createAxiosRPC, createAxiosReq } from '@tealina/client'
import type { ApiTypesForClient } from 'server/api/v1'

const instance = axios.create({
  baseURL: '/api/v1/',
})

instance.interceptors.request.use(config => {
  config.headers.Authorization = 'jwt token'
  return config
})

/**
 * @example
 * ```ts
 *  const user = await rpc.post.user.create({
 *    body:{
 *      email: 'name@example.com'
 *    }
 *  })
 *  console.log(user.id)
 *  ```
 */
export const rpc = createAxiosRPC<ApiTypesForClient, AxiosRequestConfig>(
  config => instance.request(config).then(v => v.data),
)

/**
 * @example
 * ```ts
 *  const user = await req.post('/user/create', {
 *    body:{
 *      email: 'name@example.com'
 *    }
 *  })
 *  console.log(user.id)
 *  ```
 */
export const req = createAxiosReq<ApiTypesForClient, AxiosRequestConfig>(c =>
  instance.request(c).then(v => v.data),
)

export type TakeGetResponse<Endpoind extends keyof ApiTypesForClient['get']> =
  ApiTypesForClient['get'][Endpoind]['response']

export type TakePostResponse<Endpoind extends keyof ApiTypesForClient['post']> =
  ApiTypesForClient['post'][Endpoind]['response']

export type TakePostBody<Endpoind extends keyof ApiTypesForClient['post']> =
  ApiTypesForClient['post'][Endpoind]['body']
