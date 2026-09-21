// Taken from `tealina/utility-types` rather than from `@tealina/utility-types` directly,
// so the scaffold installs one package to compile its contract instead of two.
import type { PickTarget, ExtractResponse } from 'tealina/utility-types'
import type { ExtendableContext } from 'koa'

export interface HandlerAliasCore<
  TPayload = {},
  TResponse = unknown,
  TLocals extends {} = {},
  T = PickTarget<TPayload, 'server'>,
  R = ExtractResponse<PickTarget<TResponse, 'server'>>,
> {
  (
    ctx: ExtendableContext & {
      request: T
    } & { body: ExtractResponse<R> } & {
      state: TLocals
    },
    next: () => Promise<any>,
  ): void
  // The same signature, a second time, so that this is an overload set. A
  // JavaScript handler annotated with a JSDoc `@type` above its declaration is
  // otherwise checked against the alias as one signature, which makes that
  // signature the function's own — and an `async` handler is then rejected
  // outright, because `void` is not the global `Promise` (TS1065). Repeating
  // the signature verbatim is the point: anything narrower, such as
  // `Promise<void>`, is also one signature of an overload set, and would reject
  // the sync handlers this contract accepts today.
  (
    ctx: ExtendableContext & {
      request: T
    } & { body: ExtractResponse<R> } & {
      state: TLocals
    },
    next: () => Promise<any>,
  ): void
}
