import { test } from 'vitest'
import { createReq } from '../src/createReq'
import {
  type MakeAxiosReqType,
  type MakeRawAxiosReqType,
  convertToAxiosRequestOption,
} from '../src/createAxiosReq'
import type { MockApi } from './MockApi'
import axios, { type AxiosRequestConfig } from 'axios'

test('axios request', async () => {
  const instants = axios.create()
  const req = createReq<MakeAxiosReqType<MockApi>, AxiosRequestConfig>(
    async (rawPayload, config) => {
      const payload = convertToAxiosRequestOption(rawPayload)
      return instants.request({ ...config, ...payload }).then(v => v.data)
    },
  )
  req.get('health').then(v => v.status)
  const rawReq = createReq<MakeRawAxiosReqType<MockApi>, AxiosRequestConfig>(
    async (rawPayload, config) => {
      const payload = convertToAxiosRequestOption(rawPayload)
      return instants.request({ ...config, ...payload })
    },
  )
})
