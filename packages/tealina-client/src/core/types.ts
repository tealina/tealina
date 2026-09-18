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
 * A value that exists only to hold a type.
 *
 * The API record carries no runtime data, so in TypeScript it is passed as a type
 * argument: `createFetchClient<ApiTypesForClient, RequestInit>(requester)`. A
 * JavaScript call cannot spell that — JSDoc has no type arguments — and with the
 * shape type parameter left uninferred it falls back to its constraint: the response
 * becomes `unknown` and every endpoint grows a payload argument it does not have.
 * Silently — the compiler is happy and the page runs.
 *
 * Annotate an `undefined` with this and hand it to the factory, and the parameter is
 * inferred from it instead.
 *
 * The cast is load-bearing. `const apiShape = undefined` infers `undefined` rather
 * than the annotation: a `const` is narrowed to its initializer and the JSDoc type
 * goes with it. Asserting the initializer is what keeps the annotation alive.
 *
 * @example
 * ```js
 * const req = createFetchClient(
 *   requester,
 *   /** @type {ShapeWitness<ApiTypesForClient>} *\/ (undefined),
 * )
 * ```
 */
export type ShapeWitness<T> = T | undefined

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
