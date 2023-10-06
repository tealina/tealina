import { createReq } from './createReq'
import { ApiTypesRecord } from 'server/api/v1'
import axios from 'axios'

const instance = axios.create({
  baseURL: '/api/v1/',
})

export const req = createReq<ApiTypesRecord>(instance)

export type ResponseOfGetApi<Endpoind extends keyof ApiTypesRecord['get']> =
  ApiTypesRecord['get'][Endpoind]['response']

// export type BodyOfPostApi<Endpoind extends keyof ApiTypesRecord['post']> =
//   ApiTypesRecord['post'][Endpoind]['body']
