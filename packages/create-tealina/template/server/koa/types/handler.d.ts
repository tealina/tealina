import type { ExtendableContext } from 'koa'
import type { AuthHeaders, AuthedLocals } from './common.js'

export type EmptyObj = Record<string, unknown>

export type HTTPMethods = 'get' | 'post' | 'patch' | 'delete'

/** [doc](https://github.com/sindresorhus/type-fest/blob/main/source/simplify.d.ts) */
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
}

interface ExtendedRouteHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = unknown,
  Theaders extends EmptyObj = EmptyObj,
  Tlocals extends EmptyObj = EmptyObj,
> {
  (
    ctx: ExtendableContext & {
      request: Pick<T, 'body' | 'params' | 'query'> & { headers: Theaders }
    } & { body: Tresponse; response: { body: Tresponse } } & { state: Tlocals },
    next: () => Promise<any>,
  ): void
}

// Shorter definition displayed on hover.
interface ShortName<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers extends EmptyObj = EmptyObj,
  Locals extends EmptyObj = EmptyObj,
> extends ExtendedRouteHandler<T, Response, Headers, Locals> {}

export type AuthedHandler<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers extends AuthHeaders = AuthHeaders,
> = ShortName<T, Response, Headers, AuthedLocals>

export type OpenHandler<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers extends EmptyObj = EmptyObj,
> = ShortName<T, Response, Headers>

type LastElement<T> = T extends ReadonlyArray<unknown>
  ? T extends readonly [...unknown[], infer U]
    ? U
    : T
  : T

export type ExtractApiType<T> = LastElement<T> extends ShortName<
  infer Payload,
  infer Response,
  infer Headers,
  infer _X
>
  ? Simplify<Payload & { response: Response; headers: Headers }>
  : never

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

// Use `any` to maximize type matching
export type CustomHandlerType =
  | AuthedHandler<any, any, any>
  | OpenHandler<any, any, any>
