import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

declare const emptyObjectSymbol: unique symbol
type EmptyObject = { [emptyObjectSymbol]?: never }
type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

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

const replaceURL = (url: string, sortedKeyValues: [string, any][]) =>
  sortedKeyValues.reduce(
    (acc, [k, v]) => acc.replace(':'.concat(k), String(v)),
    url,
  )

const transformPayload = (
  url: string,
  args: DynamicParmasType,
): AxiosRequestConfig => {
  if (args.length < 1) return {}
  const [payload, config] = args
  const { query, params, body, ...rest } = payload as PayloadType
  const actualUrl =
    params == null
      ? url
      : replaceURL(url, descendByKeyLength(Object.entries(params)))
  return {
    url: actualUrl,
    params: query,
    data: body,
    ...rest,
    ...(config ?? {}),
  }
}

type RequestFn<T extends Record<string, any>> = <K extends keyof T>(
  url: K,
  ...rest: MakeParams<T[K]>
) => Promise<AxiosResponse<T[K]['response']>['data']>

type RawRequestFn<T extends Record<string, any>> = <K extends keyof T>(
  url: K,
  ...rest: MakeParams<T[K]>
) => Promise<AxiosResponse<T[K]['response']>>

type ApiShape = Record<string, Record<string, any>>

export type MakeReqType<T extends ApiShape> = {
  [Method in keyof T]: RequestFn<T[Method]>
}

export type MakeRawReqType<T extends ApiShape> = {
  [Method in keyof T]: RawRequestFn<T[Method]>
}

/**
 * return a proxied object that point to `axiosInstance`.
 * @param axiosInstance
 */
const createReq = <T extends ApiShape>(axiosInstance: AxiosInstance) =>
  new Proxy({} as T, {
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
