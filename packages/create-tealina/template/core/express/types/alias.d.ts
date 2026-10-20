// Taken from `tealina/utility-types` rather than from `@tealina/utility-types` directly,
// so the scaffold installs one package to compile its contract instead of two.
import {
  ExtractResponse,
  MaybeProperty,
  PickTarget,
} from 'tealina/utility-types'
import type { NextFunction, Request, Response } from 'express'

// Exported because `handler.d.ts` imports `HandlerAliasCore` from here to build
// `HandlerAlias` on. All three frameworks export it; leaving the keyword off one of them
// compiles anyway, because TypeScript does not check the exports of a `.d.ts` module.
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
  // The same signature, a second time, so that this is an overload set. A `.js` handler
  // kept while a project migrates to TypeScript can annotate a `const` with a JSDoc
  // `@type`; the compiler then treats that annotation as the function's declared type,
  // and with a single signature an `async` handler is rejected because a declared type
  // returning `unknown` must return a value (TS2355). An overload set is accepted.
  // Repeating the signature verbatim is the point: anything narrower, such as
  // `Promise<void>`, is still a single signature, and would reject the sync handlers this
  // contract accepts.
  (
    req: Request<T['params'], R, T['body'], T['query']> &
      MaybeProperty<T['headers'], 'headers'>,
    res: Response<R, TLocals>,
    next: NextFunction,
  ): unknown
}
