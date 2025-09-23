import type { NextFunction, Request, Response } from 'express'
import type { AuthHeaders, AuthedLocals } from './common.js'
import type {
  MaybeProperty,
  Simplify,
  LastElement,
  ExtractResponse,
  RemapToExampleType,
} from '@tealina/utility-types'

export type EmptyObj = Record<string, unknown>

// ------Types for generate doc -------

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
  headers?: unknown
}

type ExtractApiType<T> = LastElement<T> extends OpenHandler<
  infer Payload,
  infer Response,
  infer _Locals
>
  ? Simplify<
      Payload & { response: Response } & MaybeProperty<Headers, 'headers'>
    >
  : never

export interface OpenHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = null,
  Tlocals extends EmptyObj = EmptyObj,
  TResBody = ExtractResponse<TResponse>,
> {
  (
    req: Request<
      TPayload['params'],
      TResBody,
      TPayload['body'],
      TPayload['query']
    > &
      MaybeProperty<TPayload['headers'], 'headers'>,
    res: Response<TResBody, Tlocals>,
    next: NextFunction,
  ): unknown
}

/** no headers and locals preseted */
export type AuthedHandler<
  TPayload extends RawPayload = EmptyObj,
  TResponse = null,
  TLocals extends EmptyObj = AuthedLocals,
> = OpenHandler<TPayload & { headers: AuthHeaders }, TResponse, TLocals>

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

export type CustomHandlerType =
  | AuthedHandler<any, any, any>
  | OpenHandler<any, any, any, any>

/** Takes an Handler's payload type and transforms it for example declarations. */
export type TakePayload<T> = T extends OpenHandler<infer P, any, any>
  ? RemapToExampleType<P>
  : never
