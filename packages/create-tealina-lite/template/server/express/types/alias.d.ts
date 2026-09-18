import {
  ExtractResponse,
  MaybeProperty,
  PickTarget,
} from '@tealina/utility-types'
import type { NextFunction, Request, Response } from 'express'

// delta vs create-tealina: exported here. Upstream omits the keyword on this one file
// (koa and fastify both export it) and `handler.d.ts` imports it regardless — which
// only compiles because TypeScript does not check exports of a `.d.ts` module.
export interface HandlerAliasCore<
  TPayload extends Record<string, any> = {},
  TResponse = unknown,
  TLocals extends Record<string, any> = {},
  T extends Record<string, any> = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
> {
  (
    req: Request<T['params'], R, T['body'], T['query']> &
      MaybeProperty<T['headers'], 'headers'>,
    res: Response<R, TLocals>,
    next: NextFunction,
  ): unknown
  // delta vs create-tealina: the same signature, a second time, so that this is
  // an overload set. A JavaScript handler annotated with a JSDoc `@type` above
  // its declaration is otherwise checked against the alias as one signature,
  // which makes that signature the function's own — and an `async` handler is
  // then rejected outright, because `unknown` is not the global `Promise`
  // (TS1065). Repeating the signature verbatim is the point: anything narrower,
  // such as `Promise<void>`, is also one signature of an overload set, and
  // would reject the sync handlers this contract accepts today.
  (
    req: Request<T['params'], R, T['body'], T['query']> &
      MaybeProperty<T['headers'], 'headers'>,
    res: Response<R, TLocals>,
    next: NextFunction,
  ): unknown
}
