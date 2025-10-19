import type { NextFunction, Request, Response } from 'express'
import type { AuthHeaders, AuthedLocals } from './common.js'
import {
  ExtractResponse,
  MultiTarget,
  PickTarget,
  RemapToExampleType,
  TargetKeys,
  LastElement,
  MaybeProperty,
  Simplify,
} from '@tealina/utility-types'

export type EmptyObj = Record<string, unknown>

// ------Types for generate doc -------

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

type ExtractApiType<
  T,
  K extends TargetKeys,
> = LastElement<T> extends OpenHandler<
  infer Payload,
  infer Response,
  infer _Locals
>
  ? Simplify<PickTarget<Payload, K> & { response: PickTarget<Response, K> }>
  : never

interface HandlerAlias<
  TPayload,
  TResponse,
  Tlocals,
  T = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
> {
  (
    req: Request<T['params'], R, T['body'], T['query']> &
      MaybeProperty<T['headers'], 'headers'>,
    res: Response<R, Tlocals>,
    next: NextFunction,
  ): unknown
}

/** no headers and locals preseted */
export type OpenHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = null,
  Tlocals extends EmptyObj = EmptyObj,
> = HandlerAlias<T, Tresponse, Tlocals>

export type AuthedHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = null,
  Tlocals extends EmptyObj = AuthedLocals,
> = OpenHandler<T & { headers: AuthHeaders }, Tresponse, Tlocals>

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

export type CustomHandlerType =
  | AuthedHandler<any, any, any, any>
  | OpenHandler<any, any, any, any>

export type MakeExamplesType<T> = T extends OpenHandler<
  infer P,
  infer R,
  any,
  any
>
  ? RemapToExampleType<P & { response: R }>
  : never
