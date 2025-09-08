import type { NextFunction, Request, Response } from 'express'
import type { AuthHeaders, AuthedLocals } from './common.js'
import type {
  MaybeProperty,
  Simplify,
  LastElement,
  ExtractResponse,
} from '@tealina/utility-types'

export type EmptyObj = Record<string, unknown>

// ------Types for generate doc -------

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
}

type ExtractApiType<T> = LastElement<T> extends OpenHandler<
  infer Payload,
  infer Response,
  infer Headers,
  infer _Locals
>
  ? Simplify<
      Payload & { response: Response } & MaybeProperty<Headers, 'headers'>
    >
  : never

/**
 * ### Attention
 *  values in `params` and `query` object are always string type by default,\
 *  if you have non string type, handle it by youself:
 * @example
 * ```ts
 * type Id = { id: number | string }
 * type ApiType = ApiHandler<{ params: Id  }>
 *
 * const handler:ApiType = (req,res,next)=>{
 *   consolog.log(typeof req.params.id) //'string'
 *   const numId = Number(req.params.id)
 * }
 * ```
 */
export interface OpenHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = null,
  Theaders = null,
  Tlocals extends EmptyObj = EmptyObj,
  TResBody = ExtractResponse<Tresponse>,
> {
  (
    req: Request<T['params'], TResBody, T['body'], T['query']> &
      MaybeProperty<Theaders, 'headers'>,
    res: Response<TResBody, Tlocals>,
    next: NextFunction,
  ): unknown
}

/** no headers and locals preseted */
export type AuthedHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = null,
  Theaders = AuthHeaders,
  Tlocals extends EmptyObj = AuthedLocals,
> = OpenHandler<T, Tresponse, Theaders, Tlocals>

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

export type CustomHandlerType =
  | AuthedHandler<any, any, any, any>
  | OpenHandler<any, any, any, any>
