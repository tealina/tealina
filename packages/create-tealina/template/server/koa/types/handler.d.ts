import type {
  ExtractResponse,
  LastElement,
  PickTarget,
  RemapToExampleType,
  Simplify,
  TargetKeys,
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

interface HandlerAlias<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyObj,
  T = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
> {
  (
    ctx: ExtendableContext & {
      request: T
    } & { body: ExtractResponse<R> } & {
      state: TLocals
    },
    next: () => Promise<any>,
  ): void
}

export type OpenHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyObj,
> = HandlerAlias<TPayload, TResponse, TLocals>

export type AuthedHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = unknown,
  TLocals extends EmptyObj = EmptyObj,
> = HandlerAlias<
  TPayload & { headers: AuthHeaders },
  TResponse,
  TLocals & AuthedLocals
>

type ExtractApiType<
  T,
  K extends TargetKeys,
> = LastElement<T> extends HandlerAlias<infer Payload, infer Response, any>
  ? Simplify<PickTarget<Payload, K> & { response: PickTarget<Response, K> }>
  : never

export type ResolveApiTypeForDoc<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default'], 'doc'>
}

export type ResolveApiTypeForClient<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default'], 'client'>
}

export type CustomHandlerType = HandlerAlias<any, any, any>

/** Takes an Handler's payload type and transforms it for example declarations. */
export type MakeExamplesType<T> = T extends HandlerAlias<infer P, infer R, any>
  ? RemapToExampleType<P & { response: R }>
  : never
