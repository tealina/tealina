import type {
  EmptyObject,
  Extract2xxResponse,
  Simplify,
} from '@tealina/utility-types'

export type FullPayload = {
  body?: unknown
  query?: unknown
  params?: unknown
  headers?: any
  response?: unknown
}

type EndpointType = Record<string, FullPayload>
export type ApiRecordShape = Record<string, EndpointType>

type HttpMethod = string
export type ApiClientShape = Record<HttpMethod, any>

export type ClientRequestContext = {
  method: string
  /** The resolved URL with all parameters (path and query) encoded.*/
  url: string
  body?: unknown
  raw?: GeneralRequestOption
}

export type GeneralRequestOption = {
  method: string
  /** the raw URL */
  url: string
  body?: unknown
  query?: unknown
  params?: unknown
}

export type PayloadType = Pick<
  GeneralRequestOption,
  'body' | 'query' | 'params'
>

export type DynamicParameters<C> =
  | [config?: C]
  | [payload: PayloadType, config?: C]

type BaseShape = Pick<FullPayload, 'headers' | 'response'>

export type MakeParameters<
  T extends BaseShape,
  Config,
  Payload = Omit<T, 'headers' | 'response'>,
  MixedConfig = Config & Simplify<Pick<T, 'headers'>>,
> = Payload extends EmptyObject
  ? [config?: MixedConfig]
  : [payload: Simplify<Payload>, config?: MixedConfig]

export type RequestFn<T extends EndpointType, C> = <K extends keyof T>(
  url: K,
  ...rest: MakeParameters<T[K], C>
) => Promise<Extract2xxResponse<T[K]['response']>>
/** The response can be directly use, without response.data */

export type ToReq<T extends ApiRecordShape, C> = {
  [Method in keyof T]: RequestFn<T[Method], C>
}

/**
 * @ref {@link https://github.com/type-challenges/type-challenges/issues/9770}
 */
export type UnionToIntersection<U> = (
  U extends U
    ? (arg: U) => void
    : never
) extends (arg: infer T) => void
  ? T
  : never

export type RemoveBeginSlash<T> = T extends `/${infer P}` ? P : T
