import {
  ExtractResponse,
  LastElement,
  MaybeProperty,
  PickTarget,
  RemapToExampleType,
  Simplify,
  TargetKeys,
} from '@tealina/utility-types'
import type { NextFunction, Request, Response } from 'express'
import type { AuthHeaders, AuthedLocals } from './common.js'

export type EmptyObj = Record<string, unknown>

// ------Types for generate doc -------

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

/** no headers and locals preseted */
export type OpenHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = null,
  TLocals extends EmptyObj = EmptyObj,
> = HandlerAlias<TPayload, TResponse, TLocals>

export type AuthedHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = null,
  TLocals extends EmptyObj = EmptyObj,
> = HandlerAlias<
  TPayload & { headers: AuthHeaders },
  TResponse,
  TLocals & AuthedLocals
>

interface HandlerAlias<
  TPayload,
  TResponse,
  TLocals,
  T = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
> {
  (
    req: Request<T['params'], R, T['body'], T['query']> &
      MaybeProperty<T['headers'], 'headers'>,
    res: Response<R, TLocals>,
    next: NextFunction,
  ): unknown
}

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

export type MakeExamplesType<T> = T extends HandlerAlias<infer P, infer R, any>
  ? RemapToExampleType<P & { response: R }>
  : never
