import type { NextFunction, Request, Response } from 'express'
import type { AuthHeaders, AuthedLocals } from './common.js'
import { Remap2ExampleType } from '@tealina/utility-types'

export type EmptyObj = Record<string, unknown>

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

type OmitEmpty<P, T extends string> = P extends null ? {} : { [K in T]: P }

type ExtractApiType<T> = LastElement<T> extends OpenHandler<
  infer Payload,
  infer Response,
  infer Headers,
  infer _Locals
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
export interface OpenHandler<
  T extends RawPayload = EmptyObj,
  Tresponse = null,
  Theaders = null,
  Tlocals extends EmptyObj = EmptyObj,
> {
  (
    req: Request<T['params'], Tresponse, T['body'], T['query']> &
      OmitEmpty<Theaders, 'headers'>,
    res: Response<Tresponse, Tlocals>,
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

export type MakeExamplesType<T> = T extends OpenHandler<
  infer P,
  infer R,
  any,
  any
>
  ? Remap2ExampleType<P & { response: R }>
  : never
