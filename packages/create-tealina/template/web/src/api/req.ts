import axios from 'axios'
import { type MakeReqType, createReq } from './createReq'
import type { ApiTypesRecord } from 'server/api/v1'

const instance = axios.create({
  baseURL: '/api/v1/',
})

instance.interceptors.request.use(config => {
  config.headers.Authorization = 'jwt token'
  return config
})

instance.interceptors.response.use(v => v.data)

export const req = createReq<MakeReqType<ApiTypesRecord>>(instance)

export type TakeGetResponse<Endpoind extends keyof ApiTypesRecord['get']> =
  ApiTypesRecord['get'][Endpoind]['response']

export type TakePostResponse<Endpoind extends keyof ApiTypesRecord['post']> =
  ApiTypesRecord['post'][Endpoind]['response']

export type TakePostBody<Endpoind extends keyof ApiTypesRecord['post']> =
  ApiTypesRecord['post'][Endpoind]['body']
