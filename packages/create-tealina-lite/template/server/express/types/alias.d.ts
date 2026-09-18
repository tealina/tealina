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
}
