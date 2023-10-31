import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { pipe, isEmpty } from 'fp-lite'
import type { EmptyObject, Simplify } from '../types/utility.js'

type BaseShape = {
  headers: Record<string, any>
  response: unknown
}

type MakeParams<
  T extends BaseShape,
  Payload = Omit<T, 'headers' | 'response'>,
  Config = AxiosRequestConfig & Simplify<Pick<T, 'headers'>>,
> = Payload extends EmptyObject
  ? [config?: Config]
  : [payload: Simplify<Payload>, config?: Config]

type PayloadType = {
  query?: any
  params?: any
  body?: any
}

type DynamicParmasType =
  | [config?: AxiosRequestConfig]
  | [payload: PayloadType, config?: AxiosRequestConfig]

const descendByKeyLength = (kvs: [string, any][]): [string, any][] =>
  kvs.sort((a, b) => b[0].length - a[0].length)

const replaceURL = (url: string) => (sortedKeyValues: [string, any][]) =>
  sortedKeyValues.reduce(
    (acc, [k, v]) => acc.replace(':'.concat(k), String(v)),
    url,
  )

const toActualURL = (url: string, params?: Record<string, any>) =>
  params == null
    ? url
    : pipe(Object.entries(params), descendByKeyLength, replaceURL(url))

const transformPayload = (
  url: string,
  args: DynamicParmasType,
): AxiosRequestConfig => {
  if (isEmpty(args)) return {}
  const [payload, config] = args
  const { query, params, body, ...rest } = payload as PayloadType
  return {
    url: toActualURL(url, params),
    params: query,
    data: body,
    ...rest,
    ...(config ?? {}),
  }
}

type RequestFn<T extends Record<string, any>> = <K extends keyof T>(
  url: K,
  ...rest: MakeParams<T[K]>
) => Promise<AxiosResponse<T[K]['response']>>

type ApiShape = Record<string, Record<string, any>>

type MakeReqType<T extends ApiShape> = {
  [Method in keyof T]: RequestFn<T[Method]>
}

/**
 * return a proxied object that point to `axiosInstance`.
 * @param axiosInstance
 */
const createReq = <T extends ApiShape>(axiosInstance: AxiosInstance) =>
  new Proxy({} as MakeReqType<T>, {
    get:
      (_target, method: string) =>
      (url: string, ...rest: DynamicParmasType) =>
        axiosInstance.request({
          method,
          url,
          ...transformPayload(url, rest),
        }),
  })

export { createReq }
