import type {
  ExtractResponse,
  LastElement,
  RemapToExampleType,
  Simplify,
} from '@tealina/utility-types'
import type { ExtendableContext } from 'koa'
import type { AuthHeaders, AuthedLocals } from './common.js'

export type EmptyObj = Record<string, unknown>

export type HTTPMethods = 'get' | 'post' | 'patch' | 'delete'

export interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

export interface OpenHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyObj,
> {
  (
    ctx: ExtendableContext & {
      request: TPayload
    } & { body: ExtractResponse<TResponse> } & {
      state: TLocals
    },
    next: () => Promise<any>,
  ): void
}

export type AuthedHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
> = OpenHandler<TPayload & { headers: AuthHeaders }, TResponse, AuthedLocals>

export type ExtractApiType<T> = LastElement<T> extends OpenHandler<
  infer Payload,
  infer Response,
  infer _Locals
>
  ? Simplify<Payload & { response: Response }>
  : never

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

export type CustomHandlerType =
  | AuthedHandler<any, any> // Use `any` to maximize type matching
  | OpenHandler<any, any, any>

/** Takes an Handler's payload type and transforms it for example declarations. */
export type TakePayload<T> = T extends OpenHandler<infer P, any, any>
  ? RemapToExampleType<P>
  : never
