import axios, { AxiosError } from 'axios'
import type { ApiTypesRecord } from '../../types/api-v1.js'
import { createReq } from '../createReq.js'
import { setupTestApp } from '../setupTestApp.js'

const serverAddr = await setupTestApp()

const instance = axios.create({
  baseURL: [serverAddr, '/api/v1/'].join(''),
  headers: { Authorization: 'mock token' },
  proxy: false,
})

instance.interceptors.response.use(
  x => x,
  (error: AxiosError) => {
    console.log(error.response?.data ?? String(error))
  },
)
const req = createReq<ApiTypesRecord>(instance)

export { req }
