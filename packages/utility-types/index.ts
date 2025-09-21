type RichResponse = {
  statusCode?: number
  headers?: Record<string, any>
  response?: any
  comment?: string
}

export const ResponseFlagSymbol = Symbol('responseFlag')

/**
 * Augments a response type with extra metadata (status code, headers, etc.)
 */
export type WithExtra<T extends RichResponse> = T & {
  [ResponseFlagSymbol]: true
}

/** Defines a response with a specific HTTP status code and response body */
export type WithStatusCode<StatusCode extends number, Response> = WithExtra<{
  statusCode: StatusCode
  response: Response
}>

/** Defines an empty response with only a status code and optional description */
export type WithStatusCodeOnly<
  StatusCode extends number,
  Description extends string | undefined = undefined,
> = WithExtra<{
  statusCode: StatusCode
  comment: Description
}>

export type WithHeaders<
  Headers extends Record<string, any>,
  Response,
> = WithExtra<{ headers: Headers; response: Response }>

export type ExtractResponse<T> = T extends WithExtra<infer R>
  ? R['response']
  : T

export type Extract2xxResponse<T> = T extends WithExtra<{
  statusCode: number
  response?: any
}>
  ? `${T['statusCode']}` extends `2${number}${number}`
    ? T['response']
    : never
  : T

declare const emptyObjectSymbol: unique symbol
export type EmptyObject = { [emptyObjectSymbol]?: never }

export type Simplify<T> = {
  [KeyType in keyof T]: T[KeyType]
} & {}

export type LastElement<T> = T extends ReadonlyArray<unknown>
  ? T extends readonly [...unknown[], infer U]
    ? U
    : T
  : T

export type MaybeProperty<P, T extends string> = P extends null
  ? {}
  : { [K in T]: P }

export type DocDataKeys = 'body' | 'response' | 'query' | 'params' | 'headers'

export type ExampleItem<V> = {
  /** Will be render as tab name in `doc-ui` */
  key: string
  summary: string
  value: V
}

export type Remap2ExampleType<T> = {
  [K in keyof T]?: ExampleItem<T[K]>[] | T[K]
}
