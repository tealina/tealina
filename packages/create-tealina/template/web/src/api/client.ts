import axios, { type AxiosRequestConfig } from 'axios'
import { createAxiosRPC, createAxiosClient } from '@tealina/client'
import type { ApiTypesRecord } from 'server/api/v1'

const instance = axios.create({
  baseURL: '/api/v1/',
})

instance.interceptors.request.use(config => {
  config.headers.Authorization = 'jwt token'
  return config
})

instance.interceptors.response.use(v => v.data)

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
export const rpc = createAxiosRPC<ApiTypesRecord, AxiosRequestConfig>(config =>
  instance.request(config).then(v => v.data),
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
export const req = createAxiosClient<ApiTypesRecord, AxiosRequestConfig>(c =>
  instance.request(c).then(v => v.data),
)

export type TakeGetResponse<Endpoind extends keyof ApiTypesRecord['get']> =
  ApiTypesRecord['get'][Endpoind]['response']

export type TakePostResponse<Endpoind extends keyof ApiTypesRecord['post']> =
  ApiTypesRecord['post'][Endpoind]['response']

export type TakePostBody<Endpoind extends keyof ApiTypesRecord['post']> =
  ApiTypesRecord['post'][Endpoind]['body']
