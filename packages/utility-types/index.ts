/**
 * For declare response with http status code
 */
export interface WithStatus<Code extends number, Response = string> {
  '~status': Code
  response: Response
}

/**
 * For declare response headers
 */
export interface WithHeaders<Headers extends {}, Response> {
  '~headers': Headers
  response: Response
}

export type ExtractResponse<T> = T extends WithStatus<number, infer R> ? R : T

export type Extract2xxResponse<T extends WithStatus<number, any> | unknown> =
  T extends WithStatus<infer Code, infer Response>
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
