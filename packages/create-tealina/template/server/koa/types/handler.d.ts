import type { ExtendableContext } from 'koa'
import type { AuthHeaders, AuthedLocals } from './common.js'
import type {
  MaybeProperty,
  Simplify,
  LastElement,
  ExtractResponse,
} from '@tealina/utility-types'

export type EmptyObj = Record<string, unknown>

export type HTTPMethods = 'get' | 'post' | 'patch' | 'delete'

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
}

export interface OpenHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = unknown,
  Theaders = null,
  Tlocals extends EmptyObj = EmptyObj,
> {
  (
    ctx: ExtendableContext & {
      request: Pick<T, 'body' | 'params' | 'query'> &
        MaybeProperty<Theaders, 'headers'>
    } & { body: ExtractResponse<Tresponse> } & {
      state: Tlocals
    },
    next: () => Promise<any>,
  ): void
}

export type AuthedHandler<
  T extends RawPayload = EmptyObj,
  Response = unknown,
  Headers extends AuthHeaders = AuthHeaders,
> = OpenHandler<T, Response, Headers, AuthedLocals>

export type ExtractApiType<T> = LastElement<T> extends OpenHandler<
  infer Payload,
  infer Response,
  infer Headers,
  infer _Locals
>
  ? Simplify<
      Payload & { response: Response } & MaybeProperty<Headers, 'headers'>
    >
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
