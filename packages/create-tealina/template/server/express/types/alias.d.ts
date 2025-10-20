import {
  PickTarget,
  ExtractResponse,
  MaybeProperty,
} from '@tealina/utility-types'
import type { Request, Response, NextFunction } from 'express'

interface HandlerAliasCore<
  TPayload = {},
  TResponse = unknown,
  TLocals = {},
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
