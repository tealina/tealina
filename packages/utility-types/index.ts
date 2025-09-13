type RichResponse = {
  statusCode?: number
  headers?: Record<string, any>
  response: any
}

export const ResponseFlagSymbol = Symbol('responseFlag')

/**
 * Declare response type with optional status code and response headers
 */
export type WithExtra<T extends RichResponse> = T & {
  [ResponseFlagSymbol]: true
}

export type WithStatusCode<
  StatusCode extends number,
  Response = string,
> = WithExtra<{
  statusCode: StatusCode
  response: Response
}>

export type WithHeaders<
  Headers extends Record<string, any>,
  Response,
> = WithExtra<{ headers: Headers; response: Response }>

export type ExtractResponse<T> = T extends WithStatusCode<number, infer R>
  ? R
  : T

export type Extract2xxResponse<
  T extends WithStatusCode<number, any> | unknown,
> = T extends WithStatusCode<infer Code, infer Response>
  ? `${Code}` extends `2${number}${number}`
    ? Response
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
