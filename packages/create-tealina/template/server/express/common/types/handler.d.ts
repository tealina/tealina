import type { NextFunction, Request, Response } from 'express'
import type { Simplify } from './utility.js'
import type { AuthHeaders, AuthedLocals } from './common.js'

export type EmptyObj = Record<string, unknown>

// ------Types for generate doc -------

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
}

type LastElement<T> = T extends ReadonlyArray<unknown>
  ? T extends readonly [...unknown[], infer U]
    ? U
    : T
  : T

type ExtractApiType<T> = LastElement<T> extends AuthedHandler<
  infer Payload,
  infer Response,
  infer Headers
>
  ? Simplify<Payload & { response: Response; headers: Headers }>
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
export interface AuthedHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = null,
  Theaders extends Request['headers'] = AuthHeaders,
  Tlocals extends EmptyObj = AuthedLocals,
> {
  (
    req: Request<T['params'], Tresponse, T['body'], T['query']>,
    res: Response<Tresponse, Tlocals>,
    next: NextFunction,
  ): unknown
}

/** no headers and locals preseted */
export type OpenHandler<
  Tbody = null,
  Tresponse = null,
  Theaders extends EmptyObj = EmptyObj,
  Tlocals extends EmptyObj = EmptyObj,
> = AuthedHandler<
  Tbody extends null ? EmptyObj : { body: Tbody },
  Tresponse,
  Theaders,
  Tlocals
>

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

export type CustomHandlerType =
  | AuthedHandler<any, any, any, any>
  | OpenHandler<any, any, any, any>
