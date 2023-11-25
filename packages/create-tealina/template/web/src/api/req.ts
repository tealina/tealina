import axios from 'axios'
import { ApiTypesRecord } from 'server/api/v1'
import { MakeReqType, createReq } from './createReq'

const instance = axios.create({
  baseURL: '/api/v1/',
})
instance.interceptors.response.use(v => v.data)

export const req = createReq<MakeReqType<ApiTypesRecord>>(instance)

export type TakeGetResponse<Endpoind extends keyof ApiTypesRecord['get']> =
  ApiTypesRecord['get'][Endpoind]['response']

export type TakePostResponse<Endpoind extends keyof ApiTypesRecord['post']> =
  ApiTypesRecord['post'][Endpoind]['response']

export type TakePostBody<Endpoind extends keyof ApiTypesRecord['post']> =
  ApiTypesRecord['post'][Endpoind]['body']
