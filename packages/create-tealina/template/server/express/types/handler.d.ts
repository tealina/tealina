import type { NextFunction, Request, Response } from 'express'
import type { AuthHeaders, AuthedLocals } from './common.js'

export type EmptyObj = {}

/** [doc](https://github.com/sindresorhus/type-fest/blob/main/source/simplify.d.ts) */
type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

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

type OmitEmpty<P, T extends string> = P extends EmptyObj ? {} : { [K in T]: P }

type ExtractApiType<T> = LastElement<T> extends AuthedHandler<
  infer Payload,
  infer Response,
  infer Headers
>
  ? Simplify<Payload & { response: Response } & OmitEmpty<Headers, 'headers'>>
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
  _Theaders = AuthHeaders,
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
  T extends RawPayload = EmptyObj,
  Tresponse = null,
  Theaders = EmptyObj,
  Tlocals extends EmptyObj = EmptyObj,
> = AuthedHandler<T, Tresponse, Theaders, Tlocals>

export type ResolveApiType<
  T extends Record<string, Promise<{ default: unknown }>>,
> = {
  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default']>
}

export type CustomHandlerType =
  | AuthedHandler<any, any, any, any>
  | OpenHandler<any, any, any, any>
