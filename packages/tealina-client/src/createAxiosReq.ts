import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { EmptyObject, GeneralRequestOption, Simplify } from './core'
import { createReq } from './createReq'

type BaseShape = {
  headers: Record<string, unknown>
  response: unknown
}

type MakeParams<
  T extends BaseShape,
  Payload = Omit<T, 'headers' | 'response'>,
  Config = AxiosRequestConfig & Simplify<Pick<T, 'headers'>>,
> = Payload extends EmptyObject
  ? [config?: Config]
  : [payload: Simplify<Payload>, config?: Config]

type WideRanageRecord = Record<string, any>

type RequestFn<T extends WideRanageRecord> = <K extends keyof T>(
  url: K,
  ...rest: MakeParams<T[K]>
) => Promise<T[K]['response']>

type RawRequestFn<T extends WideRanageRecord> = <K extends keyof T>(
  url: K,
  ...rest: MakeParams<T[K]>
) => Promise<AxiosResponse<T[K]['response']>>

type ApiShape = Record<string, WideRanageRecord>

/** The response can be directly use, without response.data */
export type MakeAxiosReqType<T extends ApiShape> = {
  [Method in keyof T]: RequestFn<T[Method]>
}

export type MakeRawAxiosReqType<T extends ApiShape> = {
  [Method in keyof T]: RawRequestFn<T[Method]>
}

const convertToAxiosRequestOption = (
  payload: GeneralRequestOption,
  config?: AxiosRequestConfig,
): AxiosRequestConfig => {
  const { body, params: _ignore, query, ...rest } = payload
  return {
    ...(config ?? {}),
    ...rest,
    params: query,
    data: body,
  }
}

export const createAxiosReq = <T extends ApiShape>(instants: AxiosInstance) =>
  createReq<MakeAxiosReqType<T>, AxiosRequestConfig>(
    async (rawPayload, config) => {
      const payload = convertToAxiosRequestOption(rawPayload)
      return instants
        .request(Object.assign(config ?? {}, payload))
        .then(v => v.data)
    },
  )

export const createRawAxiosReq = <T extends ApiShape>(
  instants: AxiosInstance,
) =>
  createReq<MakeAxiosReqType<T>, AxiosRequestConfig>(
    async (rawPayload, config) => {
      const payload = convertToAxiosRequestOption(rawPayload)
      return instants.request(Object.assign(config ?? {}, payload))
    },
  )
