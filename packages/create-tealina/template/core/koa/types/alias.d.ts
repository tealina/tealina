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
}
