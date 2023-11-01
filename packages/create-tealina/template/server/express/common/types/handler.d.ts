import type { NextFunction, Request, Response } from 'express'
import type { Simplify } from './utility.js'
import type { AuthHeaders, AuthedLocals } from './common.js'

// ------Types for generate doc -------

interface RawPayload {
  body?: unknown
  params?: unknown
  query?: unknown
}

type LastElement<T> = T extends ReadonlyArray<any>
  ? T extends readonly [...any, infer U]
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
  T extends RawPayload = {},
  Tresponse = null,
  Theaders extends Request['headers'] = AuthHeaders,
  Tlocals extends Record<string, any> = AuthedLocals,
> {
  (
    req: Request<T['params'], Tresponse, T['body'], T['query']>,
    res: Response<Tresponse, Tlocals>,
    next: NextFunction,
  ): any
}

/** no headers and locals preseted */
export type OpenHandler<
  Tbody = null,
  Tresponse = null,
  Theaders extends Record<string, any> = {},
  Tlocals extends Record<string, any> = {},
> = AuthedHandler<
  Tbody extends null ? {} : { body: Tbody },
  Tresponse,
  Theaders,
  Tlocals
>

export type ResolveApiType<T extends Record<string, Promise<any>>> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

export type CustomHandlerType =
  | AuthedHandler<any, any, any, any>
  | OpenHandler<any, any, any, any>
